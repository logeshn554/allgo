import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Request,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Observable, from, interval } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { DatabaseService } from '../../database/database.service.js';
import { DeliveryJobService } from '../delivery-job.service.js';

@Controller('v1/customer/delivery')
@UseGuards(JwtAuthGuard)
export class CustomerDeliveryController {
  constructor(
    private readonly deliveryJobService: DeliveryJobService,
    private readonly db: DatabaseService,
  ) {}

  @Get('active')
  async getActiveDeliveries(@Request() req: any) {
    const res = await this.db.query(
      `SELECT j.id, j.job_number, j.status, j.vertical_type,
              o.outlet_name, j.pickup_address, j.dropoff_address,
              j.delivery_pin, j.created_at,
              up.full_name as partner_name, up.phone as partner_phone
       FROM delivery_jobs j
       JOIN outlets o ON o.id = j.outlet_id
       LEFT JOIN partners p ON p.id = j.assigned_partner_id
       LEFT JOIN users up ON up.id = p.user_id
       WHERE j.customer_id = $1
         AND j.status NOT IN ('DELIVERED', 'CANCELLED', 'FAILED', 'RETURNED')
       ORDER BY j.created_at DESC;`,
      [req.user.userId],
    );

    return res.rows.map((r: any) => ({
      id: r.id,
      jobNumber: r.job_number,
      status: r.status,
      verticalType: r.vertical_type,
      outletName: r.outlet_name,
      pickupAddress: r.pickup_address,
      dropoffAddress: r.dropoff_address,
      deliveryPin: r.delivery_pin,
      partnerName: r.partner_name,
      partnerPhone: r.partner_phone,
      createdAt: r.created_at,
    }));
  }

  @Get('jobs/:id/tracking')
  async getTrackingSnapshot(@Request() req: any, @Param('id') id: string) {
    return this.deliveryJobService.getJobTrackingDetails(req.user.userId, 'CUSTOMER', id);
  }

  @Sse('jobs/:id/tracking/stream')
  streamDriverTracking(@Request() req: any, @Param('id') id: string): Observable<{ data: any }> {
    return interval(3000).pipe(
      switchMap(() =>
        from(this.deliveryJobService.getJobTrackingDetails(req.user.userId, 'CUSTOMER', id)),
      ),
      map((snapshot) => ({ data: snapshot })),
    );
  }

  @Get('jobs/:id/events/sync')
  async syncMissedEvents(
    @Request() req: any,
    @Param('id') id: string,
    @Query('since') since?: string,
  ) {
    const job = await this.db.query(
      'SELECT id, customer_id, assigned_partner_id FROM delivery_jobs WHERE id = $1;',
      [id],
    );
    if (job.rows.length === 0 || job.rows[0].customer_id !== req.user.userId) {
      throw new NotFoundException('Delivery job not found or unauthorized');
    }

    let query = `
      SELECT id, delivery_job_id, from_status, to_status, actor_role, reason, created_at
      FROM delivery_status_events
      WHERE delivery_job_id = $1
    `;
    const params: any[] = [id];
    if (since) {
      query += ` AND created_at > $2`;
      params.push(new Date(since));
    }
    query += ` ORDER BY created_at ASC;`;

    const eventsRes = await this.db.query(query, params);

    let latestLocation = null;
    const partnerId = job.rows[0].assigned_partner_id;
    if (partnerId) {
      latestLocation = await this.deliveryJobService.getJobTrackingDetails(
        req.user.userId,
        'CUSTOMER',
        id,
      );
    }

    return {
      jobId: id,
      syncedAt: new Date().toISOString(),
      events: eventsRes.rows.map((e: any) => ({
        id: e.id,
        fromStatus: e.from_status,
        toStatus: e.to_status,
        actorRole: e.actor_role,
        reason: e.reason,
        createdAt: e.created_at,
      })),
      currentSnapshot: latestLocation,
    };
  }
}
