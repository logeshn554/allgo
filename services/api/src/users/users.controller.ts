import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@Controller('v1/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('profile')
  @ApiOperation({ summary: 'Update customer/user self-service profile (IDOR-safe)' })
  @ApiResponse({ status: 200, description: 'User profile successfully updated' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    const userId = req.user?.userId || req.user?.sub;
    if (!userId) {
      throw new ForbiddenException('User context is missing');
    }
    return this.usersService.updateUserProfile(userId, dto);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update user self-service profile alias (IDOR-safe)' })
  @ApiResponse({ status: 200, description: 'User profile successfully updated' })
  async updateMe(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.updateProfile(req, dto);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Retrieve own profile for authenticated user' })
  @ApiResponse({ status: 200, description: 'User profile details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Req() req: any) {
    const userId = req.user?.userId || req.user?.sub;
    if (!userId) {
      throw new ForbiddenException('User context is missing');
    }
    return this.usersService.getUserById(userId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Retrieve own profile alias for authenticated user' })
  @ApiResponse({ status: 200, description: 'User profile details' })
  async getMe(@Req() req: any) {
    return this.getProfile(req);
  }

  @Get()
  @Roles('ADMIN')
  @ApiHeader({ name: 'X-AllGo-Role', description: 'Active role context (ADMIN)', required: true })
  @ApiOperation({ summary: 'List all platform users with role and status filtering (Admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated user summary list' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires ADMIN role' })
  async listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.usersService.listUsers({
      page: page ? Number.parseInt(page, 10) : 1,
      limit: limit ? Number.parseInt(limit, 10) : 20,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve specific user profile by UUID' })
  @ApiResponse({ status: 200, description: 'User profile details' })
  @ApiResponse({ status: 403, description: 'Forbidden - IDOR prevention (owner or ADMIN only)' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUser(@Req() req: any, @Param('id') id: string) {
    const requester = req.user;
    const isOwner = requester && requester.userId === id;
    const isAdmin =
      requester && Array.isArray(requester.roles) && requester.roles.includes('ADMIN');

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'Access denied: You do not have permission to view this profile.',
      );
    }

    return this.usersService.getUserById(id);
  }

  @Patch(':id/status')
  @Roles('ADMIN')
  @ApiHeader({ name: 'X-AllGo-Role', description: 'Active role context (ADMIN)', required: true })
  @ApiOperation({ summary: 'Update user account status (ACTIVE, SUSPENDED, BLOCKED) (Admin only)' })
  @ApiResponse({ status: 200, description: 'User status successfully updated' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires ADMIN role' })
  async updateStatus(@Param('id') id: string, @Body('status') newStatus: string) {
    return this.usersService.updateUserStatus(id, newStatus);
  }

  @Post(':id/roles')
  @Roles('ADMIN')
  @ApiHeader({ name: 'X-AllGo-Role', description: 'Active role context (ADMIN)', required: true })
  @ApiOperation({ summary: 'Assign a role to a user (Admin only)' })
  @ApiResponse({ status: 200, description: 'Role successfully assigned' })
  async assignRole(@Param('id') id: string, @Body('role') role: string) {
    return this.usersService.assignUserRole(id, role);
  }

  @Delete(':id/roles/:role')
  @Roles('ADMIN')
  @ApiHeader({ name: 'X-AllGo-Role', description: 'Active role context (ADMIN)', required: true })
  @ApiOperation({ summary: 'Revoke a role from a user (Admin only)' })
  @ApiResponse({ status: 200, description: 'Role successfully revoked' })
  async revokeRole(@Param('id') id: string, @Param('role') role: string) {
    return this.usersService.revokeUserRole(id, role);
  }
}
