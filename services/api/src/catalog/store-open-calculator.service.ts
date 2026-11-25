import { Injectable, NotFoundException } from '@nestjs/common';
import { OperatingHoursRepository } from './data/operating-hours.repository.js';
import { WeeklyScheduleService } from './weekly-schedule.service.js';

@Injectable()
export class StoreOpenCalculatorService {
  constructor(
    private readonly hoursRepo: OperatingHoursRepository,
    private readonly scheduleService: WeeklyScheduleService,
  ) {}

  async calculateIsOpen(
    outletId: string,
    referenceDate: Date = new Date(),
  ): Promise<{
    isOpen: boolean;
    reason?: string;
    details?: string;
    timezone: string;
    currentInterval?: any;
    outletStatus: string;
  }> {
    const outlet = await this.hoursRepo.getOutletOperatingState(outletId);
    if (!outlet) throw new NotFoundException(`Outlet ${outletId} not found`);

    const timezone = outlet.timezone || 'Asia/Kolkata';

    if (outlet.merchant_status !== 'APPROVED' && outlet.merchant_status !== 'LIVE') {
      return {
        isOpen: false,
        reason: 'MERCHANT_NOT_APPROVED',
        timezone,
        outletStatus: outlet.outlet_status,
      };
    }
    if (outlet.outlet_status !== 'ACTIVE') {
      return {
        isOpen: false,
        reason: 'OUTLET_INACTIVE',
        timezone,
        outletStatus: outlet.outlet_status,
      };
    }

    if (outlet.is_temporarily_closed) {
      if (outlet.reopens_at && referenceDate >= new Date(outlet.reopens_at)) {
        await this.hoursRepo.autoLiftTemporaryClosure(outletId);
      } else {
        return {
          isOpen: false,
          reason: 'TEMPORARILY_CLOSED',
          details: outlet.temporary_closure_reason || 'Outlet temporarily closed',
          timezone,
          outletStatus: outlet.outlet_status,
        };
      }
    }

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      weekday: 'short',
    });

    const parts = formatter.formatToParts(referenceDate);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

    const yyyy = getPart('year');
    const mm = getPart('month');
    const dd = getPart('day');
    const localDateStr = `${yyyy}-${mm}-${dd}`;
    const localTimeStr = `${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
    const localSeconds = this.scheduleService.timeToSeconds(localTimeStr);

    const weekdayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    const todayDayOfWeek = weekdayMap[getPart('weekday')] ?? referenceDate.getDay();
    const yesterdayDayOfWeek = (todayDayOfWeek + 6) % 7;

    const specialRows = await this.hoursRepo.getSpecialClosuresForDate(outletId, localDateStr);
    if (specialRows.length > 0) {
      const sp = specialRows[0];
      if (sp.is_full_day) {
        return {
          isOpen: false,
          reason: 'SPECIAL_CLOSURE',
          details: sp.reason,
          timezone,
          outletStatus: outlet.outlet_status,
        };
      }
      if (sp.open_time && sp.close_time) {
        const spOpen = this.scheduleService.timeToSeconds(sp.open_time);
        const spClose = this.scheduleService.timeToSeconds(sp.close_time);
        if (localSeconds < spOpen || localSeconds > spClose) {
          return {
            isOpen: false,
            reason: 'SPECIAL_CLOSURE',
            details: `Special hours: ${sp.open_time} - ${sp.close_time} (${sp.reason})`,
            timezone,
            outletStatus: outlet.outlet_status,
          };
        }
      }
    }

    const hoursRows = await this.hoursRepo.getWeeklyHoursForDays(outletId, [
      todayDayOfWeek,
      yesterdayDayOfWeek,
    ]);
    if (hoursRows.length === 0) {
      return { isOpen: true, timezone, outletStatus: outlet.outlet_status };
    }

    const yesterdayIntervals = hoursRows.filter(
      (r: any) => Number(r.day_of_week) === yesterdayDayOfWeek,
    );
    for (const int of yesterdayIntervals) {
      if (int.is_overnight && !int.is_closed) {
        const closeSec = this.scheduleService.timeToSeconds(int.close_time);
        if (localSeconds <= closeSec) {
          return {
            isOpen: true,
            currentInterval: {
              dayOfWeek: yesterdayDayOfWeek,
              openTime: int.open_time,
              closeTime: int.close_time,
              isOvernight: true,
            },
            timezone,
            outletStatus: outlet.outlet_status,
          };
        }
      }
    }

    const todayIntervals = hoursRows.filter((r: any) => Number(r.day_of_week) === todayDayOfWeek);
    for (const int of todayIntervals) {
      if (int.is_closed) continue;

      const openSec = this.scheduleService.timeToSeconds(int.open_time);
      const closeSec = this.scheduleService.timeToSeconds(int.close_time);

      if (int.is_overnight) {
        if (localSeconds >= openSec) {
          return {
            isOpen: true,
            currentInterval: {
              dayOfWeek: todayDayOfWeek,
              openTime: int.open_time,
              closeTime: int.close_time,
              isOvernight: true,
            },
            timezone,
            outletStatus: outlet.outlet_status,
          };
        }
      } else {
        if (localSeconds >= openSec && localSeconds <= closeSec) {
          return {
            isOpen: true,
            currentInterval: {
              dayOfWeek: todayDayOfWeek,
              openTime: int.open_time,
              closeTime: int.close_time,
              isOvernight: false,
            },
            timezone,
            outletStatus: outlet.outlet_status,
          };
        }
      }
    }

    return {
      isOpen: false,
      reason: 'OUTSIDE_OPERATING_HOURS',
      details: 'Outlet is currently closed per weekly schedule',
      timezone,
      outletStatus: outlet.outlet_status,
    };
  }
}
