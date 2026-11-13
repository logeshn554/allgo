import { IsArray, IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export interface OperatingHourInterval {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  openTime: string;  // "09:00:00" or "09:00"
  closeTime: string; // "23:00:00" or "02:00" (overnight)
  isOvernight?: boolean;
  isClosed?: boolean;
}

export class SetWeeklyHoursDto {
  @IsArray()
  intervals!: OperatingHourInterval[];
}

export class AddSpecialClosureDto {
  @IsString()
  @IsNotEmpty()
  closureDate!: string; // "YYYY-MM-DD"

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsBoolean()
  @IsOptional()
  isFullDay: boolean = true;

  @IsString()
  @IsOptional()
  openTime?: string;

  @IsString()
  @IsOptional()
  closeTime?: string;
}

export class ToggleTemporaryClosureDto {
  @IsBoolean()
  isTemporarilyClosed!: boolean;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  reopensAt?: string; // ISO 8601 string
}
