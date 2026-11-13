import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsIn, Min } from 'class-validator';

export class CreateVariantDto {
  @IsString()
  @IsNotEmpty()
  variantName!: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  additionalPriceInr: number = 0.00;

  @IsNumber()
  @Min(0)
  @IsOptional()
  salePriceInr?: number;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  @IsIn(['SIZE', 'WEIGHT', 'PORTION', 'QUANTITY', 'OTHER'])
  variantType: 'SIZE' | 'WEIGHT' | 'PORTION' | 'QUANTITY' | 'OTHER' = 'SIZE';

  @IsNumber()
  @IsOptional()
  displayOrder?: number;

  @IsBoolean()
  @IsOptional()
  isAvailable: boolean = true;
}

export class UpdateVariantDto {
  @IsString()
  @IsOptional()
  variantName?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  additionalPriceInr?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  salePriceInr?: number;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  @IsIn(['SIZE', 'WEIGHT', 'PORTION', 'QUANTITY', 'OTHER'])
  variantType?: 'SIZE' | 'WEIGHT' | 'PORTION' | 'QUANTITY' | 'OTHER';

  @IsNumber()
  @IsOptional()
  displayOrder?: number;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}
