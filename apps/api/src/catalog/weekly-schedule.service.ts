import { Injectable, BadRequestException } from '@nestjs/common';
import { OperatingHoursRepository } from './data/operating-hours.repository.js';
import { OperatingHourInterval } from './dto/operating-hours.dto.js';

@Injectable()
export class WeeklyScheduleService {
  constructor(private readonly hoursRepo: OperatingHoursRepository) {}

  normalizeTime(t: string): string {
    const parts = t.trim().split(':');
    if (parts.length === 2 && parts[0] !== undefined && parts[1] !== undefined) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
    }
    if (parts.length === 3 && parts[0] !== undefined && parts[1] !== undefined && parts[2] !== undefined) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
    }
    throw new BadRequestException(`Invalid time format: ${t}. Expected HH:MM or HH:MM:SS.`);
  }

  timeToSeconds(t: string): number {
    const parts = t.split(':').map(Number);
    const h = parts[0] ?? 0;
    const m = parts[1] ?? 0;
    const s = parts[2] ?? 0;
    return h * 3600 + m * 60 + s;
  }

  async getWeeklyHours(outletId: string): Promise<any[]> {
    const rows = await this.hoursRepo.getWeeklyHours(outletId);
    return rows.map((r: any) => ({
      id: r.id,
      outletId: r.outlet_id,
      dayOfWeek: Number(r.day_of_week),
      openTime: r.open_time,
      closeTime: r.close_time,
      isOvernight: Boolean(r.is_overnight),
      isClosed: Boolean(r.is_closed),
    }));
  }

  async setWeeklyHours(outletId: string, intervals: OperatingHourInterval[]): Promise<any[]> {
    if (!Array.isArray(intervals)) {
      throw new BadRequestException('Intervals must be an array');
    }

    const normalized: { dayOfWeek: number; openTime: string; closeTime: string; isOvernight: boolean; isClosed: boolean }[] = [];
    const dayIntervalsMap = new Map<number, { startSec: number; endSec: number }[]>();

    for (const item of intervals) {
      if (item.dayOfWeek === undefined || item.dayOfWeek < 0 || item.dayOfWeek > 6) {
        throw new BadRequestException(`Invalid day of week: ${item.dayOfWeek}. Must be between 0 (Sunday) and 6 (Saturday).`);
      }

      if (item.isClosed) {
        normalized.push({
          dayOfWeek: item.dayOfWeek,
          openTime: '00:00:00',
          closeTime: '00:00:00',
          isOvernight: false,
          isClosed: true,
        });
        continue;
      }

      const openTime = this.normalizeTime(item.openTime);
      const closeTime = this.normalizeTime(item.closeTime);

      const openSec = this.timeToSeconds(openTime);
      const closeSec = this.timeToSeconds(closeTime);

      const isOvernight = item.isOvernight ?? (closeSec < openSec);
      const existing = dayIntervalsMap.get(item.dayOfWeek) || [];
      const endSecForDay = isOvernight ? closeSec + 86400 : closeSec;

      for (const ex of existing) {
        if (Math.max(openSec, ex.startSec) < Math.min(endSecForDay, ex.endSec)) {
          throw new BadRequestException(
            `Overlapping operating hours detected for day ${item.dayOfWeek}: ${openTime}-${closeTime} conflicts with an existing interval.`
          );
        }
      }

      existing.push({ startSec: openSec, endSec: endSecForDay });
      dayIntervalsMap.set(item.dayOfWeek, existing);

      normalized.push({
        dayOfWeek: item.dayOfWeek,
        openTime,
        closeTime,
        isOvernight,
        isClosed: false,
      });
    }

    await this.hoursRepo.replaceWeeklyHours(outletId, normalized);
    return this.getWeeklyHours(outletId);
  }
}
