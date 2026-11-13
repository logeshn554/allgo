import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../config/config.service.js';

export interface OtpDeliveryAdapter {
  deliverOtp(phone: string, otp: string): Promise<boolean>;
}

@Injectable()
export class LocalOtpDeliveryAdapter implements OtpDeliveryAdapter {
  private readonly logger = new Logger(LocalOtpDeliveryAdapter.name);
  private readonly devOtpStore = new Map<string, { otp: string; sentAt: number }>();

  constructor(private readonly config: ConfigService) {}

  async deliverOtp(phone: string, otp: string): Promise<boolean> {
    if (this.config.isProduction) {
      this.logger.error('CRITICAL: LocalOtpDeliveryAdapter must NOT be active in production!');
      return false;
    }

    // Store in dev buffer for local test automation and local client emulator
    this.devOtpStore.set(phone, {
      otp,
      sentAt: Date.now(),
    });

    this.logger.log(
      `[LOCAL DEV ONLY] Delivered OTP to local adapter for phone ${phone.slice(0, 3)}****${phone.slice(-4)}. (OTP: [REDACTED_DEV_OTP])`
    );

    return true;
  }

  /**
   * Retrieves the last issued OTP for automated tests.
   * Strictly disallowed in production.
   */
  getLastIssuedOtpForDevTesting(phone: string): string | undefined {
    if (this.config.isProduction) {
      throw new Error('Test OTP inspection is strictly disabled in production.');
    }
    return this.devOtpStore.get(phone)?.otp;
  }
}
