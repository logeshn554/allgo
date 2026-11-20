import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, MaxLength, MinLength, IsEmail } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({
    description: 'Full display name of the user',
    example: 'Arun Kumar',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MinLength(1, { message: 'Full name cannot be empty' })
  @MaxLength(100, { message: 'Full name cannot exceed 100 characters' })
  fullName?: string;

  @ApiProperty({
    description: 'Preferred language code for the user',
    enum: ['en', 'ta', 'hi'],
    example: 'en',
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsIn(['en', 'ta', 'hi'], { message: 'Language must be one of: en, ta, hi' })
  defaultLanguage?: string;

  @ApiProperty({
    description: 'Email address of the user',
    example: 'user@allgo.in',
    required: false,
  })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsOptional()
  @MaxLength(255)
  email?: string;
}
