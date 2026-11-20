import { describe, it } from 'node:test';
import assert from 'node:assert';
import { OrderTimeoutScheduler } from '../../apps/api/dist/common/scheduling/order-timeout-scheduler.js';
import { CloudSchedulerJobHandler } from '../../apps/api/dist/common/scheduling/cloud-scheduler-job-handler.js';
import { PubSubToBigQueryAnalyticsPipeline } from '../../apps/api/dist/common/scheduling/analytics-pubsub-bigquery.pipeline.js';
import { SecretManagerLoader } from '../../apps/api/dist/config/secret-manager-loader.js';

describe('2. Cloud Tasks for Timeouts (Merchant Accept & Partner Offer)', () => {
  it('should schedule and cancel merchant and partner offer timeout tasks', async () => {
    const scheduledTasks: any[] = [];
    const cancelledTasks: string[] = [];

    const mockGateway = {
      async scheduleTask(opts: any) {
        scheduledTasks.push(opts);
        return { taskName: opts.taskName, scheduledFor: opts.scheduledFor.toISOString() };
      },
      async cancelTask(name: string) {
        cancelledTasks.push(name);
        return true;
      },
    };

    const scheduler = new OrderTimeoutScheduler(mockGateway);
    const mRes = await scheduler.scheduleMerchantAcceptTimeout('ord_m_1', 120);
    assert.strictEqual(mRes.taskName, 'cloud_task_merchant_accept_ord_m_1');
    assert.strictEqual(scheduledTasks[0].targetType, 'MERCHANT_ACCEPT');

    await scheduler.cancelMerchantAcceptTimeout('ord_m_1');
    assert.ok(cancelledTasks.includes('cloud_task_merchant_accept_ord_m_1'));

    const pRes = await scheduler.schedulePartnerOfferTimeout('job_123', 'att_789', 30);
    assert.strictEqual(pRes.taskName, 'cloud_task_partner_offer_att_789');
    assert.strictEqual(scheduledTasks[1].targetType, 'PARTNER_OFFER');

    await scheduler.cancelPartnerOfferTimeout('att_789');
    assert.ok(cancelledTasks.includes('cloud_task_partner_offer_att_789'));
  });
});

describe('3. Cloud Scheduler for Payouts & Reconciliation', () => {
  it('should execute daily payouts and automated reconciliation triggers', async () => {
    let payoutsRun = false;
    let reconRun = false;

    const mockExecutor = {
      async triggerDailyPayouts() {
        payoutsRun = true;
        return { totalDisbursedInr: 12500, count: 15 };
      },
      async triggerReconciliation() {
        reconRun = true;
        return { reconciledCount: 150, discrepancyCount: 0 };
      },
    };

    const handler = new CloudSchedulerJobHandler(mockExecutor);

    const pRes = await handler.handleSchedulerTrigger({
      jobName: 'daily-payouts-0600',
      schedule: '0 6 * * *',
      timestamp: new Date().toISOString(),
      triggerType: 'PAYOUTS',
    });
    assert.strictEqual(payoutsRun, true);
    assert.strictEqual(pRes.result.totalDisbursedInr, 12500);

    const rRes = await handler.handleSchedulerTrigger({
      jobName: 'nightly-recon-0200',
      schedule: '0 2 * * *',
      timestamp: new Date().toISOString(),
      triggerType: 'RECONCILIATION',
    });
    assert.strictEqual(reconRun, true);
    assert.strictEqual(rRes.result.reconciledCount, 150);
  });
});

describe('4. Pub/Sub to BigQuery Analytics Pipeline', () => {
  it('should publish events to Pub/Sub and ingest to BigQuery table', async () => {
    const publishedMsgs: any[] = [];
    const insertedRows: any[] = [];

    const mockPubSub = {
      async publish(topic: string, data: any) {
        publishedMsgs.push({ topic, data });
        return { messageId: 'msg_1' };
      },
    };

    const mockBigQuery = {
      async insertRawEvent(table: string, row: any) {
        insertedRows.push({ table, row });
        return true;
      },
    };

    const pipeline = new PubSubToBigQueryAnalyticsPipeline(mockPubSub, mockBigQuery);
    const res = await pipeline.publishAnalyticsEvent({
      eventName: 'ORDER_PLACED',
      userId: 'usr_abc',
      payload: { amountInr: 450, vertical: 'FOOD' },
    });

    assert.strictEqual(res.published, true);
    assert.strictEqual(publishedMsgs.length, 1);
    assert.strictEqual(publishedMsgs[0].topic, 'analytics-events');
    assert.strictEqual(insertedRows.length, 1);
    assert.strictEqual(insertedRows[0].table, 'raw_events');
  });
});

describe('5. Secret Manager Loader at Startup', () => {
  it('should load secrets and cache them for fast subsequent access', async () => {
    const loader = new SecretManagerLoader({ projectId: 'allgo-dev' });
    process.env.TEST_SECRET_KEY = 'super_secret_value_123';

    const val1 = await loader.loadSecret('TEST_SECRET_KEY');
    assert.strictEqual(val1, 'super_secret_value_123');

    const val2 = await loader.loadSecret('TEST_SECRET_KEY');
    assert.strictEqual(val2, 'super_secret_value_123');

    const all = await loader.loadAllStartupSecrets(['TEST_SECRET_KEY', 'FALLBACK_SECRET']);
    assert.strictEqual(all.TEST_SECRET_KEY, 'super_secret_value_123');
    assert.ok(all.FALLBACK_SECRET.startsWith('sm_secret_fallback_secret_'));

    delete process.env.TEST_SECRET_KEY;
  });
});
