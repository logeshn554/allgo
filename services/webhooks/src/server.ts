import http from 'node:http';
import { WebhookService } from './webhook.service.js';

export function createWebhookServer(service = new WebhookService()) {
  const startTime = Date.now();

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    if (pathname === '/health' || pathname === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          service: 'allgo-webhooks',
          uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
        }),
      );
      return;
    }

    if (pathname === '/v1/webhooks/razorpay' && req.method === 'POST') {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', async () => {
        try {
          const rawBody = Buffer.concat(chunks);
          const signature = String(req.headers['x-razorpay-signature'] || '');
          const eventData = JSON.parse(rawBody.toString('utf8') || '{}');
          const result = await service.handleInboundWebhook(rawBody, signature, eventData);

          if (result.status === 'INVALID_SIGNATURE') {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (err: any) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err?.message || 'Invalid webhook payload' }));
        }
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  });

  return { server, service };
}
