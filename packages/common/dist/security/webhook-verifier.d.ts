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
export declare function verifyGatewayWebhookSignature(options: WebhookVerificationOptions): boolean;
//# sourceMappingURL=webhook-verifier.d.ts.map