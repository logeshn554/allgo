import { IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateInventoryDto {
  @ApiProperty({ example: 45, description: 'Updated stock quantity on hand', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @ApiProperty({ example: true, description: 'In-stock availability toggle', required: false })
  @IsOptional()
  @IsBoolean()
  isInStock?: boolean;

  @ApiProperty({ example: 10, description: 'Threshold for low-stock warnings', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockThreshold?: number;
}

