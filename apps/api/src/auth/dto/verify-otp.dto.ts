import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, Matches, IsIn } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({
    description: 'Indian mobile number in E.164 format',
    example: '+919876543210',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+91[6-9]\d{9}$/, {
    message: 'Phone number must be a valid Indian mobile number in E.164 format',
  })
  phone!: string;

  @ApiProperty({
    description: 'Cryptographically generated 6-digit numeric OTP code',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, {
    message: 'OTP code must be a 6-digit numeric string',
  })
  code!: string;

  @ApiProperty({
    description: 'Device identifier for session tracking',
    required: false,
    example: 'dev_abc123xyz',
  })
  @IsString()
  @IsOptional()
  deviceId?: string;

  @ApiProperty({
    description: 'Client device operating platform',
    enum: ['ANDROID', 'IOS', 'WEB'],
    required: false,
    default: 'ANDROID',
  })
  @IsString()
  @IsOptional()
  @IsIn(['ANDROID', 'IOS', 'WEB'])
  platform?: 'ANDROID' | 'IOS' | 'WEB';
}
