import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { UserRepository } from './data/user.repository.js';
import { DpdpComplianceService } from './dpdp-compliance.service.js';
import { ReferralService } from './referral.service.js';
import { UserPhaseFController } from './user-phase-f.controller.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [AuthModule],
  controllers: [UsersController, UserPhaseFController],
  providers: [UsersService, ReferralService, DpdpComplianceService, UserRepository],
  exports: [UsersService, ReferralService, DpdpComplianceService, UserRepository],
})
export class UsersModule {}
