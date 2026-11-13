import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Rotatable refresh token issued during login',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;

  @ApiProperty({
    description: 'Device identifier',
    required: false,
  })
  @IsString()
  @IsOptional()
  deviceId?: string;
}
