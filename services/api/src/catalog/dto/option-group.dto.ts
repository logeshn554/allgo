import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateOptionGroupDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minSelections = 0;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxSelections = 1;

  @IsBoolean()
  @IsOptional()
  isRequired = false;

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
  priceInr = 0.0;

  @IsBoolean()
  @IsOptional()
  isAvailable = true;

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
