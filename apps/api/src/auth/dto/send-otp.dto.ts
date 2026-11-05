import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  phone!: string;
  deviceId?: string;
}

ApiProperty({
  description: 'Indian mobile number in E.164 format (+91 followed by 10 digits starting with 6-9)',
  example: '+919876543210',
})(SendOtpDto.prototype, 'phone');

ApiProperty({
  description: 'Optional device identifier for fraud prevention',
  required: false,
  example: 'dev_abc123xyz',
})(SendOtpDto.prototype, 'deviceId');
