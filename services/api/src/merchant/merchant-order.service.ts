import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MerchantOrderRepository } from './data/merchant-order.repository.js';
import { MerchantOutletRepository } from './data/merchant-outlet.repository.js';
import { MerchantRepository } from './data/merchant.repository.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';

@Injectable()
export class MerchantOrderService {
  constructor(
    private readonly merchantRepo: MerchantRepository,
    private readonly outletRepo: MerchantOutletRepository,
    private readonly orderRepo: MerchantOrderRepository,
  ) {}

  async getDashboard(userId: string): Promise<any> {
    const merchant = await this.merchantRepo.findMerchantByOwnerId(userId);
    if (!merchant) throw new ForbiddenException('Merchant account required');

    const outlet = await this.outletRepo.findPrimaryOutlet(merchant.id);
    if (!outlet) {
      return {
        status: merchant.status,
        isOpen: false,
        todaySalesInr: 0,
        weeklySalesInr: 0,
        pendingPayoutInr: 0,
        orderSummary: { new: 0, accepted: 0, preparing: 0, ready: 0, completed: 0, cancelled: 0 },
        storeRating: 4.8,
        completionRatePercentage: 98.5,
      };
    }

    const row = await this.orderRepo.getDashboardStats(outlet.id);
    const countCompleted = Number.parseInt(row.count_completed || '0', 10);
    const countCancelled = Number.parseInt(row.count_cancelled || '0', 10);
    const totalFinished = countCompleted + countCancelled;
    const completionRate =
      totalFinished > 0 ? Math.round((countCompleted / totalFinished) * 1000) / 10 : 100.0;

    return {
      status: merchant.status,
      outletId: outlet.id,
      outletName: outlet.outlet_name,
      isOpen: outlet.is_open,
      defaultPrepTimeMinutes: outlet.default_prep_time_minutes,
      todaySalesInr: Number.parseFloat(row.today_sales || '0'),
      weeklySalesInr: Number.parseFloat(row.weekly_sales || '0'),
      pendingPayoutInr: Number.parseFloat(row.total_earned || '0'),
      orderSummary: {
        new: Number.parseInt(row.count_new || '0', 10),
        accepted: Number.parseInt(row.count_accepted || '0', 10),
        preparing: Number.parseInt(row.count_preparing || '0', 10),
        ready: Number.parseInt(row.count_ready || '0', 10),
        completed: countCompleted,
        cancelled: countCancelled,
      },
      storeRating: 4.85,
      completionRatePercentage: completionRate,
    };
  }

  async getOrders(userId: string, statusFilter?: string): Promise<any[]> {
    const merchant = await this.merchantRepo.findMerchantByOwnerId(userId);
    if (!merchant) throw new ForbiddenException('Merchant account required');
    const outlet = await this.outletRepo.findPrimaryOutlet(merchant.id);
    if (!outlet) return [];

    const rows = await this.orderRepo.listOrders(outlet.id, statusFilter);
    return rows.map((r: any) => ({
      id: r.id,
      subOrderNumber: r.sub_order_number,
      status: r.status,
      verticalType: r.vertical_type,
      itemsTotalInr: Number.parseFloat(r.items_total_inr),
      packagingFeeInr: Number.parseFloat(r.packaging_fee_inr),
      merchantCommissionInr: Number.parseFloat(r.merchant_commission_inr),
      merchantNetPayoutInr: Number.parseFloat(r.merchant_net_payout_inr),
      taxTotalInr: Number.parseFloat(r.tax_total_inr),
      prepTimeMinutes: r.prep_time_minutes,
      estimatedReadyAt: r.estimated_ready_at,
      actualReadyAt: r.actual_ready_at,
      createdAt: r.created_at,
      customerName: r.customer_name || 'AllGo Customer',
      customerPhone: r.customer_phone
        ? `${r.customer_phone.slice(0, 3)}****${r.customer_phone.slice(-4)}`
        : 'Customer',
      items: r.items,
    }));
  }

  async getOrderById(userId: string, orderId: string): Promise<any> {
    const merchant = await this.merchantRepo.findMerchantByOwnerId(userId);
    if (!merchant) throw new ForbiddenException('Merchant account required');
    const outlet = await this.outletRepo.findPrimaryOutlet(merchant.id);
    if (!outlet) throw new NotFoundException('Outlet not found');

    const r = await this.orderRepo.findOrderById(orderId, outlet.id);
    if (!r) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    return {
      id: r.id,
      subOrderNumber: r.sub_order_number,
      status: r.status,
      verticalType: r.vertical_type,
      itemsTotalInr: Number.parseFloat(r.items_total_inr),
      packagingFeeInr: Number.parseFloat(r.packaging_fee_inr),
      merchantCommissionInr: Number.parseFloat(r.merchant_commission_inr),
      merchantNetPayoutInr: Number.parseFloat(r.merchant_net_payout_inr),
      taxTotalInr: Number.parseFloat(r.tax_total_inr),
      prepTimeMinutes: r.prep_time_minutes,
      estimatedReadyAt: r.estimated_ready_at,
      actualReadyAt: r.actual_ready_at,
      createdAt: r.created_at,
      customerName: r.customer_name || 'AllGo Customer',
      customerPhone: r.customer_phone
        ? `${r.customer_phone.slice(0, 3)}****${r.customer_phone.slice(-4)}`
        : 'Customer',
      items: r.items,
    };
  }

  async updateOrderStatus(
    userId: string,
    orderId: string,
    dto: UpdateOrderStatusDto,
  ): Promise<any> {
    const merchant = await this.merchantRepo.findMerchantByOwnerId(userId);
    if (!merchant) throw new ForbiddenException('Merchant account required');

    if (!['APPROVED', 'LIVE', 'ACTIVE'].includes(merchant.status)) {
      throw new ForbiddenException(
        `Order processing locked. Administrative approval required (current status: ${merchant.status})`,
      );
    }
    const outlet = await this.outletRepo.findPrimaryOutlet(merchant.id);
    if (!outlet) throw new NotFoundException('Outlet not found');

    const currentOrder = await this.orderRepo.findSubOrderRaw(orderId, outlet.id);
    if (!currentOrder) {
      throw new NotFoundException('Order not found or cross-merchant access forbidden');
    }

    const currentStatus = currentOrder.status;
    const targetStatus = dto.status;

    const allowedTransitions: Record<string, string[]> = {
      PLACED: ['MERCHANT_ACCEPTED', 'REJECTED', 'CANCELLED'],
      PAYMENT_CONFIRMED: ['MERCHANT_ACCEPTED', 'REJECTED', 'CANCELLED'],
      MERCHANT_ACCEPTED: ['PREPARING', 'CANCELLED'],
      PREPARING: ['READY', 'CANCELLED'],
      READY: ['PARTNER_ASSIGNED', 'PARTNER_AT_STORE', 'PICKED_UP', 'CANCELLED'],
    };

    if (
      !allowedTransitions[currentStatus] ||
      !allowedTransitions[currentStatus].includes(targetStatus)
    ) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${targetStatus}. Allowed: ${(allowedTransitions[currentStatus] || []).join(', ')}`,
      );
    }

    const updated = await this.orderRepo.updateSubOrderStatus(
      orderId,
      outlet.id,
      targetStatus,
      dto.prepTimeMinutes || currentOrder.prep_time_minutes,
      targetStatus === 'READY',
    );

    await this.orderRepo.recordOrderEvent(
      currentOrder.order_group_id,
      currentOrder.id,
      userId,
      `MERCHANT_${targetStatus}`,
      currentStatus,
      targetStatus,
      dto.rejectionReason || null,
    );

    return updated;
  }
}
