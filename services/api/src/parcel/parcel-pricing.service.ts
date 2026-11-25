import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { ZonesService } from '../zones/zones.service.js';
import { CoordinatesDto, QuoteParcelDto, UpdateServiceConfigDto } from './dto/parcel.dto.js';
import { ParcelRestrictionService } from './parcel-restriction.service.js';

export interface ParcelPriceSnapshot {
  serviceType: string;
  serviceDisplayName: string;
  distanceKm: number;
  actualWeightKg: number;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  baseFareInr: number;
  distanceFareInr: number;
  weightFareInr: number;
  serviceMultiplier: number;
  zoneSurgeMultiplier: number;
  subtotalInr: number;
  platformFeeInr: number;
  gstInr: number;
  totalAmountInr: number;
  partnerPayoutInr: number;
  zoneId?: string;
  zoneName?: string;
  validUntil: string;
}

@Injectable()
export class ParcelPricingService {
  private readonly logger = new Logger(ParcelPricingService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly zonesService: ZonesService,
    private readonly restrictionService: ParcelRestrictionService,
  ) {}

  /**
   * Road distance estimate using haversine with urban road winding coefficient (1.25x)
   */
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

  /**
   * Calculate server-authoritative parcel quote
   */
  async calculateQuote(dto: QuoteParcelDto, customerId?: string): Promise<ParcelPriceSnapshot> {
    // 1. Validate restrictions
    let packageCategory = (dto.packageCategory || 'GENERAL').toUpperCase();
    if (packageCategory === 'CLOTHES') {
      packageCategory = 'CLOTHES_ITEMS';
    }
    await this.restrictionService.validatePackage(
      packageCategory,
      dto.weightKg,
      { lengthCm: dto.lengthCm, widthCm: dto.widthCm, heightCm: dto.heightCm },
      dto.declaredValueInr || 0,
      customerId,
    );

    // 2. Check serviceability via Phase 6 Zones
    let zoneSurgeMultiplier = 1.0;
    let zoneId: string | undefined;
    let zoneName: string | undefined;

    try {
      const zoneCheck = await this.zonesService.checkServiceability(
        dto.pickupLocation.latitude,
        dto.pickupLocation.longitude,
        'PARCEL',
      );
      if (zoneCheck?.isServiceable && zoneCheck.zone) {
        zoneId = zoneCheck.zone.zone_id;
        zoneName = zoneCheck.zone.zone_name;
        if (zoneCheck.serviceSettings?.is_surge_active) {
          zoneSurgeMultiplier = Number(zoneCheck.serviceSettings.surge_multiplier) || 1.0;
        }
      }
    } catch (err: any) {
      this.logger.warn(`Zone serviceability check warning: ${err.message}`);
    }

    // 3. Compute distance
    const distanceKm = this.calculateDistanceKm(dto.pickupLocation, dto.dropoffLocation);

    // 4. Fetch service config
    const serviceType = (dto.serviceType || 'STANDARD').toUpperCase();
    const serviceRes = await this.db.query(
      `SELECT * FROM parcel_service_configs WHERE service_type = $1 AND is_enabled = TRUE;`,
      [serviceType],
    );

    if (serviceRes.rows.length === 0) {
      throw new BadRequestException(
        `Delivery service type '${serviceType}' is unavailable or disabled`,
      );
    }

    const serviceConfig = serviceRes.rows[0];
    const serviceMultiplier = Number(serviceConfig.base_multiplier) || 1.0;
    const maxDist = Number(serviceConfig.max_distance_km) || 50.0;

    if (distanceKm > maxDist) {
      throw new BadRequestException(
        `Distance ${distanceKm}km exceeds maximum allowable delivery distance of ${maxDist}km for ${serviceConfig.display_name}`,
      );
    }

    // 5. Vehicle class and category fare rules
    const vehicleType = (dto.vehicleType || 'TWO_WHEELER').toUpperCase();
    const maxWeights: Record<string, number> = {
      TWO_WHEELER: 20,
      THREE_WHEELER: 500,
      TATA_ACE: 1000,
      PICKUP_TRUCK: 1500,
    };
    const maxCapacity = maxWeights[vehicleType] || 20;
    if (dto.weightKg > maxCapacity) {
      throw new BadRequestException(
        `Weight of ${dto.weightKg} kg exceeds maximum capacity of ${maxCapacity} kg for ${vehicleType}`,
      );
    }

    const rates: Record<
      string,
      { baseFare: number; baseDistance: number; perKm: number; thresholdKg: number; perKg: number }
    > = {
      TWO_WHEELER: { baseFare: 40.0, baseDistance: 2.0, perKm: 12.0, thresholdKg: 1.0, perKg: 5.0 },
      THREE_WHEELER: {
        baseFare: 150.0,
        baseDistance: 3.0,
        perKm: 20.0,
        thresholdKg: 20.0,
        perKg: 1.0,
      },
      TATA_ACE: { baseFare: 350.0, baseDistance: 3.0, perKm: 28.0, thresholdKg: 100.0, perKg: 0.8 },
      PICKUP_TRUCK: {
        baseFare: 550.0,
        baseDistance: 4.0,
        perKm: 35.0,
        thresholdKg: 200.0,
        perKg: 0.6,
      },
    };

    const vRates = (rates[vehicleType] ?? rates['TWO_WHEELER'])!;
    const baseFare = vRates.baseFare;
    const baseDistance = vRates.baseDistance;
    const perKmRate = vRates.perKm;
    const perKgRate = vRates.perKg;

    // Volumetric weight: (L * W * H) / 5000 (IATA standard intra-city courier formula)
    const length = dto.lengthCm || 20.0;
    const width = dto.widthCm || 15.0;
    const height = dto.heightCm || 10.0;
    const volumetricWeightKg = Math.round(((length * width * height) / 5000.0) * 10) / 10;
    const chargeableWeightKg = Math.max(dto.weightKg, volumetricWeightKg);

    // Distance charge
    const chargeableKm = Math.max(distanceKm - baseDistance, 0);
    const distanceFare = Math.round(chargeableKm * perKmRate * 100) / 100;

    // Weight charge above threshold
    const extraWeight = Math.max(chargeableWeightKg - vRates.thresholdKg, 0);
    const weightFare = Math.round(extraWeight * perKgRate * 100) / 100;

    const fragileSurcharge = dto.isFragile ? 50.0 : 0.0;

    // Combined subtotal with service and zone multipliers
    const rawSubtotal =
      (baseFare + distanceFare + weightFare + fragileSurcharge) *
      serviceMultiplier *
      zoneSurgeMultiplier;
    const subtotal = Math.round(rawSubtotal * 100) / 100;

    const platformFee = 5.0;
    const gst = Math.round(subtotal * 0.05 * 100) / 100; // 5% GST on transport
    const totalAmount = Math.round((subtotal + platformFee + gst) * 100) / 100;
    const partnerPayout = Math.round(subtotal * 0.8 * 100) / 100;

    // 15 minutes quote TTL
    const validUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    return {
      serviceType,
      serviceDisplayName: serviceConfig.display_name,
      distanceKm,
      actualWeightKg: dto.weightKg,
      volumetricWeightKg,
      chargeableWeightKg,
      baseFareInr: baseFare,
      distanceFareInr: distanceFare,
      weightFareInr: weightFare,
      serviceMultiplier,
      zoneSurgeMultiplier,
      subtotalInr: subtotal,
      platformFeeInr: platformFee,
      gstInr: gst,
      totalAmountInr: totalAmount,
      partnerPayoutInr: partnerPayout,
      zoneId,
      zoneName,
      validUntil,
    };
  }

