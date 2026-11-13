import { IsString, IsNotEmpty, IsOptional, IsIn, IsNumber, Min, Max, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterMerchantDto {
  @ApiProperty({ example: 'Anjappar Chettinad Restaurant', description: 'Commercial business trade name' })
  @IsString()
  @IsNotEmpty()
  businessName!: string;

  @ApiProperty({ example: 'RESTAURANT', enum: ['RESTAURANT', 'CLOUD_KITCHEN', 'GROCERY_STORE', 'DARK_STORE', 'HOME_SELLER'] })
  @IsString()
  @IsIn(['RESTAURANT', 'CLOUD_KITCHEN', 'GROCERY_STORE', 'DARK_STORE', 'HOME_SELLER'])
  merchantType!: string;

  @ApiProperty({ example: 'ABCDE1234F', description: '10-character PAN number' })
  @IsString()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, { message: 'Invalid Indian PAN format' })
  panNumber!: string;

  @ApiProperty({ example: '33AABCA1234A1Z5', description: '15-character GSTIN number', required: false })
  @IsString()
  @IsOptional()
  gstin?: string;

  @ApiProperty({ example: '12423001000123', description: '14-digit FSSAI License', required: false })
  @IsString()
  @IsOptional()
  fssaiLicenseNumber?: string;

  @ApiProperty({ example: '50100234567890', description: 'Bank settlement account number' })
  @IsString()
  @IsNotEmpty()
  bankAccountNumber!: string;

  @ApiProperty({ example: 'HDFC0001234', description: '11-character Indian IFSC code' })
  @IsString()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, { message: 'Invalid Indian Bank IFSC format' })
  bankIfsc!: string;

  @ApiProperty({ example: 'Anjappar Chettinad Pvt Ltd', description: 'Bank account beneficiary name' })
  @IsString()
  @IsNotEmpty()
  bankBeneficiaryName!: string;

  @ApiProperty({ example: 'Anjappar Anna Nagar Outlet', description: 'Initial outlet name' })
  @IsString()
  @IsNotEmpty()
  outletName!: string;

  @ApiProperty({ example: 'No 12, 2nd Avenue, Anna Nagar', description: 'Address line 1' })
  @IsString()
  @IsNotEmpty()
  addressLine1!: string;

  @ApiProperty({ example: 'Near Roundtana', description: 'Address line 2', required: false })
  @IsString()
  @IsOptional()
  addressLine2?: string;

  @ApiProperty({ example: '600040', description: '6-digit Indian PIN code' })
  @IsString()
  @Matches(/^[1-9][0-9]{5}$/, { message: 'Invalid 6-digit Indian Postal Code' })
  postalCode!: string;

  @ApiProperty({ example: 13.0850, description: 'Latitude coordinate' })
  @IsNumber()
  latitude!: number;

  @ApiProperty({ example: 80.2101, description: 'Longitude coordinate' })
  @IsNumber()
  longitude!: number;

  @ApiProperty({ example: '+919876543210', description: 'Outlet contact phone number' })
  @IsString()
  @Matches(/^\+91[6-9]\d{9}$/, { message: 'Invalid Indian mobile number format (+91 followed by 10 digits)' })
  phone!: string;

  @ApiProperty({ example: 15, description: 'Default preparation time in minutes' })
  @IsNumber()
  @Min(5)
  @Max(120)
  defaultPrepTimeMinutes!: number;

  @ApiProperty({ example: 10.00, description: 'Packaging charge in INR' })
  @IsNumber()
  @Min(0)
  packagingFeeInr!: number;
}
