import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private readonly db: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !user.userId) {
      throw new ForbiddenException('User context missing');
    }

    const roles: string[] = user.roles || [];
    if (roles.includes('ADMIN') || roles.includes('SUPER_ADMIN')) {
      return true;
    }

    const params = request.params;
    const resourceId = params.id;
    if (!resourceId) {
      return true;
    }

    const path = request.route?.path || request.url;

    // Check Order ownership
    if (path.includes('orders') || path.includes('/orders/:id')) {
      return this.checkOrderOwnership(user.userId, resourceId);
    }

    // Check Ride ownership
    if (path.includes('rides') || path.includes('/rides/:id')) {
      return this.checkRideOwnership(user.userId, resourceId);
    }

    // Check Delivery Job ownership
    if (path.includes('jobs') || path.includes('/jobs/:id')) {
      return this.checkJobOwnership(user.userId, resourceId);
    }

    return true;
  }

  private async checkOrderOwnership(userId: string, orderId: string): Promise<boolean> {
    // An order can be accessed by its customer (user_id), merchant owner, or assigned delivery partner
    const res = await this.db.query(
      `SELECT so.id, og.customer_id, m.owner_id as merchant_owner_id, dj.assigned_partner_id, p.user_id as partner_user_id
       FROM sub_orders so
       JOIN order_groups og ON og.id = so.order_group_id
       JOIN outlets o ON o.id = so.outlet_id
       JOIN merchants m ON m.id = o.merchant_id
       LEFT JOIN delivery_jobs dj ON dj.id = so.delivery_job_id
       LEFT JOIN partners p ON p.id = dj.assigned_partner_id
       WHERE so.id = $1 OR so.sub_order_number = $1 OR og.id = $1;`,
      [orderId],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException(`Order not found: ${orderId}`);
    }

    const row = res.rows[0];
    const isOwner =
      row.customer_id === userId ||
      row.merchant_owner_id === userId ||
      row.partner_user_id === userId;

    if (!isOwner) {
      throw new ForbiddenException(
        'IDOR_PREVENTION: You do not have permission to access this order',
      );
    }

    return true;
  }

  private async checkRideOwnership(userId: string, rideId: string): Promise<boolean> {
    const res = await this.db.query(
      `SELECT r.id, r.customer_id, r.partner_id, p.user_id as driver_user_id
       FROM rides r
       LEFT JOIN partners p ON p.id = r.partner_id
       WHERE r.id = $1;`,
      [rideId],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException(`Ride not found: ${rideId}`);
    }

    const row = res.rows[0];
    const isOwner = row.customer_id === userId || row.driver_user_id === userId;

    if (!isOwner) {
      throw new ForbiddenException(
        'IDOR_PREVENTION: You do not have permission to access this ride',
      );
    }

    return true;
  }

  private async checkJobOwnership(userId: string, jobId: string): Promise<boolean> {
    const res = await this.db.query(
      `SELECT dj.id, dj.customer_id, dj.assigned_partner_id, p.user_id as partner_user_id, m.owner_id as merchant_owner_id
       FROM delivery_jobs dj
       JOIN outlets o ON o.id = dj.outlet_id
       JOIN merchants m ON m.id = o.merchant_id
       LEFT JOIN partners p ON p.id = dj.assigned_partner_id
       WHERE dj.id = $1;`,
      [jobId],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException(`Delivery job not found: ${jobId}`);
    }

    const row = res.rows[0];
    const isOwner =
      row.customer_id === userId ||
      row.partner_user_id === userId ||
      row.merchant_owner_id === userId;

    if (!isOwner) {
      throw new ForbiddenException(
        'IDOR_PREVENTION: You do not have permission to access this delivery job',
      );
    }

    return true;
  }
}
