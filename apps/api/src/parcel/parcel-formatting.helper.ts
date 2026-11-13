export function formatCustomerParcel(p: any, userId?: string, role: string = 'CUSTOMER'): any {
  const isSender = p.sender_id === userId || p.customer_id === userId;
  const isCourier = role === 'PARTNER';
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

  return {
    id: p.id,
    parcelNumber: p.parcel_number,
    serviceType: p.service_type || 'STANDARD',
    packageCategory: p.package_category,
    packageDescription: p.package_description,
    packageQuantity: p.package_quantity || 1,
    weightKg: Number(p.estimated_weight_kg),
    lengthCm: Number(p.length_cm || 20),
    widthCm: Number(p.width_cm || 15),
    heightCm: Number(p.height_cm || 10),
    isFragile: Boolean(p.is_fragile),
    handlingInstructions: p.handling_instructions,
    declaredValueInr: Number(p.declared_value_inr || 0),
    status: p.status,
    pickupAddress: p.pickup_address,
    pickupContactName: p.pickup_contact_name,
    pickupContactPhone: isSender || isCourier || isAdmin ? p.pickup_contact_phone : undefined,
    dropoffAddress: p.drop_address,
    recipientName: p.drop_contact_name,
    recipientPhone: isSender || isCourier || isAdmin ? p.drop_contact_phone : undefined,
    deliveryFeeInr: Number(p.delivery_fee_inr || 0),
    platformFeeInr: Number(p.platform_fee_inr || 5),
    taxTotalInr: Number(p.tax_total_inr || 0),
    totalAmountInr: Number(p.total_amount_inr),
    partnerPayoutInr: Number(p.partner_payout_inr),
    paymentMethod: p.payment_method,
    paymentStatus: p.payment_status,
    paymentReference: p.payment_reference,
    priceSnapshot: p.price_snapshot,
    pickupOtp: isSender || isAdmin ? p.pickup_otp : null,
    deliveryOtp: isSender || isAdmin ? p.delivery_otp : null,
    deliveryProofPhotoUrl: p.delivery_proof_photo_url,
    failedAttemptReason: p.failed_attempt_reason,
    returnReason: p.return_reason,
    courier: p.partner_id
      ? {
          id: p.partner_id,
          name: p.courier_name || 'Courier Partner',
          phone: isSender || isAdmin ? p.courier_phone : undefined,
        }
      : null,
    partnerId: p.partner_id,
    pickedUpAt: p.picked_up_at,
    deliveredAt: p.delivered_at,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}
