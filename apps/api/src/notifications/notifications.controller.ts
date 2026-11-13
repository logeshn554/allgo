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
import { NotificationsService, SendNotificationDto } from './notifications.service.js';

@ApiTags('notifications')
@Controller('v1/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for current user' })
  async getNotifications(@Req() req: any, @Query('unreadOnly') unreadOnly?: string) {
    const role = (req.headers['x-allgo-role'] as string) || 'CUSTOMER';
    return this.notificationsService.getNotifications(
      req.user.userId,
      role,
      unreadOnly === 'true'
    );
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  async markRead(@Req() req: any, @Param('id') id: string) {
    return this.notificationsService.markAsRead(id, req.user.userId);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@Req() req: any) {
    const role = (req.headers['x-allgo-role'] as string) || 'CUSTOMER';
    return this.notificationsService.markAllAsRead(req.user.userId, role);
  }

  @Post('admin/send')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Send test notification (Admin)' })
  async adminSend(@Body() dto: SendNotificationDto) {
    return this.notificationsService.sendNotification(dto);
  }
}
