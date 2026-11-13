import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { db } from '../../config/database';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export interface CartItemInput {
  productId: string;
  quantity: number;
}

export interface CalculatedOrder {
  subtotalCents: number;
  deliveryFeeCents: number;
  surgeMultiplier: number;
  taxCents: number;
  totalCents: number;
  validatedItems: Array<{
    productId: string;
    title: string;
    unitPriceCents: number;
    quantity: number;
    lineTotalCents: number;
  }>;
}

export async function calculateVerifiedOrderTotal(
  items: CartItemInput[],
  pickupCoords: { lat: number; lng: number },
  dropoffCoords: { lat: number; lng: number }
): Promise<CalculatedOrder> {
  if (!items || items.length === 0) {
    throw new Error('Cart cannot be empty.');
  }

  const productIds = items.map((i) => i.productId);
  const dbProducts = await db('products')
    .whereIn('id', productIds)
    .andWhere({ is_available: true });

  if (dbProducts.length !== productIds.length) {
    throw new Error('One or more items in your cart are invalid or out of stock.');
  }

  const productMap = new Map(dbProducts.map((p) => [p.id, p]));
  let subtotalCents = 0;

  const validatedItems = items.map((item) => {
    const product = productMap.get(item.productId)!;
    if (product.stock_quantity < item.quantity) {
      throw new Error(`Insufficient stock for item: ${product.title}`);
    }
    const lineTotalCents = product.price_cents * item.quantity;
    subtotalCents += lineTotalCents;

    return {
      productId: product.id,
      title: product.title,
      unitPriceCents: product.price_cents,
      quantity: item.quantity,
      lineTotalCents,
    };
  });

  const R = 6371;
  const dLat = ((dropoffCoords.lat - pickupCoords.lat) * Math.PI) / 180;
  const dLng = ((dropoffCoords.lng - pickupCoords.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((pickupCoords.lat * Math.PI) / 180) *
      Math.cos((dropoffCoords.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const baseDeliveryCents = 3000;
  const perKmRateCents = 1200;
  const rawDeliveryCents = Math.round(baseDeliveryCents + distanceKm * perKmRateCents);

  const surgeKey = `surge:zone:${Math.floor(pickupCoords.lat * 100)}_${Math.floor(pickupCoords.lng * 100)}`;
  const cachedSurge = await redis.get(surgeKey);
  const surgeMultiplier = cachedSurge ? Math.max(1.0, parseFloat(cachedSurge)) : 1.0;

  const deliveryFeeCents = Math.round(rawDeliveryCents * surgeMultiplier);
  const taxCents = Math.round((subtotalCents + deliveryFeeCents) * 0.05);
  const totalCents = subtotalCents + deliveryFeeCents + taxCents;

  return {
    subtotalCents,
    deliveryFeeCents,
    surgeMultiplier,
    taxCents,
    totalCents,
    validatedItems,
  };
}

export function verifyWebhookSignature(
  provider: 'razorpay' | 'stripe' | 'cashfree',
  secret: string
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const rawBody = (req as any).rawBody;
    if (!rawBody) {
      res.status(400).json({ error: 'Missing raw payload for signature verification.' });
      return;
    }

    let signature = '';
    if (provider === 'razorpay') {
      signature = req.headers['x-razorpay-signature'] as string;
    } else if (provider === 'stripe') {
      const sigHeader = (req.headers['stripe-signature'] as string) || '';
      const parts = sigHeader.split(',').reduce((acc: any, part) => {
        const [key, value] = part.split('=');
        acc[key.trim()] = value;
        return acc;
      }, {});
      signature = parts['v1'];
    } else if (provider === 'cashfree') {
      signature = req.headers['x-webhook-signature'] as string;
    }

    if (!signature) {
      res.status(400).json({ error: 'Missing webhook signature header.' });
      return;
    }

    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const expectedBuf = Buffer.from(expected, 'utf8');
    const providedBuf = Buffer.from(signature, 'utf8');

    if (
      expectedBuf.length !== providedBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, providedBuf)
    ) {
      res.status(401).json({ error: 'Invalid HMAC signature.' });
      return;
    }

    next();
  };
}

export async function rateLimitOtpVerification(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const orderId = req.params.id;
  const attemptsKey = `ratelimit:otp:attempts:${orderId}`;
  const lockoutKey = `ratelimit:otp:lockout:${orderId}`;

  const isLocked = await redis.get(lockoutKey);
  if (isLocked) {
    res.status(429).json({
      error: 'Too many failed verification attempts. Verification is locked for 15 minutes.',
    });
    return;
  }

  const currentAttempts = await redis.incr(attemptsKey);
  if (currentAttempts === 1) {
    await redis.expire(attemptsKey, 900);
  }

  if (currentAttempts > 3) {
    await redis.set(lockoutKey, 'locked', 'EX', 900);
    await redis.del(attemptsKey);
    res.status(429).json({
      error: 'OTP verification locked due to consecutive failures. Please try again in 15 minutes.',
    });
    return;
  }

  next();
}
