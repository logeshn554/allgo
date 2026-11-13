import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';

export class CreateOptionGroupDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minSelections: number = 0;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxSelections: number = 1;

  @IsBoolean()
  @IsOptional()
  isRequired: boolean = false;

  @IsNumber()
  @IsOptional()
  displayOrder?: number;
}

export class UpdateOptionGroupDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minSelections?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxSelections?: number;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsNumber()
  @IsOptional()
  displayOrder?: number;
}

export class CreateOptionDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  priceInr: number = 0.00;

  @IsBoolean()
  @IsOptional()
  isAvailable: boolean = true;

  @IsNumber()
  @IsOptional()
  displayOrder?: number;
}

export class UpdateOptionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  priceInr?: number;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @IsNumber()
  @IsOptional()
  displayOrder?: number;
}
