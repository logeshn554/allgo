import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { AddSpecialClosureDto, ToggleTemporaryClosureDto } from '../dto/operating-hours.dto.js';

@Injectable()
export class OperatingHoursRepository {
  constructor(private readonly db: DatabaseService) {}

  async getWeeklyHours(outletId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT id, outlet_id, day_of_week, open_time, close_time, is_overnight, is_closed
       FROM outlet_operating_hours
       WHERE outlet_id = $1
       ORDER BY day_of_week ASC, open_time ASC;`,
      [outletId]
    );
    return res.rows;
  }

  async replaceWeeklyHours(outletId: string, normalized: any[]): Promise<void> {
    await this.db.query('DELETE FROM outlet_operating_hours WHERE outlet_id = $1;', [outletId]);

    for (const n of normalized) {
      await this.db.query(
        `INSERT INTO outlet_operating_hours (outlet_id, day_of_week, open_time, close_time, is_overnight, is_closed)
         VALUES ($1, $2, $3, $4, $5, $6);`,
        [outletId, n.dayOfWeek, n.openTime, n.closeTime, n.isOvernight, n.isClosed]
      );
    }
  }

  async getSpecialClosures(outletId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT id, outlet_id, closure_date, reason, is_full_day, open_time, close_time
       FROM outlet_special_closures
       WHERE outlet_id = $1
       ORDER BY closure_date ASC;`,
      [outletId]
    );
    return res.rows;
  }

  async insertSpecialClosure(outletId: string, dto: AddSpecialClosureDto, openTime: string | null, closeTime: string | null): Promise<any> {
    const res = await this.db.query(
      `INSERT INTO outlet_special_closures (outlet_id, closure_date, reason, is_full_day, open_time, close_time)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (outlet_id, closure_date) DO UPDATE
       SET reason = $3, is_full_day = $4, open_time = $5, close_time = $6
       RETURNING *;`,
      [outletId, dto.closureDate, dto.reason.trim(), dto.isFullDay, openTime, closeTime]
    );
    return res.rows[0];
  }

  async deleteSpecialClosure(outletId: string, closureId: string): Promise<boolean> {
    const res = await this.db.query(
      'DELETE FROM outlet_special_closures WHERE id = $1 AND outlet_id = $2 RETURNING id;',
      [closureId, outletId]
    );
    return res.rows.length > 0;
  }

  async updateTemporaryClosure(outletId: string, dto: ToggleTemporaryClosureDto, reopensAt: Date | null): Promise<any> {
    const res = await this.db.query(
      `UPDATE outlets
       SET is_temporarily_closed = $1,
           temporary_closure_reason = $2,
           reopens_at = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, outlet_name, is_temporarily_closed, temporary_closure_reason, reopens_at;`,
      [dto.isTemporarilyClosed, dto.reason || null, reopensAt, outletId]
    );
    if (res.rows.length === 0) throw new NotFoundException(`Outlet ${outletId} not found`);
    return res.rows[0];
  }

  async getOutletOperatingState(outletId: string): Promise<any> {
    const res = await this.db.query(
      `SELECT o.id, o.outlet_status, o.timezone, o.is_temporarily_closed, o.temporary_closure_reason, o.reopens_at,
              m.status as merchant_status
       FROM outlets o
       JOIN merchants m ON m.id = o.merchant_id
       WHERE o.id = $1;`,
      [outletId]
    );
    return res.rows[0] || null;
  }

  async autoLiftTemporaryClosure(outletId: string): Promise<void> {
    await this.db.query(
      'UPDATE outlets SET is_temporarily_closed = FALSE, temporary_closure_reason = NULL, reopens_at = NULL WHERE id = $1;',
      [outletId]
    );
  }

  async getSpecialClosuresForDate(outletId: string, localDateStr: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT * FROM outlet_special_closures WHERE outlet_id = $1 AND closure_date = $2;`,
      [outletId, localDateStr]
    );
    return res.rows;
  }

  async getWeeklyHoursForDays(outletId: string, days: number[]): Promise<any[]> {
    const res = await this.db.query(
      `SELECT * FROM outlet_operating_hours
       WHERE outlet_id = $1 AND day_of_week IN ($2, $3)
       ORDER BY day_of_week, open_time;`,
      [outletId, days[0], days[1]]
    );
    return res.rows;
  }
}
