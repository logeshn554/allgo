import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { OrdersService } from '../services/orders.service.js';
import { CartService } from '../services/cart.service.js';
import { PricingService } from '../services/pricing.service.js';
import { AddressService } from '../services/address.service.js';
import { CouponsService } from '../services/coupons.service.js';
import { CheckoutEstimateDto, PlaceOrderDto } from '../dto/ordering.dto.js';

@Controller('v1/checkout')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CheckoutController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly cartService: CartService,
    private readonly pricingService: PricingService,
    private readonly addressService: AddressService,
    private readonly couponsService: CouponsService
  ) {}

  @Get('promotions')
  @Roles('CUSTOMER')
  async getEligiblePromotions(@Request() req: any) {
    const cart = await this.cartService.getCart(req.user.id);
    if (!cart.items || cart.items.length === 0) {
      return [];
    }
    const itemsSubtotalInr = cart.items.reduce(
      (sum: number, item: any) => sum + (item.priceInr * item.quantity),
      0
    );
    return this.couponsService.listEligibleCoupons(req.user.id, cart.outlet.id, itemsSubtotalInr);
  }

  @Post('estimate')
  @Roles('CUSTOMER')
  async getCheckoutEstimate(@Request() req: any, @Body() dto: CheckoutEstimateDto) {
    const cart = await this.cartService.getCart(req.user.id);
    if (!cart.items || cart.items.length === 0) {
      return { items: [], pricing: null };
    }

    let customerLocation = dto.dropoffLocation;
    if (!customerLocation && dto.deliveryAddressId) {
      const address = await this.addressService.getSavedAddress(dto.deliveryAddressId, req.user.id);
      customerLocation = { latitude: address.latitude, longitude: address.longitude };
    }

    const pricing = await this.pricingService.calculateCheckoutTotals(
      cart.items.map((i: any) => ({
        item_id: i.itemId,
        variant_id: i.variantId,
        quantity: i.quantity,
        selected_options: i.selectedOptions,
      })),
      cart.outlet.id,
      customerLocation,
      dto.couponCode,
      req.user.id
    );

    return {
      outlet: cart.outlet,
      items: cart.items,
      pricing,
    };
  }

  @Post('place-order')
  @Roles('CUSTOMER')
  async placeOrder(@Request() req: any, @Body() dto: PlaceOrderDto) {
    return this.ordersService.placeOrder(req.user.id, dto);
  }
}
