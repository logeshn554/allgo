import crypto from 'node:crypto';

export interface WebhookPublishMessage {
  topic: string;
  messageId: string;
  data: any;
  attributes?: Record<string, string>;
  publishTime: string;
}

export interface PubSubPublisher {
  publish(topic: string, data: any, attributes?: Record<string, string>): Promise<WebhookPublishMessage>;
}

export class InMemoryPubSubPublisher implements PubSubPublisher {
  public readonly publishedMessages: WebhookPublishMessage[] = [];

  async publish(topic: string, data: any, attributes?: Record<string, string>): Promise<WebhookPublishMessage> {
    const message: WebhookPublishMessage = {
      topic,
      messageId: `msg_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`,
      data,
      attributes: attributes || {},
      publishTime: new Date().toISOString(),
    };
    this.publishedMessages.push(message);
    return message;
  }
}
