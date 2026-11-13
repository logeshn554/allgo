import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AddressService } from '../services/address.service.js';
import { CreateAddressDto } from '../dto/ordering.dto.js';

@Controller('v1/addresses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AddressesController {
  constructor(private readonly addressService: AddressService) {}

  @Get()
  @Roles('CUSTOMER')
  async listAddresses(@Request() req: any) {
    return this.addressService.listSavedAddresses(req.user.id);
  }

  @Post()
  @Roles('CUSTOMER')
  async createAddress(@Request() req: any, @Body() dto: CreateAddressDto) {
    return this.addressService.createSavedAddress(req.user.id, dto);
  }

  @Delete(':id')
  @Roles('CUSTOMER')
  async deleteAddress(@Request() req: any, @Param('id') addressId: string) {
    await this.addressService.deleteSavedAddress(addressId, req.user.id);
    return { success: true, message: 'Address deleted' };
  }
}
