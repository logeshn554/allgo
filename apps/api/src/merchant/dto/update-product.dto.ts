import { IsString, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiProperty({ example: 'Chettinad Special Chicken Biryani', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Updated spicy recipe', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 340.00, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  basePriceInr?: number;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isVeg?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

