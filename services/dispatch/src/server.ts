import http from 'node:http';
import { StandaloneDispatchEngine } from './dispatch-engine.js';

export function createDispatchServer(engine = new StandaloneDispatchEngine()) {
  const startTime = Date.now();

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    // Health check endpoint for Cloud Run
    if (pathname === '/health' || pathname === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          service: 'allgo-dispatch',
          uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
          pendingOffers: engine.getPendingOffersCount(),
        }),
      );
      return;
    }

    // Pub/Sub Push endpoint for incoming dispatch requests
    if (pathname === '/pubsub/dispatch-request' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          // Support both direct payload and GCP Pub/Sub push wrapper
          const data = parsed.message?.data
            ? JSON.parse(Buffer.from(parsed.message.data, 'base64').toString('utf8'))
            : parsed;

          const offer = engine.requestDispatch(data.request, data.candidates || []);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, offer }));
        } catch (err: any) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // Accept Offer endpoint
    if (pathname === '/offers/accept' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        try {
          const { attemptId, partnerId } = JSON.parse(body || '{}');
          const accepted = engine.acceptOffer(attemptId, partnerId);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, offer: accepted }));
        } catch (err: any) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // Fallback 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  });

  return { server, engine };
}
