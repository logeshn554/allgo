import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class HireDriverRepository {
  private readonly logger = new Logger(HireDriverRepository.name);

  constructor(private readonly db: DatabaseService) {}

  async getDefaultCityId(): Promise<string> {
    const cityRes = await this.db.query('SELECT id FROM cities LIMIT 1;');
    return cityRes.rows[0]?.id || '10000000-0000-0000-0000-000000000001';
  }

  async insertBooking(data: any): Promise<any> {
    const res = await this.db.query(
      `INSERT INTO hire_driver_bookings (
         booking_number, customer_id, city_id, status,
         vehicle_transmission, duration_hours, scheduled_start_time,
         pickup_address, pickup_location,
         start_otp, end_otp,
         base_fee_inr, night_allowance_inr, total_amount_inr, partner_payout_inr,
         start_otp_hash, end_otp_hash
       ) VALUES (
         $1, $2, $3, 'BOOKED',
         $4, $5, $6,
         $7, ST_SetSRID(ST_MakePoint($8, $9), 4326),
         $10, $11,
         $12, $13, $14, $15,
         $16, $17
       ) RETURNING *;`,
      [
        data.bookingNumber,
        data.customerId,
        data.cityId,
        data.vehicleTransmission,
        data.durationHours,
        data.scheduledDate,
        data.pickupAddress,
        data.pickupLocation.longitude,
        data.pickupLocation.latitude,
        data.startOtp,
        data.endOtp,
        data.fare.packageFare,
        data.fare.nightAllowance,
        data.fare.totalFare,
        data.partnerPayout,
        data.startOtpHash,
        data.endOtpHash,
      ]
    );
    return res.rows[0];
  }

  async findById(bookingId: string): Promise<any> {
    const res = await this.db.query('SELECT * FROM hire_driver_bookings WHERE id = $1;', [bookingId]);
    if (res.rows.length === 0) throw new NotFoundException('Hire driver booking not found');
    return res.rows[0];
  }

  async findByIdWithDetails(bookingId: string): Promise<any> {
    const res = await this.db.query(
      `SELECT b.*,
              uc.full_name as customer_name, uc.phone as customer_phone,
              up.full_name as driver_name, up.phone as driver_phone
       FROM hire_driver_bookings b
       JOIN users uc ON uc.id = b.customer_id
       LEFT JOIN partners p ON p.id = b.partner_id
       LEFT JOIN users up ON up.id = p.user_id
       WHERE b.id = $1;`,
      [bookingId]
    );
    if (res.rows.length === 0) throw new NotFoundException('Hire driver booking not found');
    return res.rows[0];
  }

  async updateDriverAssigned(bookingId: string, partnerId: string): Promise<any> {
    const res = await this.db.query(
      `UPDATE hire_driver_bookings
       SET partner_id = $1, status = 'ASSIGNED', updated_at = NOW()
       WHERE id = $2 RETURNING *;`,
      [partnerId, bookingId]
    );
    return res.rows[0];
  }

  async updateDriverArrived(bookingId: string): Promise<any> {
    const res = await this.db.query(
      `UPDATE hire_driver_bookings SET status = 'ARRIVED', updated_at = NOW() WHERE id = $1 RETURNING *;`,
      [bookingId]
    );
    return res.rows[0];
  }

  async incrementStartOtpAttempts(bookingId: string): Promise<void> {
    await this.db.query(
      'UPDATE hire_driver_bookings SET start_otp_attempts = COALESCE(start_otp_attempts, 0) + 1 WHERE id = $1;',
      [bookingId]
    );
  }

  async updateDutyStarted(bookingId: string, odometerKm?: number): Promise<any> {
    const res = await this.db.query(
      `UPDATE hire_driver_bookings
       SET status = 'STARTED',
           actual_start_time = NOW(),
           duty_started_at = NOW(),
           start_odometer_km = $1,
           updated_at = NOW()
       WHERE id = $2 RETURNING *;`,
      [odometerKm || null, bookingId]
    );
    return res.rows[0];
  }

  async incrementEndOtpAttempts(bookingId: string): Promise<void> {
    await this.db.query(
      'UPDATE hire_driver_bookings SET end_otp_attempts = COALESCE(end_otp_attempts, 0) + 1 WHERE id = $1;',
      [bookingId]
    );
  }

  async updateDutyCompleted(
    bookingId: string,
    odometerKm: number | null,
    overtimeFee: number,
    finalAmount: number,
    finalPayout: number
  ): Promise<any> {
    const res = await this.db.query(
      `UPDATE hire_driver_bookings
       SET status = 'COMPLETED',
           actual_end_time = NOW(),
           duty_completed_at = NOW(),
           end_odometer_km = $1,
           extra_hours_fee_inr = $2,
           total_amount_inr = $3,
           partner_payout_inr = $4,
           payment_status = 'COMPLETED',
           updated_at = NOW()
       WHERE id = $5 RETURNING *;`,
      [odometerKm || null, overtimeFee, finalAmount, finalPayout, bookingId]
    );
    return res.rows[0];
  }

  async recordPartnerEarnings(partnerId: string, payout: number): Promise<void> {
    await this.db.query(
      `INSERT INTO partner_earnings_entries (
         partner_id, entry_type, base_amount_inr, total_earned_inr, notes
       ) VALUES ($1, 'DELIVERY_PAY', $2, $3, 'Completed designated driver chauffeur duty');`,
      [partnerId, payout, payout]
    );
  }

  async updateBookingCancelled(bookingId: string, reason: string): Promise<any> {
    const res = await this.db.query(
      `UPDATE hire_driver_bookings
       SET status = 'CANCELLED',
           cancellation_reason = $1,
           updated_at = NOW()
       WHERE id = $2 RETURNING *;`,
      [reason, bookingId]
    );
    return res.rows[0];
  }

  async recordHireDriverEvent(
    bookingId: string,
    eventType: string,
    actorRole: string = 'SYSTEM',
    actorId?: string | null,
    fromStatus?: string | null,
    toStatus?: string | null,
    metadata: any = {}
  ): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO hire_driver_events (
           booking_id, event_type, actor_role, actor_id, from_status, to_status, metadata, payload
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7);`,
        [
          bookingId,
          eventType,
          actorRole,
          actorId || null,
          fromStatus || null,
          toStatus || null,
          JSON.stringify(metadata || {}),
        ]
      );
    } catch (e: any) {
      this.logger.warn(`Failed to append hire driver event ${eventType}: ${e.message}`);
    }
  }

  async getBookingEvents(bookingId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT id, event_type, actor_role, actor_id, from_status, to_status, metadata, created_at
       FROM hire_driver_events
       WHERE booking_id = $1
       ORDER BY created_at ASC;`,
      [bookingId]
    );
    return res.rows;
  }

  async listBookings(whereClause: string, params: any[]): Promise<any[]> {
    const res = await this.db.query(
      `SELECT b.*, uc.full_name as customer_name, up.full_name as driver_name
       FROM hire_driver_bookings b
       JOIN users uc ON uc.id = b.customer_id
       LEFT JOIN partners p ON p.id = b.partner_id
       LEFT JOIN users up ON up.id = p.user_id
       ${whereClause}
       ORDER BY b.created_at DESC
       LIMIT $1 OFFSET $2;`,
      params
    );
    return res.rows;
  }

  async findActiveByPartnerId(partnerId: string): Promise<any | null> {
    const res = await this.db.query(
      `SELECT b.*,
              uc.full_name as customer_name,
              uc.phone as customer_phone
       FROM hire_driver_bookings b
       JOIN users uc ON uc.id = b.customer_id
       WHERE b.partner_id = $1
         AND b.status IN ('ASSIGNED', 'ARRIVED', 'STARTED')
       ORDER BY b.created_at DESC
       LIMIT 1;`,
      [partnerId]
    );
    if (res.rows.length === 0) return null;
    const booking = res.rows[0];
    delete booking.start_otp_hash;
    delete booking.end_otp_hash;
    delete booking.start_otp;
    delete booking.end_otp;
    return booking;
  }
}
