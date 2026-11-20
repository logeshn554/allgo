import { Injectable, Optional, Inject, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import type { MapsGateway } from '../common/maps/maps-gateway.interface.js';
import {
  CoordinatesDto,
  VehicleCategory,
  PackageCategory,
} from './dto/mobility.dto.js';

export interface RideFareEstimate {
  vehicleCategory: VehicleCategory;
  estimatedDistanceKm: number;
  estimatedDurationMinutes: number;
  baseFareInr: number;
  distanceFareInr: number;
  timeFareInr: number;
  platformFeeInr: number;
  gstInr: number;
  totalFareInr: number;
}

@Injectable()
export class MobilityFareService {
  constructor(
    private readonly db: DatabaseService,
    @Optional() @Inject('MapsGateway') private readonly mapsGateway?: MapsGateway
  ) {}

  calculateDistanceKm(p1: CoordinatesDto, p2: CoordinatesDto): number {
    const R = 6371;
    const dLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
    const dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((p1.latitude * Math.PI) / 180) *
        Math.cos((p2.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const straightKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.max(Math.round(straightKm * 1.25 * 10) / 10, 0.5);
  }

  async calculateRoadDistanceAndEta(
    pickup: CoordinatesDto,
    dropoff: CoordinatesDto,
    category: VehicleCategory
  ): Promise<{ distanceKm: number; durationMinutes: number }> {
    if (this.mapsGateway) {
      try {
        const mode = category === 'BIKE' ? 'TWO_WHEELER' : 'DRIVE';
        const route = await this.mapsGateway.computeRoute(
          { latitude: pickup.latitude, longitude: pickup.longitude },
          { latitude: dropoff.latitude, longitude: dropoff.longitude },
          mode
        );
        if (route && route.distanceMeters > 0) {
          const distanceKm = Math.max(Math.round((route.distanceMeters / 1000) * 10) / 10, 0.5);
          const durationMinutes = Math.max(Math.round(route.durationSeconds / 60), 5);
          return { distanceKm, durationMinutes };
        }
      } catch (_err) {}
    }
    const distanceKm = this.calculateDistanceKm(pickup, dropoff);
    const durationMinutes = this.estimateDurationMinutes(distanceKm, category);
    return { distanceKm, durationMinutes };
  }

  estimateDurationMinutes(distanceKm: number, category: VehicleCategory): number {
    let avgSpeedKmh = 22;
    if (category === 'BIKE') avgSpeedKmh = 26;
    else if (category === 'AUTO') avgSpeedKmh = 20;
    else if (category === 'CAB_ECONOMY') avgSpeedKmh = 18;
    else if (category === 'CAB_PREMIUM') avgSpeedKmh = 20;
    return Math.max(Math.round((distanceKm / avgSpeedKmh) * 60), 5);
  }

  async detectStateCode(coords?: CoordinatesDto): Promise<string> {
    if (coords && this.mapsGateway) {
      try {
        const geo = await this.mapsGateway.reverseGeocode({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        if (geo?.formattedAddress) {
          const addr = geo.formattedAddress.toUpperCase();
          if (addr.includes('TAMIL NADU') || addr.includes('CHENNAI')) return 'TN';
          if (addr.includes('KARNATAKA') || addr.includes('BENGALURU')) return 'KA';
          if (addr.includes('TELANGANA') || addr.includes('HYDERABAD')) return 'TS';
          if (addr.includes('KERALA')) return 'KL';
          if (addr.includes('MAHARASHTRA') || addr.includes('MUMBAI')) return 'MH';
          if (addr.includes('DELHI')) return 'DL';
        }
      } catch (_err) {}
    }
    return 'TN';
  }

  async checkStateClearance(stateCode = 'TN', vertical: 'RIDE' | 'HIRE_DRIVER' | 'BIKE_TAXI'): Promise<boolean> {
    const res = await this.db.query(
      `SELECT * FROM mobility_feature_flags WHERE state_code = $1;`,
      [stateCode.toUpperCase()]
    );
    if (res.rows.length === 0) {
      throw new ForbiddenException(`Mobility operations not authorized in state: ${stateCode}.`);
    }
    const flag = res.rows[0];
    if (vertical === 'RIDE' && !flag.rides_enabled) {
      throw new ForbiddenException(`Passenger rides disabled in ${flag.state_name}.`);
    }
    if (vertical === 'HIRE_DRIVER' && !flag.hire_driver_enabled) {
      throw new ForbiddenException(`Driver hire disabled in ${flag.state_name}.`);
    }
    if (vertical === 'BIKE_TAXI' && !flag.bike_taxi_enabled) {
      throw new ForbiddenException(`Bike taxi restricted in ${flag.state_name}.`);
    }
    return true;
  }

  async estimateRideFares(
    pickup: CoordinatesDto,
    dropoff: CoordinatesDto,
    surgeMultiplier = 1.0,
    stateCode?: string
  ): Promise<RideFareEstimate[]> {
    const resolvedState = stateCode || (await this.detectStateCode(pickup));
    await this.checkStateClearance(resolvedState, 'RIDE');

    const configsRes = await this.db.query('SELECT * FROM ride_fares_config;');
    const estimates: RideFareEstimate[] = [];

    for (const conf of configsRes.rows) {
      const cat = conf.vehicle_category as VehicleCategory;
      const { distanceKm, durationMinutes } = await this.calculateRoadDistanceAndEta(pickup, dropoff, cat);

      const baseFare = Number(conf.base_fare_inr);
      const baseDistance = Number(conf.base_distance_km);
      const perKmRate = Number(conf.per_km_rate_inr);
      const perMinRate = Number(conf.per_minute_rate_inr);
      const minFare = Number(conf.minimum_fare_inr);
      const platformFee = Number(conf.platform_fee_inr);

      const chargeableDist = Math.max(distanceKm - baseDistance, 0);
      const distFare = chargeableDist * perKmRate;
      const tmFare = durationMinutes * perMinRate;

      let subtotal = Math.max((baseFare + distFare + tmFare) * surgeMultiplier, minFare);
      const gst = Math.round(subtotal * 0.05 * 100) / 100;
      const total = Math.round((subtotal + platformFee + gst) * 100) / 100;

      estimates.push({
        vehicleCategory: cat,
        estimatedDistanceKm: distanceKm,
        estimatedDurationMinutes: durationMinutes,
        baseFareInr: baseFare,
        distanceFareInr: Math.round(distFare * 100) / 100,
        timeFareInr: Math.round(tmFare * 100) / 100,
        platformFeeInr: platformFee,
        gstInr: gst,
        totalFareInr: total,
      });
    }
    return estimates;
  }

  async calculateRideBookingFare(
    category: VehicleCategory,
    distanceKm: number,
    durationMinutes: number,
    surgeMultiplier = 1.0
  ): Promise<{ baseFare: number; distanceFare: number; timeFare: number; platformFee: number; gst: number; totalFare: number }> {
    const res = await this.db.query(`SELECT * FROM ride_fares_config WHERE vehicle_category = $1;`, [category]);
    if (res.rows.length === 0) {
      throw new BadRequestException(`No fare configuration for vehicle category: ${category}`);
    }
    const conf = res.rows[0];
    const baseFare = Number(conf.base_fare_inr);
    const distFare = Math.max(distanceKm - Number(conf.base_distance_km), 0) * Number(conf.per_km_rate_inr);
    const timeFare = durationMinutes * Number(conf.per_minute_rate_inr);
    let subtotal = Math.max((baseFare + distFare + timeFare) * surgeMultiplier, Number(conf.minimum_fare_inr));
    const gst = Math.round(subtotal * 0.05 * 100) / 100;
    const totalFare = Math.round((subtotal + Number(conf.platform_fee_inr) + gst) * 100) / 100;

    return {
      baseFare,
      distanceFare: Math.round(distFare * 100) / 100,
      timeFare: Math.round(timeFare * 100) / 100,
      platformFee: Number(conf.platform_fee_inr),
      gst,
      totalFare,
    };
  }

  async calculateParcelFare(distanceKm: number, category: PackageCategory = 'GENERAL', weightKg = 1.0): Promise<number> {
    const res = await this.db.query(`SELECT * FROM parcel_fares_config WHERE package_category = $1;`, [category]);
    const conf = res.rows[0] || { base_fare_inr: 40.0, base_distance_km: 2.0, per_km_rate_inr: 12.0, per_kg_rate_inr: 5.0 };
    const distCharge = Math.max(distanceKm - Number(conf.base_distance_km), 0) * Number(conf.per_km_rate_inr);
    const weightCharge = Math.max(weightKg - 1.0, 0) * Number(conf.per_kg_rate_inr);
    return Math.round((Number(conf.base_fare_inr) + distCharge + weightCharge) * 100) / 100;
  }

  calculateHireDriverFare(durationHours: 4 | 8 | 12, scheduledStartTime: Date) {
    let packageFare = 500.0;
    if (durationHours === 8) packageFare = 900.0;
    else if (durationHours === 12) packageFare = 1300.0;
    const hour = scheduledStartTime.getHours();
    const nightAllowance = (hour >= 22 || hour < 6) ? 200.0 : 0.0;
    return { packageFare, nightAllowance, totalFare: packageFare + nightAllowance };
  }
}
