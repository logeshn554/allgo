import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import crypto from 'node:crypto';
import { DatabaseService } from '../../database/database.service.js';
import { OrderRepository } from '../data/order.repository.js';
import { OrderEventRepository } from '../data/order-event.repository.js';
import { CartService } from './cart.service.js';
import { PricingService } from './pricing.service.js';
import { AddressService } from './address.service.js';
import { InventoryReservationService } from './inventory-reservation.service.js';
import { PaymentService } from './payment.service.js';
import { PlaceOrderDto } from '../dto/ordering.dto.js';

@Injectable()
export class OrderPlacementService {
  private readonly logger = new Logger(OrderPlacementService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly orderRepo: OrderRepository,
    private readonly eventRepo: OrderEventRepository,
    private readonly cartService: CartService,
    private readonly pricingService: PricingService,
    private readonly addressService: AddressService,
    private readonly inventoryReservation: InventoryReservationService,
    private readonly paymentService: PaymentService
  ) {}

  async placeOrder(customerId: string, dto: PlaceOrderDto, getOrderDetailsFn: (subOrderId: string, userId: string, role: string) => Promise<any>): Promise<any> {
    const idempotencyKey = dto.idempotencyKey || `idem-ord-${customerId}-${Date.now()}`;
    const existingSession = await this.orderRepo.findSessionByIdempotency(idempotencyKey);

    if (existingSession) {
      this.logger.log(`Idempotent order request detected for key: ${idempotencyKey}`);
      return getOrderDetailsFn(existingSession.sub_order_id, customerId, 'CUSTOMER');
    }

    const cart = await this.cartService.getCart(customerId);
    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cannot place an order with an empty cart');
    }

    const outletId = cart.outlet.id;
    const address = await this.addressService.getSavedAddress(dto.deliveryAddressId, customerId);
    await this.addressService.validateServiceability(outletId, address.latitude, address.longitude);

    const pricing = await this.pricingService.calculateCheckoutTotals(
      cart.items.map((i: any) => ({
        item_id: i.itemId,
        variant_id: i.variantId,
        quantity: i.quantity,
        selected_options: i.selectedOptions,
      })),
      outletId,
      { latitude: address.latitude, longitude: address.longitude },
      dto.couponCode,
      customerId
    );

    const client = await this.db.getPool().connect();

