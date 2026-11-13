import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { OperatingHoursRepository } from './data/operating-hours.repository.js';
import { WeeklyScheduleService } from './weekly-schedule.service.js';
import { SpecialClosuresService } from './special-closures.service.js';
import { StoreOpenCalculatorService } from './store-open-calculator.service.js';
import { OperatingHourInterval, AddSpecialClosureDto, ToggleTemporaryClosureDto } from './dto/operating-hours.dto.js';

@Injectable()
export class OperatingHoursService {
  private readonly logger = new Logger(OperatingHoursService.name);
  private readonly scheduleService: WeeklyScheduleService;
  private readonly closuresService: SpecialClosuresService;
  private readonly calculatorService: StoreOpenCalculatorService;

  constructor(
    private readonly db: DatabaseService,
    scheduleService?: WeeklyScheduleService,
    closuresService?: SpecialClosuresService,
    calculatorService?: StoreOpenCalculatorService,
  ) {
    if (scheduleService && closuresService && calculatorService) {
      this.scheduleService = scheduleService;
      this.closuresService = closuresService;
      this.calculatorService = calculatorService;
    } else {
      const repo = new OperatingHoursRepository(db);
      this.scheduleService = scheduleService || new WeeklyScheduleService(repo);
      this.closuresService = closuresService || new SpecialClosuresService(repo, this.scheduleService);
      this.calculatorService = calculatorService || new StoreOpenCalculatorService(repo, this.scheduleService);
    }
  }

  async getWeeklyHours(outletId: string): Promise<any[]> {
    return this.scheduleService.getWeeklyHours(outletId);
  }

  async setWeeklyHours(outletId: string, intervals: OperatingHourInterval[]): Promise<any[]> {
    return this.scheduleService.setWeeklyHours(outletId, intervals);
  }

  async getSpecialClosures(outletId: string): Promise<any[]> {
    return this.closuresService.getSpecialClosures(outletId);
  }

  async addSpecialClosure(outletId: string, dto: AddSpecialClosureDto): Promise<any> {
    return this.closuresService.addSpecialClosure(outletId, dto);
  }

  async deleteSpecialClosure(outletId: string, closureId: string): Promise<{ success: boolean }> {
    return this.closuresService.deleteSpecialClosure(outletId, closureId);
  }

  async toggleTemporaryClosure(outletId: string, dto: ToggleTemporaryClosureDto): Promise<any> {
    return this.closuresService.toggleTemporaryClosure(outletId, dto);
  }

  async calculateIsOpen(outletId: string, referenceDate: Date = new Date()): Promise<{
    isOpen: boolean;
    reason?: string;
    details?: string;
    timezone: string;
    currentInterval?: any;
    outletStatus: string;
  }> {
    return this.calculatorService.calculateIsOpen(outletId, referenceDate);
  }
}
