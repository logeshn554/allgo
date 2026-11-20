import { IsBoolean, IsOptional, IsNumber, IsString, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOutletStatusDto {
  @ApiProperty({ example: true, description: 'Store open/closed availability toggle', required: false })
  @IsOptional()
  @IsBoolean()
  isOpen?: boolean;

  @ApiProperty({ example: 20, description: 'Updated default prep time in minutes', required: false })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(120)
  defaultPrepTimeMinutes?: number;

  @ApiProperty({ example: 'https://cdn.allgo.in/stores/logo.png', description: 'Store logo image URL', required: false })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiProperty({ example: 'https://cdn.allgo.in/stores/cover.png', description: 'Store cover banner image URL', required: false })
  @IsOptional()
  @IsString()
  coverPhotoUrl?: string;
}
