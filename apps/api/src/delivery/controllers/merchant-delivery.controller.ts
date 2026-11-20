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
import { DeliveryJobService } from '../delivery-job.service.js';
import { VerifyHandoverDto } from '../dto/delivery.dto.js';
import { DatabaseService } from '../../database/database.service.js';

@Controller('v1/merchants/delivery')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MERCHANT', 'MERCHANT_ADMIN', 'MERCHANT_OPERATOR')
export class MerchantDeliveryController {
  constructor(
    private readonly deliveryJobService: DeliveryJobService,
    private readonly db: DatabaseService
  ) {}

  @Get('outlets/:outletId/jobs')
  async getOutletDeliveryJobs(
    @Request() req: any,
    @Param('outletId') outletId: string
  ) {
    // Verify outlet ownership
    const outRes = await this.db.query(
      `SELECT o.id FROM outlets o
       JOIN merchants m ON m.id = o.merchant_id
       WHERE o.id = $1 AND m.owner_id = $2;`,
      [outletId, req.user.userId]
    );
    if (outRes.rows.length === 0) return [];

    const res = await this.db.query(
      `SELECT j.*, up.full_name as partner_name, up.phone as partner_phone
       FROM delivery_jobs j
       LEFT JOIN partners p ON p.id = j.assigned_partner_id
       LEFT JOIN users up ON up.id = p.user_id
       WHERE j.outlet_id = $1
       ORDER BY j.created_at DESC LIMIT 50;`,
      [outletId]
    );
    return res.rows;
  }

  @Post('jobs/:id/accept')
  async acceptJob(@Request() req: any, @Param('id') id: string) {
    return this.deliveryJobService.merchantAcceptJob(req.user.userId, id);
  }

  @Post('jobs/:id/prepare')
  async startPreparing(@Request() req: any, @Param('id') id: string) {
    return this.deliveryJobService.merchantStartPreparing(req.user.userId, id);
  }

  @Post('jobs/:id/ready')
  async markReady(@Request() req: any, @Param('id') id: string) {
    return this.deliveryJobService.merchantMarkReadyForPickup(req.user.userId, id);
  }

  @Post('jobs/:id/verify-handover')
  async verifyHandover(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: VerifyHandoverDto
  ) {
    return this.deliveryJobService.merchantVerifyHandover(req.user.userId, id, dto.handoverOtp);
  }
}
