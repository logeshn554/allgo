import { Module } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { UserPhaseFController } from './user-phase-f.controller.js';
import { UsersService } from './users.service.js';
import { ReferralService } from './referral.service.js';
import { DpdpComplianceService } from './dpdp-compliance.service.js';
import { UserRepository } from './data/user.repository.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [UsersController, UserPhaseFController],
  providers: [UsersService, ReferralService, DpdpComplianceService, UserRepository],
  exports: [UsersService, ReferralService, DpdpComplianceService, UserRepository],
})
export class UsersModule {}
