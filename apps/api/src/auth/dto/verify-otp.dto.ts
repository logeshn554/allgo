import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  phone!: string;
  code!: string;
  deviceId?: string;
  platform?: 'ANDROID' | 'IOS' | 'WEB';
}

ApiProperty({
  description: 'Indian mobile number in E.164 format',
  example: '+919876543210',
})(VerifyOtpDto.prototype, 'phone');

ApiProperty({
  description: 'Cryptographically generated 6-digit numeric OTP code',
  example: '123456',
})(VerifyOtpDto.prototype, 'code');

ApiProperty({
  description: 'Device identifier for session tracking',
  required: false,
  example: 'dev_abc123xyz',
})(VerifyOtpDto.prototype, 'deviceId');

ApiProperty({
  description: 'Client device operating platform',
  enum: ['ANDROID', 'IOS', 'WEB'],
  required: false,
  default: 'ANDROID',
})(VerifyOtpDto.prototype, 'platform');