  /**
   * Get all active service levels
   */
  async getServiceConfigs(): Promise<any[]> {
    const res = await this.db.query(
      `SELECT * FROM parcel_service_configs ORDER BY base_multiplier ASC;`,
    );
    return res.rows;
  }

  /**
   * Update service configuration (Admin only)
   */
  async updateServiceConfig(serviceType: string, dto: UpdateServiceConfigDto): Promise<any> {
    const existing = await this.db.query(
      `SELECT * FROM parcel_service_configs WHERE service_type = $1;`,
      [serviceType.toUpperCase()],
    );
    if (existing.rows.length === 0) {
      throw new BadRequestException(`Service type ${serviceType} not found`);
    }

    const current = existing.rows[0];
    const isEnabled = dto.isEnabled !== undefined ? dto.isEnabled : current.is_enabled;
    const mult = dto.baseMultiplier !== undefined ? dto.baseMultiplier : current.base_multiplier;
    const hours =
      dto.estimatedDeliveryHours !== undefined
        ? dto.estimatedDeliveryHours
        : current.estimated_delivery_hours;
    const maxDist = dto.maxDistanceKm !== undefined ? dto.maxDistanceKm : current.max_distance_km;
    const desc = dto.description !== undefined ? dto.description : current.description;

    const res = await this.db.query(
      `UPDATE parcel_service_configs
       SET is_enabled = $1, base_multiplier = $2, estimated_delivery_hours = $3,
           max_distance_km = $4, description = $5, updated_at = NOW()
       WHERE service_type = $6
       RETURNING *;`,
      [isEnabled, mult, hours, maxDist, desc, serviceType.toUpperCase()],
    );

    return res.rows[0];
  }
}
