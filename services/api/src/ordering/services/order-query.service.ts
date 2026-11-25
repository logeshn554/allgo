import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderEventRepository } from '../data/order-event.repository.js';
import { OrderRepository } from '../data/order.repository.js';

@Injectable()
export class OrderQueryService {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly eventRepo: OrderEventRepository,
  ) {}

  async synchronizeDeliveryStatus(subOrderId: string, deliveryStatus: string): Promise<void> {
    let targetOrderStatus: string | null = null;
    if (deliveryStatus === 'PICKED_UP' || deliveryStatus === 'IN_TRANSIT') {
      targetOrderStatus = 'OUT_FOR_DELIVERY';
    } else if (deliveryStatus === 'DELIVERED') {
      targetOrderStatus = 'DELIVERED';
    } else if (deliveryStatus === 'CANCELLED' || deliveryStatus === 'FAILED') {
      targetOrderStatus = 'FAILED';
    }

    if (targetOrderStatus) {
      await this.orderRepo.updateSubOrderStatusOnly(subOrderId, targetOrderStatus);
    }
  }

  async getOrderDetails(subOrderId: string, userId: string, role: string): Promise<any> {
    const order = await this.orderRepo.findSubOrderDetails(subOrderId);
    if (!order) throw new NotFoundException('Order not found');

    if (role === 'CUSTOMER' && order.customer_id !== userId) {
      throw new ForbiddenException('Forbidden');
    }
    if (role === 'MERCHANT_ADMIN' && order.merchant_owner_id !== userId) {
      throw new ForbiddenException('Forbidden');
    }

    const items = await this.orderRepo.findSubOrderItemsWithCustomizations(subOrderId);
    const timeline = await this.eventRepo.listEventsBySubOrder(subOrderId);

    return {
      id: order.id,
      orderNumber: order.sub_order_number,
      groupNumber: order.order_group_number,
      status: order.status,
      vertical: order.vertical_type,
      outlet: {
        id: order.outlet_id,
        name: order.outlet_name,
        address: order.outlet_address,
        phone: order.outlet_phone,
      },
      customer: {
        name: order.customer_name,
        phone: role === 'PARTNER' ? null : order.customer_phone,
      },
      delivery: {
        jobId: order.delivery_job_id,
        jobNumber: order.job_number,
        status: order.delivery_status,
        addressSnapshot: order.delivery_address_snapshot,
        instructions: order.delivery_instructions,
        deliveryPin: role === 'CUSTOMER' || role === 'ADMIN' ? order.delivery_pin : null,
        handoverOtp:
          role === 'MERCHANT_ADMIN' || role === 'PARTNER' || role === 'ADMIN'
            ? order.handover_otp
            : null,
        partner: order.partner_name
          ? {
              name: order.partner_name,
              phone: order.partner_phone,
            }
          : null,
      },
      payment: {
        method: order.payment_method || 'COD',
        status: order.payment_status || 'PENDING',
      },
      pricing: {
        itemsTotalInr: Number(order.items_total_inr),
        packagingFeeInr: Number(order.packaging_fee_inr),
        deliveryFeeInr: Number(order.delivery_fee_inr),
        platformFeeInr: Number(order.platform_fee_inr),
        taxTotalInr: Number(order.tax_total_inr),
        discountInr: Number(order.discount_allocated_inr),
        totalPayableInr: Number(order.total_payable_inr),
      },
      items: items.map((it) => ({
        id: it.id,
        name: it.item_name_snapshot,
        unitPriceInr: Number(it.unit_price_inr),
        quantity: it.quantity,
        totalPriceInr: Number(it.total_price_inr),
        customizations: it.customizations,
      })),
      timeline,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    };
  }

  async listCustomerOrders(customerId: string): Promise<any[]> {
    return this.orderRepo.listCustomerOrders(customerId);
  }

  async listMerchantOrders(merchantUserId: string, status?: string): Promise<any[]> {
    return this.orderRepo.listMerchantOrders(merchantUserId, status);
  }

  async listAdminOrders(status?: string, limit = 50): Promise<any[]> {
    return this.orderRepo.listAdminOrders(status, limit);
  }
}
