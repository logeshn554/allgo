export interface CloudSchedulerEvent {
  jobName: string;
  schedule: string;
  timestamp: string;
  triggerType: 'PAYOUTS' | 'RECONCILIATION';
}

export interface PayoutReconciliationExecutor {
  triggerDailyPayouts(): Promise<{ totalDisbursedInr: number; count: number }>;
  triggerReconciliation(): Promise<{ reconciledCount: number; discrepancyCount: number }>;
}

export class CloudSchedulerJobHandler {
  constructor(private readonly executor: PayoutReconciliationExecutor) {}

  async handleSchedulerTrigger(event: CloudSchedulerEvent) {
    if (event.triggerType === 'PAYOUTS') {
      const payoutResult = await this.executor.triggerDailyPayouts();
      return { success: true, type: 'PAYOUTS', result: payoutResult };
    }

    if (event.triggerType === 'RECONCILIATION') {
      const reconResult = await this.executor.triggerReconciliation();
      return { success: true, type: 'RECONCILIATION', result: reconResult };
    }

    throw new Error(`Unsupported scheduler trigger type: ${event.triggerType}`);
  }
}
