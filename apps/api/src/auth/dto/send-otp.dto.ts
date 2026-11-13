import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class SendOtpDto {
  @ApiProperty({
    description: 'Indian mobile number in E.164 format (+91 followed by 10 digits starting with 6-9)',
    example: '+919876543210',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+91[6-9]\d{9}$/, {
    message: 'Phone number must be a valid Indian mobile number in E.164 format (+91 followed by 10 digits starting with 6-9)',
  })
  phone!: string;

  @ApiProperty({
    description: 'Optional device identifier for fraud prevention',
    required: false,
    example: 'dev_abc123xyz',
  })
  @IsString()
  @IsOptional()
  deviceId?: string;
}
