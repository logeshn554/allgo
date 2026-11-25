import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OperatingHoursRepository } from './data/operating-hours.repository.js';
import { AddSpecialClosureDto, ToggleTemporaryClosureDto } from './dto/operating-hours.dto.js';
import { WeeklyScheduleService } from './weekly-schedule.service.js';

@Injectable()
export class SpecialClosuresService {
  constructor(
    private readonly hoursRepo: OperatingHoursRepository,
    private readonly scheduleService: WeeklyScheduleService,
  ) {}

  async getSpecialClosures(outletId: string): Promise<any[]> {
    const rows = await this.hoursRepo.getSpecialClosures(outletId);
    return rows.map((r: any) => ({
      id: r.id,
      outletId: r.outlet_id,
      closureDate:
        r.closure_date instanceof Date
          ? r.closure_date.toISOString().split('T')[0]
          : String(r.closure_date),
      reason: r.reason,
      isFullDay: Boolean(r.is_full_day),
      openTime: r.open_time,
      closeTime: r.close_time,
    }));
  }

  async addSpecialClosure(outletId: string, dto: AddSpecialClosureDto): Promise<any> {
    if (!dto.closureDate || !/^\d{4}-\d{2}-\d{2}$/.test(dto.closureDate)) {
      throw new BadRequestException('closureDate must be formatted as YYYY-MM-DD');
    }
    if (!dto.reason || dto.reason.trim().length === 0) {
      throw new BadRequestException('Closure reason is required');
    }

    const openTime = dto.openTime ? this.scheduleService.normalizeTime(dto.openTime) : null;
    const closeTime = dto.closeTime ? this.scheduleService.normalizeTime(dto.closeTime) : null;

    return this.hoursRepo.insertSpecialClosure(outletId, dto, openTime, closeTime);
  }

  async deleteSpecialClosure(outletId: string, closureId: string): Promise<{ success: boolean }> {
    const success = await this.hoursRepo.deleteSpecialClosure(outletId, closureId);
    if (!success) throw new NotFoundException('Special closure not found');
    return { success: true };
  }

  async toggleTemporaryClosure(outletId: string, dto: ToggleTemporaryClosureDto): Promise<any> {
    const reopensAt = dto.reopensAt ? new Date(dto.reopensAt) : null;
    return this.hoursRepo.updateTemporaryClosure(outletId, dto, reopensAt);
  }
}
