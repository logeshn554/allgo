import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class RideRepository {
  constructor(private readonly db: DatabaseService) {}

  async getDefaultCityId(): Promise<string> {
    const cityRes = await this.db.query('SELECT id FROM cities LIMIT 1;');
    return cityRes.rows[0]?.id || '10000000-0000-0000-0000-000000000001';
  }

  async insertRide(data: any): Promise<any> {
    const res = await this.db.query(
      `INSERT INTO rides (
         ride_number, customer_id, city_id, ride_type, status,
         pickup_address, pickup_location,
         drop_address, drop_location,
         start_otp, estimated_distance_km, estimated_duration_minutes,
         fare_base_inr, fare_distance_inr, fare_time_inr,
         platform_fee_inr, tax_total_inr, total_fare_inr,
         partner_payout_inr, payment_method, payment_status,
         service_type, vehicle_category, otp_hash, otp_attempts,
         fare_quote_snapshot, passenger_count, special_instructions
       ) VALUES (
         $1, $2, $3, $4, 'REQUESTED',
         $5, ST_SetSRID(ST_MakePoint($6, $7), 4326),
         $8, ST_SetSRID(ST_MakePoint($9, $10), 4326),
         $11, $12, $13,
         $14, $15, $16,
         $17, $18, $19,
         $20, $21, 'PENDING',
         $22, $23, $24, 0,
         $25, $26, $27
       ) RETURNING *;`,
      [
        data.rideNumber,
        data.customerId,
        data.cityId,
        data.vehicleCategory,
        data.pickupAddress,
        data.pickupLocation.longitude,
        data.pickupLocation.latitude,
        data.dropoffAddress,
        data.dropoffLocation.longitude,
        data.dropoffLocation.latitude,
        data.startOtp,
        data.distanceKm,
        data.durationMinutes,
        data.fare.baseFare,
        data.fare.distanceFare,
        data.fare.timeFare,
        data.fare.platformFee,
        data.fare.gst,
        data.fare.totalFare,
        data.partnerPayout,
        data.paymentMethod || 'ONLINE',
        data.serviceType,
        data.vehicleCategory,
        data.otpHash,
        JSON.stringify(data.fareSnapshot),
        1,
        data.specialInstructions || null,
      ],
    );
    return res.rows[0];
  }

  async findById(rideId: string): Promise<any> {
    const res = await this.db.query('SELECT * FROM rides WHERE id = $1;', [rideId]);
    if (res.rows.length === 0) throw new NotFoundException('Ride booking not found');
    return res.rows[0];
  }

  async findByIdWithDetails(rideId: string): Promise<any> {
    const res = await this.db.query(
      `SELECT r.*,
              uc.full_name as customer_name, uc.phone as customer_phone,
              up.full_name as driver_name, up.phone as driver_phone,
              v.registration_number, v.make_model
       FROM rides r
       JOIN users uc ON uc.id = r.customer_id
       LEFT JOIN partners p ON p.id = r.partner_id
       LEFT JOIN users up ON up.id = p.user_id
       LEFT JOIN vehicles v ON v.partner_id = p.id
       WHERE r.id = $1;`,
      [rideId],
    );
    if (res.rows.length === 0) throw new NotFoundException('Ride not found');
    return res.rows[0];
  }

  async updateDriverAssigned(rideId: string, partnerId: string): Promise<any> {
    const res = await this.db.query(
      `UPDATE rides
       SET partner_id = $1, status = 'ACCEPTED', updated_at = NOW()
       WHERE id = $2 RETURNING *;`,
      [partnerId, rideId],
    );
    return res.rows[0];
  }

  async updateDriverArrived(rideId: string): Promise<any> {
    const res = await this.db.query(
      `UPDATE rides SET status = 'ARRIVED', updated_at = NOW() WHERE id = $1 RETURNING *;`,
      [rideId],
    );
    return res.rows[0];
  }

  async incrementOtpAttempts(rideId: string): Promise<void> {
    await this.db.query(
      'UPDATE rides SET otp_attempts = COALESCE(otp_attempts, 0) + 1 WHERE id = $1;',
      [rideId],
    );
  }

  async updateTripStarted(rideId: string): Promise<any> {
    const res = await this.db.query(
      `UPDATE rides SET status = 'IN_PROGRESS', updated_at = NOW() WHERE id = $1 RETURNING *;`,
      [rideId],
    );
    return res.rows[0];
  }

  async updateTripCompleted(rideId: string, actualDist: number, actualDur: number): Promise<any> {
    const res = await this.db.query(
      `UPDATE rides
       SET status = 'COMPLETED',
           actual_distance_km = $1,
           actual_duration_minutes = $2,
           payment_status = 'COMPLETED',
           updated_at = NOW()
       WHERE id = $3 RETURNING *;`,
      [actualDist, actualDur, rideId],
    );
    return res.rows[0];
  }

  async updateSosTriggered(rideId: string): Promise<void> {
    await this.db.query(
      `UPDATE rides SET sos_triggered_at = NOW(), sos_status = 'TRIGGERED' WHERE id = $1;`,
      [rideId],
    );
  }

  async updateRideCancelled(rideId: string, reason: string, userId: string): Promise<any> {
    const res = await this.db.query(
      `UPDATE rides
       SET status = 'CANCELLED',
           cancellation_reason = $1,
           cancelled_by_user_id = $2,
           updated_at = NOW()
       WHERE id = $3 RETURNING *;`,
      [reason, userId, rideId],
    );
    return res.rows[0];
  }

  async updateSearchingForDriver(rideId: string): Promise<void> {
    await this.db.query(
      `UPDATE rides SET status = 'SEARCHING_FOR_DRIVER', updated_at = NOW() WHERE id = $1;`,
      [rideId],
    );
  }

  async updatePartnerAccepted(rideId: string, partnerId: string): Promise<any> {
    const res = await this.db.query(
      `UPDATE rides SET partner_id = $1, status = 'ACCEPTED', updated_at = NOW() WHERE id = $2 RETURNING *;`,
      [partnerId, rideId],
    );
    return res.rows[0];
  }

  async findActiveByPartnerId(partnerId: string): Promise<any | null> {
    const res = await this.db.query(
      `SELECT r.*,
              uc.full_name as customer_name,
              uc.phone as customer_phone
       FROM rides r
       JOIN users uc ON uc.id = r.customer_id
       WHERE r.partner_id = $1
         AND r.status IN ('DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'TRIP_STARTED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS')
       ORDER BY r.created_at DESC
       LIMIT 1;`,
      [partnerId],
    );
    if (res.rows.length === 0) return null;
    const ride = res.rows[0];
    delete ride.otp_hash;
    delete ride.otp_code;
    return ride;
  }

  async listRides(whereClause: string, params: any[]): Promise<any[]> {
    const res = await this.db.query(
      `SELECT r.*, uc.full_name as customer_name, up.full_name as driver_name
       FROM rides r
       JOIN users uc ON uc.id = r.customer_id
       LEFT JOIN partners p ON p.id = r.partner_id
       LEFT JOIN users up ON up.id = p.user_id
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT $1 OFFSET $2;`,
      params,
    );
    return res.rows;
  }
}
