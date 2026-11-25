import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CoordinatesDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;
}

export class QuoteParcelDto {
  @ValidateNested()
  @Type(() => CoordinatesDto)
  pickupLocation!: CoordinatesDto;

  @ValidateNested()
  @Type(() => CoordinatesDto)
  dropoffLocation!: CoordinatesDto;

  @IsString()
  @IsNotEmpty()
  packageCategory = 'GENERAL';

  @IsNumber()
  @Min(0.1)
  @Max(1500.0)
  weightKg = 1.0;

  @IsOptional()
  @IsString()
  vehicleType?: string = 'TWO_WHEELER';

  @IsOptional()
  @IsBoolean()
  isFragile?: boolean = false;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  lengthCm?: number = 20.0;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  widthCm?: number = 15.0;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  heightCm?: number = 10.0;

  @IsOptional()
  @IsString()
  serviceType = 'STANDARD';

  @IsOptional()
  @IsNumber()
  @Min(0)
  declaredValueInr?: number = 0.0;
}

export class CreateParcelBookingDto {
  @IsString()
  @IsNotEmpty()
  pickupAddress!: string;

  @ValidateNested()
  @Type(() => CoordinatesDto)
  pickupLocation!: CoordinatesDto;

  @IsString()
  @IsNotEmpty()
  pickupContactName!: string;

  @IsString()
  @IsNotEmpty()
  pickupContactPhone!: string;
  @IsString()
  @IsNotEmpty()
  dropoffAddress!: string;
  @ValidateNested()
  @Type(() => CoordinatesDto)
  dropoffLocation!: CoordinatesDto;
  @IsString()
  @IsNotEmpty()
  recipientName!: string;
  @IsString()
  @IsNotEmpty()
  recipientPhone!: string;
  @IsString()
  @IsNotEmpty()
  packageCategory = 'GENERAL';
  @IsOptional()
  @IsString()
  packageDescription?: string;
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  packageQuantity?: number = 1;
  @IsNumber()
  @Min(0.1)
  @Max(1500.0)
  weightKg = 1.0;

  @IsOptional()
  @IsString()
  vehicleType?: string = 'TWO_WHEELER';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  lengthCm?: number = 20.0;
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  widthCm?: number = 15.0;
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  heightCm?: number = 10.0;
  @IsOptional()
  @IsNumber()
  @Min(0)
  declaredValueInr?: number = 0.0;
  @IsOptional()
  @IsString()
  handlingInstructions?: string;
  @IsOptional()
  @IsBoolean()
  isFragile?: boolean = false;
  @IsOptional()
  @IsString()
  serviceType?: string = 'STANDARD';
  @IsOptional()
  @IsString()
  requestedPickupTime?: string;
  @IsOptional()
  @IsString()
  paymentMethod?: string = 'ONLINE';
}
export class PayParcelDto {
  @IsString()
  @IsNotEmpty()
  paymentMethod = 'ONLINE';
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
  @IsOptional()
  @IsString()
  gatewayPaymentId?: string;
  @IsOptional()
  @IsString()
  gatewaySignature?: string;
}
export class VerifyParcelOtpDto {
  @IsString()
  @IsNotEmpty()
  otp!: string;
}
export class FailedDeliveryAttemptDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
export class ReturnToSenderDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
export class ReassignParcelDto {
  @IsOptional()
  @IsString()
  partnerId?: string;
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
export class CancelParcelDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
export class UpdateRestrictionDto {
  @IsOptional()
  @IsBoolean()
  isPermitted?: boolean;
  @IsOptional()
  @IsBoolean()
  requiresReview?: boolean;
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxWeightKg?: number;
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxLengthCm?: number;
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxWidthCm?: number;
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxHeightCm?: number;
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDeclaredValueInr?: number;
  @IsOptional()
  @IsString()
  prohibitedReason?: string;
}
export class UpdateServiceConfigDto {
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(5.0)
  baseMultiplier?: number;
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(72.0)
  estimatedDeliveryHours?: number;
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  maxDistanceKm?: number;
  @IsOptional()
  @IsString()
  description?: string;
}
