import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@ApiTags('users')
@Controller('v1/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('ADMIN')
  @ApiHeader({ name: 'X-AllGo-Role', description: 'Active role context (ADMIN)', required: true })
  @ApiOperation({ summary: 'List all platform users with role and status filtering (Admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated user summary list' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires ADMIN role' })
  async listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string
  ) {
    return this.usersService.listUsers({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve specific user profile by UUID' })
  @ApiResponse({ status: 200, description: 'User profile details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUser(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @Patch(':id/status')
  @Roles('ADMIN')
  @ApiHeader({ name: 'X-AllGo-Role', description: 'Active role context (ADMIN)', required: true })
  @ApiOperation({ summary: 'Update user account status (ACTIVE, SUSPENDED, BLOCKED) (Admin only)' })
  @ApiResponse({ status: 200, description: 'User status successfully updated' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires ADMIN role' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') newStatus: string
  ) {
    return this.usersService.updateUserStatus(id, newStatus);
  }

  @Post(':id/roles')
  @Roles('ADMIN')
  @ApiHeader({ name: 'X-AllGo-Role', description: 'Active role context (ADMIN)', required: true })
  @ApiOperation({ summary: 'Assign a role to a user (Admin only)' })
  @ApiResponse({ status: 200, description: 'Role successfully assigned' })
  async assignRole(
    @Param('id') id: string,
    @Body('role') role: string
  ) {
    return this.usersService.assignUserRole(id, role);
  }
}
