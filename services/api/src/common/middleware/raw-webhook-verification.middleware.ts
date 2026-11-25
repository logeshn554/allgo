import { SupportedGateway, verifyGatewayWebhookSignature } from '@allgo/common';
import { BadRequestException, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class RawWebhookVerificationMiddleware implements NestMiddleware {
  use(req: Request & { rawBody?: Buffer }, _res: Response, next: NextFunction) {
    const path = req.path || req.url;

    // Detect Gateway from headers or route
    let gateway: SupportedGateway = 'razorpay';
    let signatureHeader = (req.headers['x-razorpay-signature'] as string) || '';
    let secret =
      process.env.RAZORPAY_WEBHOOK_SECRET ||
      process.env.RAZORPAY_KEY_SECRET ||
      'local_test_razorpay_secret_key_12345';

    if (req.headers['stripe-signature']) {
      gateway = 'stripe';
      signatureHeader = req.headers['stripe-signature'] as string;
      secret = process.env.STRIPE_WEBHOOK_SECRET || 'local_test_stripe_secret';
    } else if (req.headers['x-webhook-signature']) {
      gateway = 'cashfree';
      signatureHeader = req.headers['x-webhook-signature'] as string;
      secret = process.env.CASHFREE_WEBHOOK_SECRET || 'local_test_cashfree_secret';
    }

    if (!signatureHeader && process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Missing webhook cryptographic signature header');
    }

    const rawBody = req.rawBody || (req.body ? JSON.stringify(req.body) : '');

    if (signatureHeader) {
      const isValid = verifyGatewayWebhookSignature({
        gateway,
        rawBody,
        signatureHeader,
        secret,
        timestampHeader: req.headers['x-webhook-timestamp'] as string,
      });

      if (!isValid && process.env.NODE_ENV === 'production') {
        throw new BadRequestException(`Invalid ${gateway} webhook signature`);
      }
    }

    next();
  }
}
