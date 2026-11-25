import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateOrderStatusDto {
  @ApiProperty({
    example: 'MERCHANT_ACCEPTED',
    enum: ['MERCHANT_ACCEPTED', 'PREPARING', 'READY', 'REJECTED', 'CANCELLED'],
    description: 'Target lifecycle status transition',
  })
  @IsString()
  @IsIn(['MERCHANT_ACCEPTED', 'PREPARING', 'READY', 'REJECTED', 'CANCELLED'])
  status!: string;

  @ApiProperty({
    example: 25,
    description: 'Committed preparation time in minutes',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(120)
  prepTimeMinutes?: number;

  @ApiProperty({
    example: 'Item out of stock / kitchen closing',
    description: 'Reason for rejection/cancellation',
    required: false,
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
