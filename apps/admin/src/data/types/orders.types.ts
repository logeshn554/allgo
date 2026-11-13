export interface AdminOrderSummary {
  id: string;
  orderNumber?: string;
  sub_order_number?: string;
  order_group_number?: string;
  customerId?: string;
  outlet_name?: string;
  business_name?: string;
  customer_name?: string;
  customer_phone?: string;
  status: string;
  verticalType?: string;
  totalAmountInr?: number;
  total_payable_inr?: number;
  items_total_inr?: number;
  createdAt?: string;
  created_at?: string;
}

export interface AdminOrderItem {
  quantity: number;
  itemName?: string;
  item_name_snapshot?: string;
  customizations?: { option_name_snapshot: string }[];
  totalPriceInr?: number;
  total_price_inr?: number;
}

export interface AdminOrderPricing {
  itemsSubtotalInr?: number;
  items_total_inr?: number;
  deliveryFeeInr?: number;
  delivery_fee_inr?: number;
  packagingFeeInr?: number;
  packaging_fee_inr?: number;
  platformFeeInr?: number;
  platform_fee_inr?: number;
  gstAmountInr?: number;
  tax_total_inr?: number;
  discountAmountInr?: number;
  finalPayableAmountInr?: number;
  total_payable_inr?: number;
}

export interface AdminOrderDetail {
  id: string;
  subOrderNumber?: string;
  sub_order_number?: string;
  orderGroupId?: string;
  status: string;
  deliveryPin?: string;
  handoverOtp?: string;
  items: AdminOrderItem[];
  pricing: AdminOrderPricing;
}

export interface AdminCoupon {
  id: string;
  code: string;
  description?: string;
  discount_percentage?: number;
  flat_discount_inr?: number;
  min_order_amount_inr?: number;
  max_discount_inr?: number;
  is_active: boolean;
}

export interface CreateCouponDto {
  code: string;
  description?: string;
  discountPercentage?: number;
  flatDiscountInr?: number;
  minOrderAmountInr?: number;
  maxDiscountInr?: number;
  validFrom?: string;
  validUntil?: string;
  usageLimitPerUser?: number;
}
