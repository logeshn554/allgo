import { Injectable, BadRequestException, Logger, Optional } from '@nestjs/common';
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
import { CloudTasksGateway } from '../../common/scheduling/cloud-tasks.gateway.js';

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
    private readonly paymentService: PaymentService,
    @Optional() private readonly cloudTasksGateway?: CloudTasksGateway
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

    const address = await this.addressService.getSavedAddress(dto.deliveryAddressId, customerId);

    const outletsMap = new Map<string, any[]>();
    for (const item of cart.items) {
      const oId = item.outletId || cart.outlet?.id;
      if (!outletsMap.has(oId)) {
        outletsMap.set(oId, []);
      }
      outletsMap.get(oId)!.push(item);
    }

    for (const oId of outletsMap.keys()) {
      await this.addressService.validateServiceability(oId, address.latitude, address.longitude);
    }

    const pricing = await this.pricingService.calculateCheckoutTotals(
      cart.items.map((i: any) => ({
        item_id: i.itemId,
        variant_id: i.variantId,
        quantity: i.quantity,
        selected_options: i.selectedOptions,
        outlet_id: i.outletId || cart.outlet?.id,
      })),
      cart.outlet?.id,
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

      for (const [oId, oItems] of outletsMap.entries()) {
        await this.inventoryReservation.reserveInventory(
          client,
          checkoutSessionId,
          oId,
          oItems.map((i: any) => ({ itemId: i.itemId, quantity: i.quantity }))
        );
      }

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

      const initialStatus = (dto.paymentMethod === 'COD' || dto.paymentMethod === 'WALLET') ? 'PLACED' : 'CART';
      const createdSubOrders: any[] = [];

      for (const [oId, oItems] of outletsMap.entries()) {
        const outletBreakdown = pricing.outletsBreakdown?.find((ob) => ob.outletId === oId);
        const subItemsTotal = outletBreakdown
          ? outletBreakdown.itemsSubtotalInr
          : oItems.reduce((acc, it) => acc + (it.totalPriceInr || 0), 0);
        const subPackagingFee = outletBreakdown ? outletBreakdown.packagingFeeInr : 15.0;
        const subDeliveryFee = outletBreakdown
          ? outletBreakdown.deliveryFeeInr
          : Math.round((pricing.deliveryFeeInr / outletsMap.size) * 100) / 100;
        const subGstAmount = outletBreakdown
          ? outletBreakdown.gstAmountInr
          : Math.round(subItemsTotal * 0.05 * 100) / 100;
        const subMerchantCommission = Math.round(subItemsTotal * 0.15 * 100) / 100;
        const subMerchantNetPayout = Math.round((subItemsTotal - subMerchantCommission) * 100) / 100;
        const subDiscount =
          pricing.discountAmountInr > 0 && pricing.itemsSubtotalInr > 0
            ? Math.round((subItemsTotal / pricing.itemsSubtotalInr) * pricing.discountAmountInr * 100) / 100
            : 0;
        const subPayable = Math.max(0, subItemsTotal + subPackagingFee + subDeliveryFee + subGstAmount - subDiscount);

        const subOrderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${crypto.randomInt(100, 999)}`;
        const verticalType = oItems[0]?.verticalType || 'FOOD';

        const subOrder = await this.orderRepo.insertSubOrder(client, {
          orderGroupId,
          outletId: oId,
          subOrderNumber,
          verticalType,
          status: initialStatus,
          itemsSubtotalInr: subItemsTotal,
          packagingFeeInr: subPackagingFee,
          deliveryFeeInr: subDeliveryFee,
          platformFeeInr: createdSubOrders.length === 0 ? pricing.platformFeeInr : 0,
          merchantCommission: subMerchantCommission,
          merchantNetPayout: subMerchantNetPayout,
          gstAmountInr: subGstAmount,
          discountAmountInr: subDiscount,
          finalPayableAmountInr: subPayable,
          address,
          deliveryInstructions: dto.deliveryInstructions || null,
          customerNotes: dto.customerNotes || null,
        });

        const subOrderId = subOrder.id;

        for (const item of oItems) {
          const breakdown = pricing.itemsBreakdown.find((b) => b.itemId === item.itemId);
          const orderItemId = await this.orderRepo.insertOrderItem(client, {
            subOrderId,
            itemId: item.itemId,
            itemName: item.name || breakdown?.itemName || 'Item',
            unitPriceInr: breakdown ? breakdown.unitPriceInr : (item.unitPriceInr || 0),
            quantity: item.quantity,
            totalPriceInr: breakdown ? breakdown.totalPriceInr : (item.totalPriceInr || 0),
            gstAmountInr: Math.round((breakdown ? breakdown.totalPriceInr : (item.totalPriceInr || 0)) * 0.05 * 100) / 100,
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

        await this.eventRepo.recordEvent(
          {
            orderGroupId,
            subOrderId,
            actorId: customerId,
            eventType: 'ORDER_PLACED',
            fromStatus: 'CART',
            toStatus: initialStatus,
            notes: `Sub-order created via unified checkout for outlet ${oId}`,
          },
          client
        );

        createdSubOrders.push({
          subOrderId,
          subOrderNumber,
          outletId: oId,
          status: initialStatus,
          itemCount: oItems.length,
          payableAmountInr: subPayable,
        });
      }

      const primarySubOrderId = createdSubOrders[0].subOrderId;
      const primarySubOrderNumber = createdSubOrders[0].subOrderNumber;

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
            subOrderId: primarySubOrderId,
            couponCode: pricing.appliedCoupon.code,
            discountInr: pricing.appliedCoupon.discountInr,
          });

          await this.orderRepo.insertDiscountAllocation(client, {
            orderGroupId,
            subOrderId: primarySubOrderId,
            couponCode: pricing.appliedCoupon.code,
            discountInr: pricing.appliedCoupon.discountInr,
          });
        }
      }

      const paymentResult = await this.paymentService.initiatePayment(
        orderGroupId,
        primarySubOrderId,
        customerId,
        dto.paymentMethod,
        pricing.finalPayableAmountInr,
        idempotencyKey,
        client
      );

      await this.orderRepo.clearCart(client, cart.cartId);

      if (dto.scheduledFor && this.cloudTasksGateway) {
        const scheduledDate = new Date(dto.scheduledFor);
        for (const sub of createdSubOrders) {
          await this.cloudTasksGateway.scheduleTask({
            taskName: `cloud_task_order_${sub.subOrderId}`,
            targetType: 'SCHEDULED_ORDER',
            targetId: sub.subOrderId,
            scheduledFor: scheduledDate,
            payload: { orderGroupId, subOrderId: sub.subOrderId, customerId, scheduledFor: scheduledDate.toISOString() },
          });
        }
      }

      await client.query('COMMIT;');

      return {
        orderGroupId,
        orderGroupNumber,
        subOrderId: primarySubOrderId,
        subOrderNumber: primarySubOrderNumber,
        subOrders: createdSubOrders,
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
