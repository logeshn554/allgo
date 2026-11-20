import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
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
  constructor(private readonly db: DatabaseService) {}

  calculateDistanceKm(p1: CoordinatesDto, p2: CoordinatesDto): number {
    const R = 6371; // Earth radius in km
    const dLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
    const dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.latitude * Math.PI) / 180) *
        Math.cos((p2.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightKm = R * c;
    const roadKm = Math.round(straightKm * 1.25 * 10) / 10;
    return Math.max(roadKm, 0.5);
  }

  estimateDurationMinutes(distanceKm: number, category: VehicleCategory): number {
    let avgSpeedKmh = 22; // default
    if (category === 'BIKE') avgSpeedKmh = 26;
    else if (category === 'AUTO') avgSpeedKmh = 20;
    else if (category === 'CAB_ECONOMY') avgSpeedKmh = 18;
    else if (category === 'CAB_PREMIUM') avgSpeedKmh = 20;

    const rawMinutes = (distanceKm / avgSpeedKmh) * 60;
    return Math.max(Math.round(rawMinutes), 5);
  }

  async checkStateClearance(
    stateCode: string = 'TN',
    vertical: 'RIDE' | 'HIRE_DRIVER' | 'BIKE_TAXI'
  ): Promise<boolean> {
    const res = await this.db.query(
      `SELECT * FROM mobility_feature_flags WHERE state_code = $1;`,
      [stateCode.toUpperCase()]
    );

    if (res.rows.length === 0) {
      throw new ForbiddenException(
        `Mobility operations not authorized in state: ${stateCode}. Awaiting transport regulatory clearance.`
      );
    }

    const flag = res.rows[0];
    if (vertical === 'RIDE' && !flag.rides_enabled) {
      throw new ForbiddenException(
        `Passenger ride mobility is currently disabled in ${flag.state_name} pending regulatory approvals.`
      );
    }
    if (vertical === 'HIRE_DRIVER' && !flag.hire_driver_enabled) {
      throw new ForbiddenException(
        `Designated driver hire services are currently disabled in ${flag.state_name}.`
      );
    }
    if (vertical === 'BIKE_TAXI' && !flag.bike_taxi_enabled) {
      throw new ForbiddenException(
        `Bike taxi passenger transport is currently restricted in ${flag.state_name}.`
      );
    }

    return true;
  }

  async estimateRideFares(
    pickup: CoordinatesDto,
    dropoff: CoordinatesDto,
    surgeMultiplier: number = 1.0,
    stateCode: string = 'TN'
  ): Promise<RideFareEstimate[]> {
    await this.checkStateClearance(stateCode, 'RIDE');

    const distanceKm = this.calculateDistanceKm(pickup, dropoff);
    const configsRes = await this.db.query('SELECT * FROM ride_fares_config;');
    const configs = configsRes.rows;

    const estimates: RideFareEstimate[] = [];

    for (const conf of configs) {
      const cat = conf.vehicle_category as VehicleCategory;
      const durationMinutes = this.estimateDurationMinutes(distanceKm, cat);

      const baseFare = Number(conf.base_fare_inr);
      const baseDistance = Number(conf.base_distance_km);
      const perKmRate = Number(conf.per_km_rate_inr);
      const perMinRate = Number(conf.per_minute_rate_inr);
      const minFare = Number(conf.minimum_fare_inr);
      const platformFee = Number(conf.platform_fee_inr);

      const chargeableDistanceKm = Math.max(distanceKm - baseDistance, 0);
      const distanceFare = chargeableDistanceKm * perKmRate;
      const timeFare = durationMinutes * perMinRate;

      let subtotal = (baseFare + distanceFare + timeFare) * surgeMultiplier;
      subtotal = Math.max(subtotal, minFare);

      const gst = Math.round(subtotal * 0.05 * 100) / 100; // 5% GST on passenger transport
      const total = Math.round((subtotal + platformFee + gst) * 100) / 100;

      estimates.push({
        vehicleCategory: cat,
        estimatedDistanceKm: distanceKm,
        estimatedDurationMinutes: durationMinutes,
        baseFareInr: baseFare,
        distanceFareInr: Math.round(distanceFare * 100) / 100,
        timeFareInr: Math.round(timeFare * 100) / 100,
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
    surgeMultiplier: number = 1.0
  ): Promise<{
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    platformFee: number;
    gst: number;
    totalFare: number;
  }> {
    const res = await this.db.query(
      `SELECT * FROM ride_fares_config WHERE vehicle_category = $1;`,
      [category]
    );

    if (res.rows.length === 0) {
      throw new BadRequestException(`No fare configuration for vehicle category: ${category}`);
    }

    const conf = res.rows[0];
    const baseFare = Number(conf.base_fare_inr);
    const baseDistance = Number(conf.base_distance_km);
    const perKmRate = Number(conf.per_km_rate_inr);
    const perMinRate = Number(conf.per_minute_rate_inr);
    const minFare = Number(conf.minimum_fare_inr);
    const platformFee = Number(conf.platform_fee_inr);

    const chargeableDistanceKm = Math.max(distanceKm - baseDistance, 0);
    const distanceFare = chargeableDistanceKm * perKmRate;
    const timeFare = durationMinutes * perMinRate;

    let subtotal = (baseFare + distanceFare + timeFare) * surgeMultiplier;
    subtotal = Math.max(subtotal, minFare);

    const gst = Math.round(subtotal * 0.05 * 100) / 100;
    const totalFare = Math.round((subtotal + platformFee + gst) * 100) / 100;

    return {
      baseFare,
      distanceFare: Math.round(distanceFare * 100) / 100,
      timeFare: Math.round(timeFare * 100) / 100,
      platformFee,
      gst,
      totalFare,
    };
  }

  async calculateParcelFare(
    distanceKm: number,
    category: PackageCategory = 'GENERAL',
    weightKg: number = 1.0
  ): Promise<number> {
    const res = await this.db.query(
      `SELECT * FROM parcel_fares_config WHERE package_category = $1;`,
      [category]
    );

    const conf = res.rows[0] || {
      base_fare_inr: 40.0,
      base_distance_km: 2.0,
      per_km_rate_inr: 12.0,
      per_kg_rate_inr: 5.0,
    };

    const baseFare = Number(conf.base_fare_inr);
    const baseDistance = Number(conf.base_distance_km);
    const perKmRate = Number(conf.per_km_rate_inr);
    const perKgRate = Number(conf.per_kg_rate_inr);

    const chargeableKm = Math.max(distanceKm - baseDistance, 0);
    const distanceCharge = chargeableKm * perKmRate;
    const weightCharge = Math.max(weightKg - 1.0, 0) * perKgRate;

    const total = baseFare + distanceCharge + weightCharge;
    return Math.round(total * 100) / 100;
  }

  calculateHireDriverFare(
    durationHours: 4 | 8 | 12,
    scheduledStartTime: Date
  ): {
    packageFare: number;
    nightAllowance: number;
    totalFare: number;
  } {
    let packageFare = 500.0;
    if (durationHours === 8) packageFare = 900.0;
    else if (durationHours === 12) packageFare = 1300.0;

    const startHour = scheduledStartTime.getHours();
    const isNight = startHour >= 22 || startHour < 6;
    const nightAllowance = isNight ? 200.0 : 0.0;

    return {
      packageFare,
      nightAllowance,
      totalFare: packageFare + nightAllowance,
    };
  }
}
