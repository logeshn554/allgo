import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitPartnerDocumentDto {
  @ApiProperty({ description: 'Document type (e.g. DRIVING_LICENSE, VEHICLE_RC, PAN)', example: 'DRIVING_LICENSE' })
  @IsString()
  @IsNotEmpty()
  documentType!: string;

  @ApiProperty({ description: 'Document identifying number if applicable (e.g. DL number)', required: false, example: 'TN0120200001234' })
  @IsString()
  @IsOptional()
  documentNumber?: string;

  @ApiProperty({ description: 'ID of the upload ticket containing verified binary file', example: 'd3b07384-d113-40e9-b3a6-80dbfa911765' })
  @IsUUID()
  @IsNotEmpty()
  ticketId!: string;
}
