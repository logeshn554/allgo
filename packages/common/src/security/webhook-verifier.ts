import crypto from 'node:crypto';

export type SupportedGateway = 'razorpay' | 'stripe' | 'cashfree';

export interface WebhookVerificationOptions {
  gateway: SupportedGateway;
  rawBody: Buffer | string;
  signatureHeader: string;
  secret: string;
  timestampHeader?: string;
  toleranceSeconds?: number;
}

/**
 * verifyGatewayWebhookSignature
 *
 * Cryptographically verifies raw HTTP request payloads from payment providers
 * using HMAC SHA-256 before any JSON parsing occurs.
 */
export function verifyGatewayWebhookSignature(options: WebhookVerificationOptions): boolean {
  const {
    gateway,
    rawBody,
    signatureHeader,
    secret,
    timestampHeader,
    toleranceSeconds = 300,
  } = options;

  if (!rawBody || !signatureHeader || !secret) {
    return false;
  }

  const rawBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8');

  switch (gateway) {
    case 'razorpay': {
      const expectedSignature = crypto.createHmac('sha256', secret).update(rawBuffer).digest('hex');

      const sigBuf = Buffer.from(signatureHeader.trim(), 'utf8');
      const expBuf = Buffer.from(expectedSignature, 'utf8');

      if (sigBuf.length !== expBuf.length) return false;
      return crypto.timingSafeEqual(sigBuf, expBuf);
    }

    case 'stripe': {
      // Format: t=timestamp,v1=signature
      const parts = signatureHeader.split(',').reduce<Record<string, string>>((acc, part) => {
        const [k, v] = part.split('=');
        if (k && v) acc[k.trim()] = v.trim();
        return acc;
      }, {});

      const timestamp = parts['t'];
      const v1Sig = parts['v1'];

      if (!timestamp || !v1Sig) return false;

      // Anti-replay check
      const tsNum = Number.parseInt(timestamp, 10);
      const nowSec = Math.floor(Date.now() / 1000);
      if (Math.abs(nowSec - tsNum) > toleranceSeconds) {
        return false;
      }

      const signedPayload = `${timestamp}.${rawBuffer.toString('utf8')}`;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload, 'utf8')
        .digest('hex');

      const sigBuf = Buffer.from(v1Sig, 'utf8');
      const expBuf = Buffer.from(expectedSignature, 'utf8');

      if (sigBuf.length !== expBuf.length) return false;
      return crypto.timingSafeEqual(sigBuf, expBuf);
    }

    case 'cashfree': {
      // Signature is either HMAC of (rawBody) or (timestamp + rawBody)
      const payloadToSign = timestampHeader
        ? `${timestampHeader}${rawBuffer.toString('utf8')}`
        : rawBuffer;

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payloadToSign)
        .digest('base64');

      const sigBuf = Buffer.from(signatureHeader.trim(), 'utf8');
      const expBuf = Buffer.from(expectedSignature, 'utf8');

      if (sigBuf.length !== expBuf.length) return false;
      return crypto.timingSafeEqual(sigBuf, expBuf);
    }

    default:
      return false;
  }
}
