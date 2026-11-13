import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsIn,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LocationCoordinatesDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;
}

export class CreateDeliveryJobDto {
  @IsUUID('4')
  outletId!: string;

  @IsUUID('4')
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  pickupAddress!: string;

  @ValidateNested()
  @Type(() => LocationCoordinatesDto)
  pickupLocation!: LocationCoordinatesDto;

  @IsString()
  pickupContactPhone!: string;

  @IsString()
  dropoffAddress!: string;

  @ValidateNested()
  @Type(() => LocationCoordinatesDto)
  dropoffLocation!: LocationCoordinatesDto;

  @IsString()
  dropoffContactPhone!: string;

  @IsString()
  @IsIn(['FOOD', 'GROCERY'])
  @IsOptional()
  verticalType?: 'FOOD' | 'GROCERY';

  @IsNumber()
  @Min(1)
  @IsOptional()
  estimatedPrepTimeMinutes?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  courierFeeInr?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  surgeFeeInr?: number;

  @IsArray()
  @IsOptional()
  itemsSnapshot?: any[];
}

export class PartnerLocationUpdateDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsNumber()
  @IsOptional()
  heading?: number;

  @IsNumber()
  @IsOptional()
  speedMps?: number;

  @IsNumber()
  @IsOptional()
  accuracyMeters?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  batteryPercentage?: number;

  @IsOptional()
  isMockProvider?: boolean;

  @IsString()
  @IsOptional()
  recordedAt?: string;
}

export class CompleteDeliveryDto {
  @IsString()
  @IsOptional()
  deliveryPin?: string;

  @IsString()
  @IsIn(['PIN', 'PHOTO', 'SIGNATURE', 'OTP'])
  @IsOptional()
  proofType?: string;

  @IsString()
  @IsOptional()
  photoStorageKey?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;
}

export class VerifyHandoverDto {
  @IsString()
  handoverOtp!: string;
}

export class CancelDeliveryDto {
  @IsString()
  reasonCode!: string;

  @IsString()
  @IsOptional()
  reasonDetails?: string;
}

export class ReportExceptionDto {
  @IsString()
  @IsIn([
    'NO_PARTNER_FOUND',
    'MERCHANT_UNRESPONSIVE',
    'CUSTOMER_UNREACHABLE',
    'ACCIDENT_EMERGENCY',
    'WRONG_ADDRESS',
    'ITEM_DAMAGED',
    'WEATHER_HALT',
  ])
  exceptionType!: string;

  @IsString()
  details!: string;
}

export class RejectOfferDto {
  @IsString()
  @IsOptional()
  reason?: string;
}

export class ManualAssignDto {
  @IsUUID('4')
  partnerId!: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