    try {
      await client.query('BEGIN;');

      const checkoutSessionId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await this.orderRepo.insertCheckoutSession(client, {
        id: checkoutSessionId,
        customerId,
        deliveryAddressId: dto.deliveryAddressId,
        itemsSubtotalInr: pricing.itemsSubtotalInr,
        deliveryFeeInr: pricing.deliveryFeeInr,
        packagingFeeInr: pricing.packagingFeeInr,
        platformFeeInr: pricing.platformFeeInr,
        gstAmountInr: pricing.gstAmountInr,
        discountAmountInr: pricing.discountAmountInr,
        finalPayableAmountInr: pricing.finalPayableAmountInr,
        idempotencyKey,
        expiresAt,
      });

      await this.inventoryReservation.reserveInventory(
        client,
        checkoutSessionId,
        outletId,
        cart.items.map((i: any) => ({ itemId: i.itemId, quantity: i.quantity }))
      );

      const orderGroupNumber = `GRP-${Date.now().toString(36).toUpperCase()}-${crypto.randomInt(100, 999)}`;
      const orderGroupId = await this.orderRepo.insertOrderGroup(client, {
        customerId,
        checkoutSessionId,
        orderGroupNumber,
        itemsSubtotalInr: pricing.itemsSubtotalInr,
        deliveryFeeInr: pricing.deliveryFeeInr,
        packagingFeeInr: pricing.packagingFeeInr,
        platformFeeInr: pricing.platformFeeInr,
        gstAmountInr: pricing.gstAmountInr,
        discountAmountInr: pricing.discountAmountInr,
        finalPayableAmountInr: pricing.finalPayableAmountInr,
        deliveryAddressId: dto.deliveryAddressId,
      });

      const subOrderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${crypto.randomInt(100, 999)}`;
      const initialStatus = dto.paymentMethod === 'COD' ? 'PLACED' : 'CART';
      const merchantCommission = Math.round(pricing.itemsSubtotalInr * 0.15 * 100) / 100;
      const merchantNetPayout = Math.round((pricing.itemsSubtotalInr - merchantCommission) * 100) / 100;

      const subOrder = await this.orderRepo.insertSubOrder(client, {
        orderGroupId,
        outletId,
        subOrderNumber,
        status: initialStatus,
        itemsSubtotalInr: pricing.itemsSubtotalInr,
        packagingFeeInr: pricing.packagingFeeInr,
        deliveryFeeInr: pricing.deliveryFeeInr,
        platformFeeInr: pricing.platformFeeInr,
        merchantCommission,
        merchantNetPayout,
        gstAmountInr: pricing.gstAmountInr,
        discountAmountInr: pricing.discountAmountInr,
        finalPayableAmountInr: pricing.finalPayableAmountInr,
        address,
        deliveryInstructions: dto.deliveryInstructions || null,
        customerNotes: dto.customerNotes || null,
      });

      const subOrderId = subOrder.id;

      for (const item of pricing.itemsBreakdown) {
        const orderItemId = await this.orderRepo.insertOrderItem(client, {
          subOrderId,
          itemId: item.itemId,
          itemName: item.itemName,
          unitPriceInr: item.unitPriceInr,
          quantity: item.quantity,
          totalPriceInr: item.totalPriceInr,
          gstAmountInr: Math.round(item.totalPriceInr * 0.05 * 100) / 100,
        });

        if (item.selectedOptions && item.selectedOptions.length > 0) {
          const isValidUuid = (val?: string) =>
            typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

          for (const opt of item.selectedOptions) {
            await this.orderRepo.insertCustomization(client, {
              orderItemId,
              groupId: isValidUuid(opt.groupId) ? opt.groupId : null,
              groupName: opt.groupName || 'Options',
              optionId: isValidUuid(opt.optionId) ? opt.optionId : null,
              optionName: opt.optionName || 'Option',
              priceInr: opt.priceInr || 0.0,
            });
          }
        }
      }

      if (pricing.appliedCoupon) {
        const coupon = await this.orderRepo.findCouponByCode(client, pricing.appliedCoupon.code);
        if (coupon) {
          const success = await this.orderRepo.incrementCouponRedemptions(client, coupon.id);
          if (!success) {
            throw new BadRequestException('Coupon redemption cap reached');
          }

          await this.orderRepo.insertCouponRedemption(client, {
            couponId: coupon.id,
            customerId,
            orderGroupId,
            subOrderId,
            couponCode: pricing.appliedCoupon.code,
            discountInr: pricing.appliedCoupon.discountInr,
          });

          await this.orderRepo.insertDiscountAllocation(client, {
            orderGroupId,
            subOrderId,
            couponCode: pricing.appliedCoupon.code,
            discountInr: pricing.appliedCoupon.discountInr,
          });
        }
      }

      await this.eventRepo.recordEvent(
        {
          orderGroupId,
          subOrderId,
          actorId: customerId,
          eventType: 'ORDER_PLACED',
          fromStatus: 'CART',
          toStatus: initialStatus,
          notes: 'Order created via checkout',
        },
        client
      );

      const paymentResult = await this.paymentService.initiatePayment(
        orderGroupId,
        subOrderId,
        customerId,
        dto.paymentMethod,
        pricing.finalPayableAmountInr,
        idempotencyKey,
        client
      );

      await this.orderRepo.clearCart(client, cart.cartId);

      await client.query('COMMIT;');

      return {
        subOrderId,
        subOrderNumber,
        status: initialStatus,
        payment: paymentResult,
        pricing,
        createdAt: new Date().toISOString(),
      };
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }
}
