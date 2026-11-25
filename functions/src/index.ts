import { onRequest } from 'firebase-functions/v2/https';
import express from 'express';
import cors from 'cors';

/**
 * Compatibility gateway only.
 *
 * NestJS (apps/api) is the sole AllGo identity, authorization and session
 * authority. This Firebase Function deliberately does not read/write user or
 * OTP records, mint JWTs, or assign roles. Existing clients can continue to
 * call the Firebase Function URL while they are migrated to the Core API.
 */
const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '32kb' }));

const CORE_API_URL = (
  process.env.ALLGO_CORE_API_URL || 'https://allgo-api.onrender.com'
).replace(/\/+$/, '');

const FORWARDED_REQUEST_HEADERS = [
  'accept',
  'content-type',
  'authorization',
  'x-firebase-appcheck',
  'x-device-id',
  'x-platform',
  'user-agent',
] as const;

const FORWARDED_RESPONSE_HEADERS = [
  'content-type',
  'cache-control',
  'set-cookie',
  'www-authenticate',
  'retry-after',
] as const;

app.get('/v1/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'AllGo authentication compatibility gateway',
    authority: 'NestJS Core API',
  });
});

app.all('/v1/auth/*', async (req, res) => {
  const path = req.originalUrl;
  if (!path.startsWith('/v1/auth/')) {
    return res.status(404).json({ statusCode: 404, message: 'Not found' });
  }

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = req.header(name);
    if (value) headers.set(name, value);
  }

  const method = req.method.toUpperCase();
  const body =
    method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(req.body ?? {});

  try {
    const upstream = await fetch(`${CORE_API_URL}${path}`, {
      method,
      headers,
      body,
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
    });

    for (const name of FORWARDED_RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) res.setHeader(name, value);
    }

    const responseBody = await upstream.text();
    return res.status(upstream.status).send(responseBody);
  } catch {
    // Do not log request bodies, credentials, OTPs, or upstream secrets.
    return res.status(503).json({
      statusCode: 503,
      error: 'Service Unavailable',
      message: 'Central authentication service is temporarily unavailable.',
    });
  }
});

app.all('*', (_req, res) => {
  return res.status(404).json({
    statusCode: 404,
    error: 'Not Found',
    message: 'This compatibility gateway only serves centralized authentication routes.',
  });
});

export const api = onRequest(
  { region: 'asia-south1', maxInstances: 10, cors: true },
  app,
);
