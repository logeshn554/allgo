import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { DatabaseService } from '../../database/database.service.js';

@Controller('v1/admin/mobility')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminMobilityController {
  constructor(private readonly db: DatabaseService) {}

  @Get('stats')
  async getStats() {
    const ridesCount = await this.db.query(`SELECT COUNT(*)::int as count FROM rides;`);
    const completedRides = await this.db.query(`SELECT COUNT(*)::int as count FROM rides WHERE status = 'COMPLETED';`);
    const activeRides = await this.db.query(`SELECT COUNT(*)::int as count FROM rides WHERE status IN ('REQUESTED', 'ACCEPTED', 'ARRIVING', 'ARRIVED', 'IN_PROGRESS');`);
    const parcelsCount = await this.db.query(`SELECT COUNT(*)::int as count FROM parcels;`);
    const hireDriverCount = await this.db.query(`SELECT COUNT(*)::int as count FROM hire_driver_bookings;`);
    const openSosCount = await this.db.query(`SELECT COUNT(*)::int as count FROM mobility_sos_events WHERE status = 'TRIGGERED';`);

    return {
      totalRides: ridesCount.rows[0]?.count || 0,
      activeRides: activeRides.rows[0]?.count || 0,
      completedRides: completedRides.rows[0]?.count || 0,
      totalParcels: parcelsCount.rows[0]?.count || 0,
      totalHireDriverBookings: hireDriverCount.rows[0]?.count || 0,
      openSosAlerts: openSosCount.rows[0]?.count || 0,
    };
  }

  @Get('rides')
  async listRides(@Query('status') status?: string, @Query('limit') limit?: number) {
    const qLimit = limit ? Number(limit) : 50;
    const where = status ? `WHERE r.status = '${status}'` : '';
    const res = await this.db.query(`
      SELECT r.*, uc.full_name as customer_name, uc.phone as customer_phone,
             up.full_name as driver_name, up.phone as driver_phone
      FROM rides r
      JOIN users uc ON uc.id = r.customer_id
      LEFT JOIN partners p ON p.id = r.partner_id
      LEFT JOIN users up ON up.id = p.user_id
      ${where}
      ORDER BY r.created_at DESC LIMIT ${qLimit};
    `);
    return res.rows;
  }

  @Get('parcels')
  async listParcels(@Query('status') status?: string, @Query('limit') limit?: number) {
    const qLimit = limit ? Number(limit) : 50;
    const where = status ? `WHERE pcl.status = '${status}'` : '';
    const res = await this.db.query(`
      SELECT pcl.*, us.full_name as sender_name, us.phone as sender_phone,
             up.full_name as courier_name, up.phone as courier_phone
      FROM parcels pcl
      JOIN users us ON us.id = pcl.sender_id
      LEFT JOIN partners p ON p.id = pcl.partner_id
      LEFT JOIN users up ON up.id = p.user_id
      ${where}
      ORDER BY pcl.created_at DESC LIMIT ${qLimit};
    `);
    return res.rows;
  }

  @Get('sos')
  async listSosEvents(@Query('status') status?: string) {
    const where = status ? `WHERE s.status = '${status}'` : '';
    const res = await this.db.query(`
      SELECT s.*, r.ride_number, u.full_name as reporter_name, u.phone as reporter_phone
      FROM mobility_sos_events s
      JOIN rides r ON r.id = s.ride_id
      JOIN users u ON u.id = s.triggered_by_user_id
      ${where}
      ORDER BY s.created_at DESC;
    `);
    return res.rows;
  }

  @Post('sos/:id/resolve')
  async resolveSos(
    @Param('id') eventId: string,
    @Body() body: { notes?: string; status?: 'RESOLVED' | 'FALSE_ALARM' }
  ) {
    const status = body.status || 'RESOLVED';
    const res = await this.db.query(
      `UPDATE mobility_sos_events
       SET status = $1, resolution_notes = $2, resolved_at = NOW()
       WHERE id = $3 RETURNING *;`,
      [status, body.notes || 'Emergency verified and resolved by dispatcher', eventId]
    );
    return res.rows[0];
  }

  @Get('hire-driver')
  async listHireDriverBookings(@Query('status') status?: string, @Query('limit') limit?: number) {
    const qLimit = limit ? Number(limit) : 50;
    const where = status ? `WHERE b.status = '${status}'` : '';
    const res = await this.db.query(`
      SELECT b.*, uc.full_name as customer_name, uc.phone as customer_phone,
             up.full_name as driver_name, up.phone as driver_phone
      FROM hire_driver_bookings b
      JOIN users uc ON uc.id = b.customer_id
      LEFT JOIN partners p ON p.id = b.partner_id
      LEFT JOIN users up ON up.id = p.user_id
      ${where}
      ORDER BY b.created_at DESC LIMIT ${qLimit};
    `);
    return res.rows;
  }

  @Get('rides/:id')
  async getRideDetail(@Param('id') rideId: string) {
    const rideRes = await this.db.query(`
      SELECT r.*, uc.full_name as customer_name, uc.phone as customer_phone,
             up.full_name as driver_name, up.phone as driver_phone,
             v.registration_number, v.make_model
      FROM rides r
      JOIN users uc ON uc.id = r.customer_id
      LEFT JOIN partners p ON p.id = r.partner_id
      LEFT JOIN users up ON up.id = p.user_id
      LEFT JOIN vehicles v ON v.partner_id = p.id
      WHERE r.id = $1;
    `, [rideId]);

    const eventsRes = await this.db.query(`
      SELECT * FROM ride_events WHERE ride_id = $1 ORDER BY created_at ASC;
    `, [rideId]);

    const assignmentsRes = await this.db.query(`
      SELECT * FROM ride_assignments WHERE ride_id = $1 ORDER BY attempt_number ASC;
    `, [rideId]);

    return {
      ride: rideRes.rows[0] || null,
      events: eventsRes.rows,
      assignments: assignmentsRes.rows,
    };
  }

  @Get('hire-driver/:id')
  async getHireDriverDetail(@Param('id') bookingId: string) {
    const bRes = await this.db.query(`
      SELECT b.*, uc.full_name as customer_name, uc.phone as customer_phone,
             up.full_name as driver_name, up.phone as driver_phone
      FROM hire_driver_bookings b
      JOIN users uc ON uc.id = b.customer_id
      LEFT JOIN partners p ON p.id = b.partner_id
      LEFT JOIN users up ON up.id = p.user_id
      WHERE b.id = $1;
    `, [bookingId]);

    const eventsRes = await this.db.query(`
      SELECT * FROM hire_driver_events WHERE booking_id = $1 ORDER BY created_at ASC;
    `, [bookingId]);

    return {
      booking: bRes.rows[0] || null,
      events: eventsRes.rows,
    };
  }

  @Get('fares')
  async getFares() {
    const rideFares = await this.db.query('SELECT * FROM ride_fares_config ORDER BY vehicle_category;');
    const parcelFares = await this.db.query('SELECT * FROM parcel_fares_config ORDER BY package_category;');
    return {
      rideFares: rideFares.rows,
      parcelFares: parcelFares.rows,
    };
  }

  @Get('feature-flags')
  async listFeatureFlags() {
    const res = await this.db.query('SELECT * FROM mobility_feature_flags ORDER BY state_code ASC;');
    return res.rows;
  }

  @Post('feature-flags/:stateCode')
  async updateFeatureFlags(
    @Param('stateCode') stateCode: string,
    @Body() body: { ridesEnabled?: boolean; hireDriverEnabled?: boolean; bikeTaxiEnabled?: boolean }
  ) {
    const res = await this.db.query(
      `UPDATE mobility_feature_flags
       SET rides_enabled = COALESCE($1, rides_enabled),
           hire_driver_enabled = COALESCE($2, hire_driver_enabled),
           bike_taxi_enabled = COALESCE($3, bike_taxi_enabled),
           updated_at = NOW()
       WHERE state_code = $4 RETURNING *;`,
      [body.ridesEnabled, body.hireDriverEnabled, body.bikeTaxiEnabled, stateCode.toUpperCase()]
    );
    return res.rows[0];
  }
}
