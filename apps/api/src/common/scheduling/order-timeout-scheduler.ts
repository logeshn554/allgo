export interface TimeoutTaskConfig {
  taskName: string;
  targetType: 'MERCHANT_ACCEPT' | 'PARTNER_OFFER' | 'HIRE_DRIVER_ACCEPT';
  targetId: string;
  timeoutSeconds: number;
  payload?: Record<string, any>;
}

export interface TaskGatewayClient {
  scheduleTask(options: any): Promise<{ taskName: string; scheduledFor: string }>;
  cancelTask(taskName: string): Promise<boolean>;
}

export class OrderTimeoutScheduler {
  constructor(private readonly gateway: TaskGatewayClient) {}

  async scheduleMerchantAcceptTimeout(orderId: string, timeoutSeconds: number = 300) {
    const taskName = `cloud_task_merchant_accept_${orderId}`;
    const scheduledFor = new Date(Date.now() + timeoutSeconds * 1000);
    return this.gateway.scheduleTask({
      taskName,
      targetType: 'MERCHANT_ACCEPT',
      targetId: orderId,
      scheduledFor,
      payload: { orderId, timeoutSeconds },
    });
  }

  async cancelMerchantAcceptTimeout(orderId: string) {
    const taskName = `cloud_task_merchant_accept_${orderId}`;
    return this.gateway.cancelTask(taskName);
  }

  async schedulePartnerOfferTimeout(jobId: string, attemptId: string, timeoutSeconds: number = 45) {
    const taskName = `cloud_task_partner_offer_${attemptId}`;
    const scheduledFor = new Date(Date.now() + timeoutSeconds * 1000);
    return this.gateway.scheduleTask({
      taskName,
      targetType: 'PARTNER_OFFER',
      targetId: attemptId,
      scheduledFor,
      payload: { jobId, attemptId, timeoutSeconds },
    });
  }

  async cancelPartnerOfferTimeout(attemptId: string) {
    const taskName = `cloud_task_partner_offer_${attemptId}`;
    return this.gateway.cancelTask(taskName);
  }
}
