import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { DeliveryOtpRateLimiterGuard } from '../../common/guards/delivery-otp-rate-limiter.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { OwnershipGuard } from '../../common/guards/ownership.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { CancelOrderDto } from '../dto/ordering.dto.js';
import { GstInvoiceService } from '../services/gst-invoice.service.js';
import { OrdersService } from '../services/orders.service.js';

@Controller('v1/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly gstInvoiceService: GstInvoiceService,
  ) {}

  @Get()
  @Roles('CUSTOMER')
  async listMyOrders(@Request() req: any) {
    return this.ordersService.listCustomerOrders(req.user.id);
  }

  @Get(':id')
  @UseGuards(OwnershipGuard)
  async getOrderDetails(@Request() req: any, @Param('id') orderId: string) {
    const role = req.headers['x-allgo-role'] || 'CUSTOMER';
    return this.ordersService.getOrderDetails(orderId, req.user.id, role);
  }

  @Post(':id/cancel')
  @UseGuards(OwnershipGuard)
  async cancelOrder(
    @Request() req: any,
    @Param('id') orderId: string,
    @Body() dto: CancelOrderDto,
  ) {
    const role = req.headers['x-allgo-role'] || 'CUSTOMER';
    return this.ordersService.cancelOrder(orderId, req.user.id, role, dto.reason);
  }

  @Post(':id/verify-otp')
  @UseGuards(OwnershipGuard, DeliveryOtpRateLimiterGuard)
  async verifyOrderOtp(
    @Request() req: any,
    @Param('id') orderId: string,
    @Body('otp') otp: string,
  ) {
    try {
      const res = await this.ordersService.verifyDeliveryOtp(orderId, otp, req.user.id);
      if (req.otpRateLimit?.recordSuccess) {
        await req.otpRateLimit.recordSuccess();
      }
      return res;
    } catch (err) {
      if (req.otpRateLimit?.recordFailure) {
        await req.otpRateLimit.recordFailure();
      }
      throw err;
    }
  }

  @Get(':id/invoice')
  @UseGuards(OwnershipGuard)
  async getOrderInvoice(@Request() req: any, @Param('id') orderId: string) {
    const role = req.headers['x-allgo-role'] || 'CUSTOMER';
    const order = await this.ordersService.getOrderDetails(orderId, req.user.id, role);
    const items = Array.isArray(order?.items) ? order.items : [];
    const totalInr = Number(order?.totalInr ?? order?.total_inr ?? 0);
    const deliveryFeeInr = Number(order?.deliveryFeeInr ?? order?.delivery_fee_inr ?? 0);
    const packagingFeeInr = Number(order?.packagingFeeInr ?? order?.packaging_fee_inr ?? 0);
    const taxableAmountInr = Number(
      order?.subtotalInr ??
        order?.subtotal_inr ??
        Math.max(0, totalInr - deliveryFeeInr - packagingFeeInr),
    );
    const gstTotal = Math.max(0, totalInr - taxableAmountInr - deliveryFeeInr - packagingFeeInr);

    const generated = await this.gstInvoiceService.generateSubOrderGstInvoice({
      invoiceNumber: `INV-${order?.subOrderNumber || orderId.slice(0, 8).toUpperCase()}`,
      subOrderId: orderId,
      orderGroupId: order?.orderGroupId || order?.order_group_id || orderId,
      merchantName: order?.outlet?.name || 'AllGo Partner Outlet',
      merchantGstin: order?.outlet?.gstin,
      merchantFssai: order?.outlet?.fssaiLicenseNumber,
      customerName: req.user?.fullName || 'AllGo Customer',
      customerPhone: req.user?.phone || '',
      customerAddress:
        order?.deliveryAddress?.formattedAddress ||
        order?.deliveryAddress?.addressLine1 ||
        'Delivery Address',
      items: items.map((item: any) => ({
        title: item.name || item.title || 'Item',
        quantity: Number(item.quantity ?? 1),
        unitPriceInr: Number(item.unitPriceInr ?? item.priceInr ?? 0),
        gstRatePercent: Number(item.gstRatePercent ?? 5),
        totalInr: Number(
          item.totalInr ??
            Number(item.unitPriceInr ?? item.priceInr ?? 0) * Number(item.quantity ?? 1),
        ),
      })),
      taxableAmountInr,
      cgstAmountInr: Number((gstTotal / 2).toFixed(2)),
      sgstAmountInr: Number((gstTotal / 2).toFixed(2)),
      igstAmountInr: 0,
      packagingFeeInr,
      deliveryFeeInr,
      totalAmountInr: totalInr,
      issuedAt: new Date(order?.createdAt || Date.now()),
    });

    return {
      subOrderId: orderId,
      invoiceNumber: `INV-${order?.subOrderNumber || orderId.slice(0, 8).toUpperCase()}`,
      storageKey: generated.storageKey,
      signedUrl: generated.signedUrl,
    };
  }
}
