export interface SelectedOptionInput {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceInr: number;
}

export class AddToCartDto {
  outletId!: string;
  itemId!: string;
  variantId?: string;
  quantity!: number;
  selectedOptions?: SelectedOptionInput[];
  specialInstructions?: string;
  replaceCartIfDifferentOutlet?: boolean;
}

export class UpdateCartItemDto {
  quantity!: number;
  selectedOptions?: SelectedOptionInput[];
  specialInstructions?: string;
}

export class CheckoutEstimateDto {
  deliveryAddressId?: string;
  dropoffLocation?: { latitude: number; longitude: number };
  couponCode?: string;
}

export class PlaceOrderDto {
  deliveryAddressId!: string;
  paymentMethod!: 'COD' | 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET';
  couponCode?: string;
  deliveryInstructions?: string;
  customerNotes?: string;
  idempotencyKey?: string;
  scheduledFor?: string;
}

export class MerchantAcceptOrderDto {
  prepTimeMinutes?: number;
}

export class MerchantRejectOrderDto {
  reason!: string;
}

export class CancelOrderDto {
  reason!: string;
}

export class CreateAddressDto {
  label?: string;
  recipientName!: string;
  recipientPhone!: string;
  addressLine1!: string;
  addressLine2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  postalCode!: string;
  latitude!: number;
  longitude!: number;
  isDefault?: boolean;
}

export class UpdateAddressDto {
  label?: string;
  recipientName?: string;
  recipientPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

export class ApplyCouponDto {
  couponCode!: string;
}

export class CreateCouponDto {
  code!: string;
  verticalType?: 'FOOD' | 'GROCERY' | 'PARCEL' | 'RIDE' | 'HIRE_DRIVER' | 'HOME_MADE';
  title?: string;
  outletId?: string;
  categoryId?: string;
  isAutoApplied?: boolean;
  newCustomerOnly?: boolean;
  maxTotalRedemptions?: number;
  discountPercentage?: number;
  flatDiscountInr?: number;
  minOrderAmountInr!: number;
  maxDiscountInr?: number;
  usageLimitPerUser?: number;
  validFrom?: string;
  validUntil!: string;
  isActive?: boolean;
}

export class VerifyPaymentDto {
  paymentId!: string;
  gatewayPaymentId!: string;
  gatewaySignature!: string;
}

export class PaymentWebhookDto {
  event!: string;
  payload!: any;
}
