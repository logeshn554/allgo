import { Body, Controller, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import {
  CustomerSubstitutionDecisionDto,
  ProposeSubstitutionDto,
} from '../dto/substitution.dto.js';
import { OrderSubstitutionService } from '../services/order-substitution.service.js';

@ApiTags('order-substitutions')
@Controller('v1/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OrderSubstitutionController {
  constructor(private readonly substitutionService: OrderSubstitutionService) {}

  @Post('sub-orders/:subOrderId/substitutions')
  @Roles('MERCHANT', 'MERCHANT_ADMIN')
  @ApiOperation({ summary: 'Merchant proposes out-of-stock item substitution or removal' })
  async proposeSubstitution(
    @Request() req: any,
    @Param('subOrderId') subOrderId: string,
    @Body() dto: ProposeSubstitutionDto,
  ) {
    return this.substitutionService.proposeSubstitution(req.user.userId, subOrderId, dto);
  }

  @Post('substitutions/:substitutionId/decision')
  @Roles('CUSTOMER')
  @ApiOperation({ summary: 'Customer approves or rejects item substitution with bill refund' })
  async customerDecision(
    @Request() req: any,
    @Param('substitutionId') substitutionId: string,
    @Body() dto: CustomerSubstitutionDecisionDto,
  ) {
    return this.substitutionService.respondToSubstitution(req.user.userId, substitutionId, dto);
  }
}
