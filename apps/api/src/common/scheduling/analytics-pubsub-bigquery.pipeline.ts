import crypto from 'node:crypto';

export interface AnalyticsEvent {
  eventId?: string;
  eventName: string;
  eventTime?: string;
  userId?: string;
  sessionId?: string;
  payload?: Record<string, any>;
}

export interface PubSubAnalyticsPublisher {
  publish(topic: string, data: any): Promise<any>;
}

export interface BigQueryRawEventInserter {
  insertRawEvent(table: string, row: any): Promise<boolean>;
}

export class PubSubToBigQueryAnalyticsPipeline {
  constructor(
    private readonly pubsub: PubSubAnalyticsPublisher,
    private readonly bigquery?: BigQueryRawEventInserter,
    private readonly topic: string = 'analytics-events',
    private readonly table: string = 'raw_events'
  ) {}

  async publishAnalyticsEvent(event: AnalyticsEvent): Promise<{ eventId: string; published: boolean }> {
    const eventId = event.eventId || `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const eventTime = event.eventTime || new Date().toISOString();

    const record = {
      eventId,
      eventName: event.eventName,
      eventTime,
      userId: event.userId || null,
      sessionId: event.sessionId || null,
      payload: event.payload || {},
      receivedAt: new Date().toISOString(),
    };

    // 1. Publish to Pub/Sub
    await this.pubsub.publish(this.topic, record);

    // 2. Ingest to BigQuery table
    if (this.bigquery) {
      await this.bigquery.insertRawEvent(this.table, record);
    }

    return { eventId, published: true };
  }
}
