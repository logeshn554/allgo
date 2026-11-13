import { IsOptional, IsNumber, IsBoolean, Min, IsArray, IsUUID } from 'class-validator';

export class SetOutletOverrideDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  customPriceInr?: number;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}

export class BulkAssignOutletsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  outletIds!: string[];

  @IsNumber()
  @Min(0)
  @IsOptional()
  customPriceInr?: number;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}

export class UpdateStockDto {
  @IsNumber()
  @Min(0)
  stockQuantity!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  lowStockThreshold?: number;
}
