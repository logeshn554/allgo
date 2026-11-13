import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CartService } from '../services/cart.service.js';
import { AddToCartDto, UpdateCartItemDto } from '../dto/ordering.dto.js';

@Controller('v1/cart')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @Roles('CUSTOMER')
  async getCart(@Request() req: any) {
    return this.cartService.getCart(req.user.id);
  }

  @Post('items')
  @Roles('CUSTOMER')
  async addToCart(@Request() req: any, @Body() dto: AddToCartDto) {
    return this.cartService.addToCart(req.user.id, dto);
  }

  @Put('items/:id')
  @Roles('CUSTOMER')
  async updateCartItem(
    @Request() req: any,
    @Param('id') cartItemId: string,
    @Body() dto: UpdateCartItemDto
  ) {
    return this.cartService.updateCartItem(req.user.id, cartItemId, dto);
  }

  @Delete('items/:id')
  @Roles('CUSTOMER')
  async removeCartItem(@Request() req: any, @Param('id') cartItemId: string) {
    return this.cartService.removeCartItem(req.user.id, cartItemId);
  }

  @Delete()
  @Roles('CUSTOMER')
  async clearCart(@Request() req: any) {
    await this.cartService.clearCart(req.user.id);
    return { success: true, message: 'Cart cleared' };
  }
}
