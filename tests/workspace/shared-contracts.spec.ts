import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CartPricingBreakdownSchema,
  DispatchOfferPayloadSchema,
  DriverLocationPingSchema,
  FareQuoteSchema,
  OrderStatus,
  OrderStatusSchema,
  ProofOfDeliverySchema,
  ServiceVertical,
  ServiceVerticalSchema,
  UserRole,
  UserRoleSchema,
} from '../../packages/common/dist/index.js';

describe('@allgo/common Domain Contracts & Validation Schemas', () => {
  it('should export ServiceVertical with all required verticals and pass Zod validation', () => {
    assert.equal(ServiceVertical.RIDE_HAILING, 'RIDE_HAILING');
    assert.equal(ServiceVertical.INSTANT_GROCERY, 'INSTANT_GROCERY');
    assert.equal(ServiceVertical.PARCEL_DELIVERY, 'PARCEL_DELIVERY');

    assert.equal(ServiceVerticalSchema.parse('RIDE_HAILING'), 'RIDE_HAILING');
    assert.equal(ServiceVerticalSchema.parse('INSTANT_GROCERY'), 'INSTANT_GROCERY');
    assert.equal(ServiceVerticalSchema.parse('PARCEL_DELIVERY'), 'PARCEL_DELIVERY');
    assert.throws(() => ServiceVerticalSchema.parse('INVALID_VERTICAL'));
  });

  it('should export UserRole with core roles and pass Zod validation', () => {
    assert.equal(UserRole.CUSTOMER, 'CUSTOMER');
    assert.equal(UserRole.MERCHANT, 'MERCHANT');
    assert.equal(UserRole.DRIVER, 'DRIVER');
    assert.equal(UserRole.ADMIN, 'ADMIN');

    assert.equal(UserRoleSchema.parse('CUSTOMER'), 'CUSTOMER');
    assert.equal(UserRoleSchema.parse('DRIVER'), 'DRIVER');
    assert.throws(() => UserRoleSchema.parse('SUPERUSER'));
  });

  it('should export OrderStatus with all 16 canonical lifecycle states and pass Zod validation', () => {
    const requiredStatuses = [
      'CREATED',
      'PAYMENT_PENDING',
      'CONFIRMED',
      'MERCHANT_ACCEPTED',
      'PREPARING',
      'READY_FOR_PICKUP',
      'DISPATCHING',
      'DRIVER_ASSIGNED',
      'ARRIVED_AT_PICKUP',
      'PICKED_UP',
      'IN_TRANSIT',
      'ARRIVED_AT_DROP',
      'DELIVERED',
      'COMPLETED',
      'CANCELLED',
      'DISPUTED',
    ] as const;

    for (const status of requiredStatuses) {
      assert.equal(OrderStatus[status], status);
      assert.equal(OrderStatusSchema.parse(status), status);
    }
  });

  it('should validate FareQuote schema correctly', () => {
    const validQuote = {
      quoteId: '123e4567-e89b-12d3-a456-426614174000',
      vertical: 'RIDE_HAILING',
      baseFareInr: 50,
      distanceKm: 8.5,
      durationMinutes: 22,
      surgeMultiplier: 1.2,
      taxInr: 10,
      totalFareInr: 180,
      currency: 'INR',
      expiresAt: new Date(Date.now() + 600000).toISOString(),
    };
    const parsed = FareQuoteSchema.parse(validQuote);
    assert.equal(parsed.quoteId, validQuote.quoteId);
    assert.equal(parsed.totalFareInr, 180);
  });

  it('should validate CartPricingBreakdown schema correctly', () => {
    const validCart = {
      itemTotalInr: 450,
      packagingFeeInr: 15,
      deliveryFeeInr: 40,
      surgeFeeInr: 0,
      platformFeeInr: 5,
      taxGstInr: 25,
      tipInr: 20,
      discountInr: 50,
      finalTotalInr: 505,
      currency: 'INR',
    };
    const parsed = CartPricingBreakdownSchema.parse(validCart);
    assert.equal(parsed.finalTotalInr, 505);
  });

  it('should validate DispatchOfferPayload schema correctly', () => {
    const validOffer = {
      offerId: '223e4567-e89b-12d3-a456-426614174001',
      orderId: '323e4567-e89b-12d3-a456-426614174002',
      vertical: 'INSTANT_GROCERY',
      pickupLocation: {
        latitude: 13.0827,
        longitude: 80.2707,
        address: 'Wholesale Depot, Broadway, Chennai',
        name: 'Depot #1',
      },
      dropoffLocation: {
        latitude: 13.085,
        longitude: 80.2101,
        address: '14 Anna Nagar, Chennai',
      },
      driverPayoutInr: 85,
      estimatedDistanceKm: 6.2,
      estimatedDurationMinutes: 18,
      expiresAtSeconds: 45,
    };
    const parsed = DispatchOfferPayloadSchema.parse(validOffer);
    assert.equal(parsed.offerId, validOffer.offerId);
    assert.equal(parsed.driverPayoutInr, 85);
  });

  it('should validate DriverLocationPing schema correctly', () => {
    const validPing = {
      driverId: '423e4567-e89b-12d3-a456-426614174003',
      latitude: 13.0827,
      longitude: 80.2707,
      heading: 180,
      speedMps: 11.2,
      recordedAt: new Date().toISOString(),
      activeVerticalLock: 'PARCEL_DELIVERY',
    };
    const parsed = DriverLocationPingSchema.parse(validPing);
    assert.equal(parsed.driverId, validPing.driverId);
  });

  it('should validate ProofOfDelivery schema correctly', () => {
    const validPod = {
      orderId: '523e4567-e89b-12d3-a456-426614174004',
      deliveryPin: '5821',
      proofType: 'OTP',
      confirmedAt: new Date().toISOString(),
      dropLocation: {
        latitude: 13.085,
        longitude: 80.2101,
      },
    };
    const parsed = ProofOfDeliverySchema.parse(validPod);
    assert.equal(parsed.proofType, 'OTP');
  });
});
