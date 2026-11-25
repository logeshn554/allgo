import { validateWebhooksEnv } from '@allgo/env';
import { createWebhookServer } from './server.js';
import { WebhookService } from './webhook.service.js';

const env = validateWebhooksEnv(process.env);
const service = new WebhookService(env.RAZORPAY_WEBHOOK_SECRET);
const { server } = createWebhookServer(service);

server.listen(env.PORT, () => {
  console.log(`[AllGo Webhooks Service] listening on port ${env.PORT} (${env.NODE_ENV})`);
});
