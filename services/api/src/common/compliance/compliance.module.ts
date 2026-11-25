import { Module } from '@nestjs/common';
import { ComplianceVerificationService } from './compliance-verification.service.js';

@Module({
  providers: [ComplianceVerificationService],
  exports: [ComplianceVerificationService],
})
export class ComplianceModule {}
