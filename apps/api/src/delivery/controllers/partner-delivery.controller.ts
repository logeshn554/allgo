import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { PartnerAvailabilityService } from '../partner-availability.service.js';
import { DispatchEngineService } from '../dispatch-engine.service.js';
import { DeliveryJobService } from '../delivery-job.service.js';
import {
  LocationCoordinatesDto,
  PartnerLocationUpdateDto,
  CompleteDeliveryDto,
  RejectOfferDto,
} from '../dto/delivery.dto.js';
import { DatabaseService } from '../../database/database.service.js';

@Controller('v1/partner/delivery')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PARTNER')
export class PartnerDeliveryController {
  constructor(
    private readonly partnerAvailabilityService: PartnerAvailabilityService,
    private readonly dispatchEngineService: DispatchEngineService,
    private readonly deliveryJobService: DeliveryJobService,
    private readonly db: DatabaseService
  ) {}

  @Post('availability/online')
  async goOnline(
    @Request() req: any,
    @Body() body: { location: LocationCoordinatesDto; batteryPercentage?: number }
  ) {
    return this.partnerAvailabilityService.setOnline(
      req.user.userId,
      body.location,
      body.batteryPercentage
    );
  }

  @Post('availability/offline')
  async goOffline(@Request() req: any) {
    return this.partnerAvailabilityService.setOffline(req.user.userId);
  }

  @Post('availability/heartbeat')
  async heartbeat(
    @Request() req: any,
    @Body() body: { location: LocationCoordinatesDto; batteryPercentage?: number }
  ) {
    return this.partnerAvailabilityService.heartbeat(
      req.user.userId,
      body.location,
      body.batteryPercentage
    );
  }

  @Post('location')
  async updateLocation(
    @Request() req: any,
    @Body() dto: PartnerLocationUpdateDto
  ) {
    return this.partnerAvailabilityService.recordLocation(req.user.userId, dto);
  }

  @Get('active-job')
  async getActiveJob(@Request() req: any) {
    const partner = await this.partnerAvailabilityService.getPartnerByUserId(req.user.userId);
    const res = await this.db.query(
      `SELECT j.*, o.outlet_name, o.address_line1 as outlet_address,
              ST_X(j.pickup_location::geometry) as pickup_lon,
              ST_Y(j.pickup_location::geometry) as pickup_lat,
              ST_X(j.dropoff_location::geometry) as dropoff_lon,
              ST_Y(j.dropoff_location::geometry) as dropoff_lat
       FROM delivery_jobs j
       JOIN outlets o ON o.id = j.outlet_id
       WHERE j.assigned_partner_id = $1
         AND j.status IN ('PARTNER_ASSIGNED', 'PARTNER_ARRIVING', 'PARTNER_ARRIVED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_DESTINATION')
       LIMIT 1;`,
      [partner.id]
    );

    if (res.rows.length === 0) return null;
    const j = res.rows[0];
    return {
      id: j.id,
      jobNumber: j.job_number,
      verticalType: j.vertical_type,
      status: j.status,
      outletName: j.outlet_name,
      pickupAddress: j.pickup_address,
      pickupLocation: { latitude: Number(j.pickup_lat), longitude: Number(j.pickup_lon) },
      dropoffAddress: j.dropoff_address,
      dropoffLocation: { latitude: Number(j.dropoff_lat), longitude: Number(j.dropoff_lon) },
      customerName: j.customer_name,
      customerPhone: j.dropoff_contact_phone,
      courierFeeInr: Number(j.courier_fee_inr),
      surgeFeeInr: Number(j.surge_fee_inr),
      totalPayoutInr: Number(j.courier_fee_inr) + Number(j.surge_fee_inr),
      handoverOtp: j.handover_otp,
      itemsSnapshot: j.items_snapshot,
    };
  }

  @Get('offers')
  async getPendingOffers(@Request() req: any) {
    const partner = await this.partnerAvailabilityService.getPartnerByUserId(req.user.userId);
    const res = await this.db.query(
      `SELECT a.id as attempt_id, a.offer_sent_at, a.offer_expires_at,
              j.id as job_id, j.job_number, j.vertical_type, j.pickup_address, j.dropoff_address,
              j.courier_fee_inr, j.surge_fee_inr
       FROM dispatch_attempts a
       JOIN delivery_jobs j ON j.id = a.delivery_job_id
       WHERE a.partner_id = $1
         AND a.status = 'OFFERED'
         AND a.offer_expires_at > NOW()
       ORDER BY a.offer_sent_at DESC;`,
      [partner.id]
    );

    return res.rows.map((r: any) => ({
      attemptId: r.attempt_id,
      jobId: r.job_id,
      jobNumber: r.job_number,
      verticalType: r.vertical_type,
      pickupAddress: r.pickup_address,
      dropoffAddress: r.dropoff_address,
      courierFeeInr: Number(r.courier_fee_inr),
      surgeFeeInr: Number(r.surge_fee_inr),
      totalPayoutInr: Number(r.courier_fee_inr) + Number(r.surge_fee_inr),
      expiresAt: r.offer_expires_at,
    }));
  }

  @Post('offers/:attemptId/accept')
  async acceptOffer(@Request() req: any, @Param('attemptId') attemptId: string) {
    return this.dispatchEngineService.acceptOffer(req.user.userId, attemptId);
  }

  @Post('offers/:attemptId/reject')
  async rejectOffer(
    @Request() req: any,
    @Param('attemptId') attemptId: string,
    @Body() dto: RejectOfferDto
  ) {
    return this.dispatchEngineService.rejectOffer(req.user.userId, attemptId, dto.reason);
  }

  @Post('jobs/:id/arrived-pickup')
  async arrivedPickup(@Request() req: any, @Param('id') id: string) {
    return this.deliveryJobService.partnerArrivedAtPickup(req.user.userId, id);
  }

  @Post('jobs/:id/start-delivery')
  async startDelivery(@Request() req: any, @Param('id') id: string) {
    return this.deliveryJobService.partnerStartDelivery(req.user.userId, id);
  }

  @Post('jobs/:id/arrived-destination')
  async arrivedDestination(@Request() req: any, @Param('id') id: string) {
    return this.deliveryJobService.partnerArrivedAtDestination(req.user.userId, id);
  }

  @Post('jobs/:id/complete')
  async completeDelivery(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CompleteDeliveryDto
  ) {
    return this.deliveryJobService.partnerCompleteDelivery(req.user.userId, id, dto);
  }

  @Get('earnings')
  async getEarnings(@Request() req: any) {
    const partner = await this.partnerAvailabilityService.getPartnerByUserId(req.user.userId);
    const res = await this.db.query(
      `SELECT * FROM partner_earnings_entries
       WHERE partner_id = $1
       ORDER BY created_at DESC LIMIT 50;`,
      [partner.id]
    );

    const sumRes = await this.db.query(
      `SELECT COALESCE(SUM(total_earned_inr), 0) as total_earnings
       FROM partner_earnings_entries
       WHERE partner_id = $1;`,
      [partner.id]
    );

    return {
      totalEarningsInr: Number(sumRes.rows[0]?.total_earnings || 0),
      entries: res.rows.map((r: any) => ({
        id: r.id,
        jobId: r.delivery_job_id,
        entryType: r.entry_type,
        baseAmountInr: Number(r.base_amount_inr),
        surgeAmountInr: Number(r.surge_amount_inr),
        totalEarnedInr: Number(r.total_earned_inr),
        notes: r.notes,
        createdAt: r.created_at,
      })),
    };
  }
}
