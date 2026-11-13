import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { DeliveryJobService } from '../delivery-job.service.js';
import { DatabaseService } from '../../database/database.service.js';

@Controller('v1/customer/delivery')
@UseGuards(JwtAuthGuard)
export class CustomerDeliveryController {
  constructor(
    private readonly deliveryJobService: DeliveryJobService,
    private readonly db: DatabaseService
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
      [req.user.userId]
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
}
