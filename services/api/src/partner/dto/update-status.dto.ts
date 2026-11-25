import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdatePartnerStatusDto {
  @ApiProperty({
    description: 'New partner lifecycle status',
    enum: ['APPROVED', 'REJECTED', 'DOCUMENTS_REQUIRED', 'ACTIVE', 'SUSPENDED', 'BLOCKED'],
    example: 'APPROVED',
  })
  @IsString()
  @IsIn(['APPROVED', 'REJECTED', 'DOCUMENTS_REQUIRED', 'ACTIVE', 'SUSPENDED', 'BLOCKED'])
  status!: string;

  @ApiProperty({
    description: 'Review notes or reason for status change',
    required: false,
    example: 'All documents verified successfully',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class UpdateServiceStatusDto {
  @ApiProperty({
    description: 'New service application status',
    enum: ['APPROVED', 'REJECTED', 'DOCUMENTS_REQUIRED', 'SUSPENDED'],
    example: 'APPROVED',
  })
  @IsString()
  @IsIn(['APPROVED', 'REJECTED', 'DOCUMENTS_REQUIRED', 'SUSPENDED'])
  status!: string;

  @ApiProperty({ description: 'Review notes or reason for rejection/suspension', required: false })
  @IsString()
  @IsOptional()
  reason?: string;
}
