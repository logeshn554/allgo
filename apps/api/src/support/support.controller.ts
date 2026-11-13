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
import { SupportService, CreateTicketDto } from './support.service.js';

@ApiTags('support')
@Controller('v1')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('support/tickets')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create support ticket' })
  async createTicket(@Req() req: any, @Body() dto: CreateTicketDto) {
    const role = (req.headers['x-allgo-role'] as string) || 'CUSTOMER';
    return this.supportService.createTicket(req.user.userId, role, dto);
  }

  @Get('support/tickets')
  @ApiOperation({ summary: 'List current user tickets' })
  async listUserTickets(@Req() req: any) {
    return this.supportService.listUserTickets(req.user.userId);
  }

  @Get('support/tickets/:id')
  @ApiOperation({ summary: 'Get ticket details and conversation thread' })
  async getTicketDetails(@Req() req: any, @Param('id') id: string) {
    const role = (req.headers['x-allgo-role'] as string) || 'CUSTOMER';
    return this.supportService.getTicketDetails(id, req.user.userId, role);
  }

  @Post('support/tickets/:id/messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Post reply or internal note to support ticket' })
  async addMessage(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { message: string; isInternal?: boolean; attachments?: any[] }
  ) {
    const role = (req.headers['x-allgo-role'] as string) || 'CUSTOMER';
    return this.supportService.addMessage(
      id,
      req.user.userId,
      role,
      body.message,
      Boolean(body.isInternal),
      body.attachments || []
    );
  }

  @Get('admin/support/tickets')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all support ticket queues for Admin' })
  async listAdminTickets(@Query('status') status?: string, @Query('priority') priority?: string) {
    return this.supportService.listAdminTickets(status, priority);
  }

  @Post('admin/support/tickets/:id/assign')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Assign support ticket to admin' })
  async assignTicket(@Req() req: any, @Param('id') id: string, @Body() body: { adminId?: string }) {
    const adminId = body.adminId || req.user.userId;
    return this.supportService.assignTicket(id, adminId);
  }

  @Post('admin/support/tickets/:id/status')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update support ticket status and resolution notes' })
  async updateTicketStatus(
    @Param('id') id: string,
    @Body() body: {
      status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'WAITING_FOR_CUSTOMER' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
      resolutionNotes?: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    }
  ) {
    return this.supportService.updateTicketStatus(id, body.status, body.resolutionNotes, body.priority);
  }
}
