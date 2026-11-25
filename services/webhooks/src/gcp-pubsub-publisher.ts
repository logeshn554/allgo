import crypto from 'node:crypto';
import type { PubSubPublisher, WebhookPublishMessage } from './pubsub-publisher.js';

export interface GcpPubSubTopicLike {
  publishMessage(options: { data: Buffer; attributes?: Record<string, string> }): Promise<string>;
}

export interface GcpPubSubClientLike {
  topic(name: string): GcpPubSubTopicLike;
}

export class GcpPubSubPublisher implements PubSubPublisher {
  constructor(private readonly pubsubClient: GcpPubSubClientLike) {}

  async publish(
    topicName: string,
    data: any,
    attributes?: Record<string, string>,
  ): Promise<WebhookPublishMessage> {
    const dataBuffer = Buffer.from(JSON.stringify(data));
    const topic = this.pubsubClient.topic(topicName);
    const messageId = await topic.publishMessage({
      data: dataBuffer,
      attributes: attributes || {},
    });

    return {
      topic: topicName,
      messageId: messageId || `pub_${crypto.randomBytes(4).toString('hex')}`,
      data,
      attributes: attributes || {},
      publishTime: new Date().toISOString(),
    };
  }
}
