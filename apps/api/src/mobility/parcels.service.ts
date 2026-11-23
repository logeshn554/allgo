import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import crypto from 'node:crypto';
import { DatabaseService } from '../database/database.service.js';
import { WalletService } from '../finance/wallet/wallet.service.js';
import { MobilityFareService } from './mobility-fare.service.js';
import { PartnerContinuityService } from './partner-continuity.service.js';
import {
  CreateParcelDeliveryDto,
  VerifyParcelOtpDto,
  ParcelVehicleType,
} from './dto/mobility.dto.js';

@Injectable()
export class ParcelsService {
  private readonly logger = new Logger(ParcelsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly fareService: MobilityFareService,
    private readonly continuityService: PartnerContinuityService,
    @Optional() private readonly walletService?: WalletService
  ) {}

  private generateOtp(): string {
    return crypto.randomInt(1000, 9999).toString();
  }

  async createParcel(senderId: string, dto: CreateParcelDeliveryDto): Promise<any> {
    const vehicleType: ParcelVehicleType = dto.vehicleType || 'TWO_WHEELER';
    const isFragile = Boolean(dto.isFragile);

    const distanceKm = this.fareService.calculateDistanceKm(
      dto.pickupLocation,
      dto.dropoffLocation
    );

    const fare = await this.fareService.calculateParcelFare(
      distanceKm,
      dto.packageCategory || 'GENERAL',
      dto.weightKg || 1.0,
      vehicleType,
      isFragile
    );

    const parcelNumber = `PCL-${Date.now().toString(36).toUpperCase()}-${crypto.randomInt(100, 999)}`;
    const pickupOtp = this.generateOtp();
    const deliveryOtp = this.generateOtp();

    const cityRes = await this.db.query('SELECT id FROM cities LIMIT 1;');
    const cityId = cityRes.rows[0]?.id || '10000000-0000-0000-0000-000000000001';

    const partnerPayout = Math.round(fare * 0.8 * 100) / 100;

    let paymentStatus = 'PENDING';
    if (dto.paymentMethod === 'WALLET' && this.walletService) {
      const txRef = `PCL-WAL-${parcelNumber}`;
      await this.walletService.debitWallet(
        senderId,
        fare,
        `Parcel booking ${parcelNumber}`,
        txRef,
        'PARTNER_EARNINGS'
      );
      paymentStatus = 'COMPLETED';
    }

    const res = await this.db.query(
      `INSERT INTO parcels (
         parcel_number, sender_id, city_id, status,
         pickup_address, pickup_location, pickup_contact_name, pickup_contact_phone,
         drop_address, drop_location, drop_contact_name, drop_contact_phone,
         package_category, vehicle_type, estimated_weight_kg, package_description, is_fragile,
         pickup_otp, delivery_otp, delivery_fee_inr, total_amount_inr, partner_payout_inr, payment_status
       ) VALUES (
         $1, $2, $3, 'CREATED',
         $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), $7, $8,
         $9, ST_SetSRID(ST_MakePoint($10, $11), 4326), $12, $13,
         $14, $15, $16, $17, $18,
         $19, $20, $21, $22, $23, $24
       ) RETURNING *;`,
      [
        parcelNumber,
        senderId,
        cityId,
        dto.pickupAddress,
        dto.pickupLocation.longitude,
        dto.pickupLocation.latitude,
        dto.pickupContactName,
        dto.pickupContactPhone,
        dto.dropoffAddress,
        dto.dropoffLocation.longitude,
        dto.dropoffLocation.latitude,
        dto.dropoffContactName,
        dto.dropoffContactPhone,
        dto.packageCategory || 'GENERAL',
        vehicleType,
        dto.weightKg || 1.0,
        dto.packageDescription || 'Parcel item',
        isFragile,
        pickupOtp,
        deliveryOtp,
        fare,
        fare,
        partnerPayout,
        paymentStatus,
      ]
    );

    const parcel = res.rows[0];
    this.logger.log(`Created parcel courier delivery ${parcel.parcel_number}`);
    return parcel;
  }

  async assignCourier(courierUserId: string, parcelId: string): Promise<any> {
    const partner = await this.continuityService.getPartnerByUserId(courierUserId);

    await this.continuityService.acquireVerticalLock(partner.id, 'PARCEL');

    const pRes = await this.db.query('SELECT * FROM parcels WHERE id = $1;', [parcelId]);
    if (pRes.rows.length === 0) throw new NotFoundException('Parcel not found');
    const parcel = pRes.rows[0];

    if (parcel.status !== 'CREATED' && parcel.status !== 'OFFERED') {
      await this.continuityService.releaseVerticalLock(partner.id);
      throw new BadRequestException(`Parcel is not available for assignment (status: ${parcel.status})`);
    }

    const res = await this.db.query(
      `UPDATE parcels SET partner_id = $1, status = 'ACCEPTED', updated_at = NOW() WHERE id = $2 RETURNING *;`,
      [partner.id, parcelId]
    );

    return res.rows[0];
  }

