import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitMerchantDocumentDto {
  @ApiProperty({ description: 'Document type (FSSAI_LICENSE, GSTIN_CERTIFICATE, PAN_CARD, SHOP_ESTABLISHMENT)', example: 'FSSAI_LICENSE' })
  @IsString()
  @IsNotEmpty()
  documentType!: string;

  @ApiProperty({ description: 'Official document registration or license number', required: false, example: '12423001000123' })
  @IsString()
  @IsOptional()
  documentNumber?: string;

  @ApiProperty({ description: 'ID of upload ticket containing verified file', example: 'c4e320d1-6789-4bc2-9901-789012345678' })
  @IsUUID()
  @IsNotEmpty()
  ticketId!: string;
}
