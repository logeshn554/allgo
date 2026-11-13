import { IsBoolean, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOutletStatusDto {
  @ApiProperty({ example: true, description: 'Store open/closed availability toggle' })
  @IsBoolean()
  isOpen!: boolean;

  @ApiProperty({ example: 20, description: 'Updated default prep time in minutes', required: false })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(120)
  defaultPrepTimeMinutes?: number;
}
