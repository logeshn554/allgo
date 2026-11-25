import { Injectable, Logger } from '@nestjs/common';
import { RideEventRepository } from './data/ride-event.repository.js';
import { RideRepository } from './data/ride.repository.js';
import { TriggerSosDto } from './dto/mobility.dto.js';

@Injectable()
export class RideSafetyQueryService {
  private readonly logger = new Logger(RideSafetyQueryService.name);

  constructor(
    private readonly rideRepo: RideRepository,
    private readonly rideEventRepo: RideEventRepository,
  ) {}

  async recordRideEvent(
    rideId: string,
    eventType: string,
    actorRole = 'SYSTEM',
    actorId?: string | null,
    fromStatus?: string | null,
    toStatus?: string | null,
    metadata: any = {},
  ): Promise<void> {
    return this.rideEventRepo.recordRideEvent(
      rideId,
      eventType,
      actorRole,
      actorId,
      fromStatus,
      toStatus,
      metadata,
    );
  }

  async triggerSos(userId: string, role: string, rideId: string, dto: TriggerSosDto): Promise<any> {
    const ride = await this.rideRepo.findById(rideId);
    const sosEvent = await this.rideEventRepo.insertSosEvent(rideId, userId, role, dto);
    await this.rideRepo.updateSosTriggered(rideId);

    await this.rideEventRepo.recordRideEvent(
      rideId,
      'SOS_TRIGGERED',
      role,
      userId,
      ride.status,
      ride.status,
      { notes: dto.notes, latitude: dto.latitude, longitude: dto.longitude },
    );

    this.logger.warn(
      `CRITICAL SAFETY ALERT: SOS triggered for ride ${ride.ride_number} by ${role} ${userId}`,
    );
    return sosEvent;
  }

  async getRideEvents(_userId: string, _role: string, rideId: string): Promise<any[]> {
    return this.rideEventRepo.getRideEvents(rideId);
  }

  async listRides(
    userId: string,
    role: string,
    options?: { limit?: number; offset?: number },
  ): Promise<any[]> {
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    let whereClause = '';
    const params: any[] = [limit, offset];

    if (role === 'CUSTOMER') {
      whereClause = 'WHERE r.customer_id = $3';
      params.push(userId);
    } else if (role === 'PARTNER') {
      whereClause = 'WHERE r.partner_id IN (SELECT id FROM partners WHERE user_id = $3)';
      params.push(userId);
    }

    return this.rideRepo.listRides(whereClause, params);
  }

  async getRideDetails(_userId: string, role: string, rideId: string): Promise<any> {
    const r = await this.rideRepo.findByIdWithDetails(rideId);

    const isCustomer = role === 'CUSTOMER';
    const isDriver = role === 'PARTNER';

    return {
      id: r.id,
      rideNumber: r.ride_number,
      vehicleCategory: r.ride_type,
      status: r.status,
      pickupAddress: r.pickup_address,
      dropoffAddress: r.drop_address,
      totalFareInr: Number(r.total_fare_inr),
      startOtp: isCustomer ? r.start_otp : null,
      driver: r.partner_id
        ? {
            name: r.driver_name || 'Driver',
            phone: isCustomer ? r.driver_phone : undefined,
            vehicle: r.registration_number
              ? `${r.make_model || ''} (${r.registration_number})`
              : undefined,
          }
        : null,
      customer: {
        name: r.customer_name,
        phone: isDriver ? r.customer_phone : undefined,
      },
      createdAt: r.created_at,
    };
  }

  async getRideOrThrow(rideId: string): Promise<any> {
    return this.rideRepo.findById(rideId);
  }
}
