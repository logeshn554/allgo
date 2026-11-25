export interface SmsSendOptions {
  dltTemplateId: string;
  senderId?: string;
  variables?: Record<string, string>;
}

export interface SmsSendResult {
  success: boolean;
  messageId: string;
  provider: string;
  dltTemplateId: string;
  dispatchedAt: string;
}

export interface SmsGateway {
  sendCriticalAlert(
    phone: string,
    message: string,
    options: SmsSendOptions,
  ): Promise<SmsSendResult>;
}

export const DLT_TEMPLATES = {
  OTP_VERIFICATION: 'DLT_TE_11071600001001',
  MERCHANT_CRITICAL_ORDER: 'DLT_TE_11071600001002',
  PARTNER_CRITICAL_ALERT: 'DLT_TE_11071600001003',
  SECURITY_LOCKOUT: 'DLT_TE_11071600001004',
  FRAUD_ALERT: 'DLT_TE_11071600001005',
} as const;
