import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RatingsService, SubmitRatingDto } from './ratings.service.js';

@ApiTags('ratings')
@Controller('v1')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post('ratings')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit service rating and review' })
  async submitRating(@Req() req: any, @Body() dto: SubmitRatingDto) {
    return this.ratingsService.submitRating(req.user.userId, dto);
  }

  @Get('ratings')
  @ApiOperation({ summary: 'Get ratings and aggregate score breakdown for a target' })
  async getRatings(
    @Query('targetType') targetType: string,
    @Query('targetId') targetId: string,
    @Req() req: any
  ) {
    const role = (req.headers['x-allgo-role'] as string) || 'CUSTOMER';
    const includeHidden = role === 'ADMIN';
    return this.ratingsService.getRatingsForTarget(targetType, targetId, includeHidden);
  }

  @Get('admin/ratings')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all ratings for Admin moderation' })
  async listAllRatings(@Query('limit') limit?: number, @Query('offset') offset?: number) {
    return this.ratingsService.listAllRatings(limit ? Number(limit) : 50, offset ? Number(offset) : 0);
  }

  @Post('admin/ratings/:id/moderate')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Moderate rating (hide or unhide with reason)' })
  async moderateRating(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { isHidden: boolean; reason?: string }
  ) {
    return this.ratingsService.moderateRating(id, req.user.userId, body.isHidden, body.reason);
  }
}
