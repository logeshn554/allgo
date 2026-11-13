import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOutletDto {
  @ApiProperty({ description: 'Outlet or branch display name', example: 'Anjappar T Nagar Branch' })
  @IsString()
  @IsNotEmpty()
  outletName!: string;

  @ApiProperty({ description: 'Primary address line', example: 'No 45, Usman Road' })
  @IsString()
  @IsNotEmpty()
  addressLine1!: string;

  @ApiProperty({ description: 'Secondary address line', required: false, example: 'Opposite Panagal Park' })
  @IsString()
  @IsOptional()
  addressLine2?: string;

  @ApiProperty({ description: '6-digit Indian Postal PIN code', example: '600017' })
  @IsString()
  @IsNotEmpty()
  postalCode!: string;

  @ApiProperty({ description: 'Outlet latitude coordinate', example: 13.0405 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({ description: 'Outlet longitude coordinate', example: 80.2337 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @ApiProperty({ description: 'Direct contact phone for outlet dispatcher/manager', example: '+919876543212' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ description: 'Default preparation time in minutes', default: 15, example: 20 })
  @IsNumber()
  @IsOptional()
  defaultPrepTimeMinutes?: number;

  @ApiProperty({ description: 'Packaging fee in INR', default: 10.0, example: 15.0 })
  @IsNumber()
  @IsOptional()
  packagingFeeInr?: number;
}
