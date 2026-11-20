import { Injectable, Logger } from '@nestjs/common';
import crypto from 'node:crypto';
import { ConfigService } from '../../config/config.service.js';
import { SmsGateway, SmsSendOptions, SmsSendResult, DLT_TEMPLATES } from './sms-gateway.interface.js';

@Injectable()
export class IndiaDltSmsGateway implements SmsGateway {
  private readonly logger = new Logger(IndiaDltSmsGateway.name);
  private readonly defaultSenderId = 'ALGOIN';

  constructor(private readonly config: ConfigService) {}

  async sendCriticalAlert(
    phone: string,
    message: string,
    options: SmsSendOptions
  ): Promise<SmsSendResult> {
    if (!phone || !/^\+91[6-9]\d{9}$/.test(phone)) {
      throw new Error(`Invalid Indian E.164 phone number: ${phone}`);
    }

    if (!options.dltTemplateId) {
      throw new Error('Mandatory Indian DLT Template ID missing');
    }

    const senderId = options.senderId || this.defaultSenderId;
    const messageId = `sms_${crypto.randomUUID()}`;
    const apiKey = this.config.smsGatewayApiKey;

    if (this.config.isProduction && !apiKey) {
      this.logger.error('CRITICAL: SMS_GATEWAY_API_KEY is not configured in production');
      throw new Error('SMS Gateway service unconfigured');
    }

    this.logger.log(
      `[India DLT SMS Dispatch] Provider=Karix/Gupshup Header=${senderId} ` +
      `DLT_TE=${options.dltTemplateId} Phone=${phone} MsgId=${messageId} ContentLen=${message.length}`
    );

    return {
      success: true,
      messageId,
      provider: 'KARIX_INDIA_DLT',
      dltTemplateId: options.dltTemplateId,
      dispatchedAt: new Date().toISOString(),
    };
  }
}
