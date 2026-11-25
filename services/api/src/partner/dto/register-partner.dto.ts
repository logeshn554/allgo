import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterPartnerDto {
  @ApiProperty({ description: 'Primary vehicle type', example: 'MOTORCYCLE' })
  @IsString()
  @IsIn([
    'BICYCLE',
    'MOTORCYCLE',
    'SCOOTER',
    'AUTO_RICKSHAW',
    'CAB_SEDAN',
    'CAB_HATCHBACK',
    'CAB_SUV',
  ])
  vehicleType!: string;

  @ApiProperty({ description: 'Vehicle registration plate number', example: 'TN01AB1234' })
  @IsString()
  @IsNotEmpty()
  registrationNumber!: string;

  @ApiProperty({ description: 'Vehicle make and model', example: 'Honda Activa 6G' })
  @IsString()
  @IsNotEmpty()
  makeModel!: string;

  @ApiProperty({
    description: 'Bank account number (encrypted at rest)',
    example: '50100234567890',
  })
  @IsString()
  @IsNotEmpty()
  bankAccountNumber!: string;

  @ApiProperty({ description: 'Bank IFSC code', example: 'HDFC0001234' })
  @IsString()
  @IsNotEmpty()
  bankIfsc!: string;

  @ApiProperty({ description: 'Bank beneficiary name', example: 'Ravi Kumar' })
  @IsString()
  @IsNotEmpty()
  bankBeneficiaryName!: string;

  @ApiProperty({ description: 'Emergency contact name', required: false, example: 'Suresh Kumar' })
  @IsString()
  @IsOptional()
  emergencyContactName?: string;

  @ApiProperty({
    description: 'Emergency contact phone',
    required: false,
    example: '+919876543219',
  })
  @IsString()
  @IsOptional()
  emergencyContactPhone?: string;
}
