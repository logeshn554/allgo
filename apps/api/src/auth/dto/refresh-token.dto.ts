import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  refreshToken!: string;
  deviceId?: string;
}

ApiProperty({
  description: 'Rotatable refresh token issued during login',
})(RefreshTokenDto.prototype, 'refreshToken');

ApiProperty({
  description: 'Device identifier',
  required: false,
})(RefreshTokenDto.prototype, 'deviceId');