  async verifyPickupOtp(courierUserId: string, parcelId: string, otp: string): Promise<any> {
    const partner = await this.continuityService.getPartnerByUserId(courierUserId);
    const parcel = await this.getParcelOrThrow(parcelId);

    if (parcel.partner_id !== partner.id) {
      throw new ForbiddenException('Not the assigned courier for this parcel');
    }

    if (parcel.pickup_otp !== otp.trim()) {
      throw new BadRequestException('Invalid sender pickup OTP');
    }

    const res = await this.db.query(
      `UPDATE parcels
       SET status = 'PICKED_UP', picked_up_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *;`,
      [parcelId]
    );

    return res.rows[0];
  }

  async startTransit(courierUserId: string, parcelId: string): Promise<any> {
    const partner = await this.continuityService.getPartnerByUserId(courierUserId);
    const parcel = await this.getParcelOrThrow(parcelId);

    if (parcel.partner_id !== partner.id) {
      throw new ForbiddenException('Not the assigned courier for this parcel');
    }

    const res = await this.db.query(
      `UPDATE parcels SET status = 'IN_TRANSIT', updated_at = NOW() WHERE id = $1 RETURNING *;`,
      [parcelId]
    );
    return res.rows[0];
  }

  async verifyDeliveryOtp(courierUserId: string, parcelId: string, otp: string): Promise<any> {
    const partner = await this.continuityService.getPartnerByUserId(courierUserId);
    const parcel = await this.getParcelOrThrow(parcelId);

    if (parcel.partner_id !== partner.id) {
      throw new ForbiddenException('Not the assigned courier for this parcel');
    }

    if (parcel.delivery_otp !== otp.trim()) {
      throw new BadRequestException('Invalid recipient delivery OTP');
    }

    const res = await this.db.query(
      `UPDATE parcels
       SET status = 'DELIVERED', delivered_at = NOW(), payment_status = 'COMPLETED', updated_at = NOW()
       WHERE id = $1 RETURNING *;`,
      [parcelId]
    );

    const payout = Number(parcel.partner_payout_inr);
    await this.db.query(
      `INSERT INTO partner_earnings_entries (
         partner_id, entry_type, base_amount_inr, total_earned_inr, notes
       ) VALUES ($1, 'DELIVERY_PAY', $2, $3, 'Completed intra-city parcel courier handover');`,
      [partner.id, payout, payout]
    );

    await this.continuityService.releaseVerticalLock(partner.id);

    return res.rows[0];
  }

  async getParcelDetails(userId: string, role: string, parcelId: string): Promise<any> {
    const res = await this.db.query(
      `SELECT pcl.*,
              us.full_name as sender_name, us.phone as sender_phone,
              up.full_name as courier_name, up.phone as courier_phone
       FROM parcels pcl
       JOIN users us ON us.id = pcl.sender_id
       LEFT JOIN partners p ON p.id = pcl.partner_id
       LEFT JOIN users up ON up.id = p.user_id
       WHERE pcl.id = $1;`,
      [parcelId]
    );

    if (res.rows.length === 0) throw new NotFoundException('Parcel not found');
    const p = res.rows[0];

    const isSender = p.sender_id === userId;
    const isCourier = role === 'PARTNER';

    return {
      id: p.id,
      parcelNumber: p.parcel_number,
      packageCategory: p.package_category,
      vehicleType: p.vehicle_type || 'TWO_WHEELER',
      isFragile: Boolean(p.is_fragile),
      packageDescription: p.package_description,
      weightKg: Number(p.estimated_weight_kg),
      status: p.status,
      paymentStatus: p.payment_status || 'PENDING',
      pickupAddress: p.pickup_address,
      dropoffAddress: p.drop_address,
      totalAmountInr: Number(p.total_amount_inr),
      pickupOtp: isSender ? p.pickup_otp : null,
      deliveryOtp: isSender ? p.delivery_otp : null,
      courier: p.partner_id
        ? {
            name: p.courier_name || 'Courier',
            phone: isSender ? p.courier_phone : undefined,
          }
        : null,
      createdAt: p.created_at,
    };
  }

  private async getParcelOrThrow(parcelId: string): Promise<any> {
    const res = await this.db.query('SELECT * FROM parcels WHERE id = $1;', [parcelId]);
    if (res.rows.length === 0) throw new NotFoundException('Parcel not found');
    return res.rows[0];
  }
}
