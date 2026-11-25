import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { CreateAddressDto, UpdateAddressDto } from '../dto/ordering.dto.js';
import { AddressService } from '../services/address.service.js';

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

  @Put(':id')
  @Roles('CUSTOMER')
  async updateAddress(
    @Request() req: any,
    @Param('id') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressService.updateSavedAddress(addressId, req.user.id, dto);
  }

  @Patch(':id/default')
  @Roles('CUSTOMER')
  async setDefaultAddress(@Request() req: any, @Param('id') addressId: string) {
    return this.addressService.setDefaultAddress(addressId, req.user.id);
  }

  @Delete(':id')
  @Roles('CUSTOMER')
  async deleteAddress(@Request() req: any, @Param('id') addressId: string) {
    await this.addressService.deleteSavedAddress(addressId, req.user.id);
    return { success: true, message: 'Address deleted' };
  }
}
