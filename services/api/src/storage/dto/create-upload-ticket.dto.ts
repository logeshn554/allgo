import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class CreateUploadTicketDto {
  @ApiProperty({
    description: 'Target document type',
    example: 'DRIVING_LICENSE',
  })
  @IsString()
  @IsNotEmpty()
  documentType!: string;

  @ApiProperty({
    description: 'Declared MIME type (PDF, JPEG, or PNG)',
    enum: ['application/pdf', 'image/jpeg', 'image/png'],
    example: 'application/pdf',
  })
  @IsString()
  @IsIn(['application/pdf', 'image/jpeg', 'image/png'], {
    message: 'Allowed MIME types are application/pdf, image/jpeg, or image/png',
  })
  mimeType!: string;

  @ApiProperty({
    description: 'Declared file size in bytes (maximum 5 MB)',
    example: 1048576,
  })
  @IsInt()
  @Min(1, { message: 'File must not be empty' })
  @Max(5 * 1024 * 1024, { message: 'File size must not exceed 5 MB' })
  fileSizeBytes!: number;
}
