import { z } from 'zod';

export const NodeEnvSchema = z
  .enum(['development', 'staging', 'production', 'test'])
  .default('development');
export type NodeEnv = z.infer<typeof NodeEnvSchema>;

export const ApiEnvSchema = z.object({
  NODE_ENV: NodeEnvSchema,
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().min(1).optional(),
  JWT_SECRET: z.string().optional(),
  OTP_PEPPER: z.string().optional(),
  JWT_PRIVATE_KEY: z.string().optional(),
  JWT_PUBLIC_KEY: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  GOOGLE_MAPS_SERVER_API_KEY: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_KEY: z.string().optional(),
  SMS_GATEWAY_API_KEY: z.string().optional(),
  GCS_BUCKET_NAME: z.string().optional(),
  KMS_KEY_ID: z.string().optional(),
  DISPATCH_SEARCH_RADIUS_KM: z.coerce.number().positive().default(5),
  DISPATCH_MATCH_TIMEOUT_SEC: z.coerce.number().positive().default(20),
});

export type ApiEnv = z.infer<typeof ApiEnvSchema>;

export function validateApiEnv(raw: Record<string, string | undefined> = process.env): ApiEnv {
  const parsed = ApiEnvSchema.parse(raw);

  if (parsed.NODE_ENV === 'production') {
    if (!parsed.JWT_SECRET || parsed.JWT_SECRET.length < 32) {
      throw new Error(
        'FATAL: JWT_SECRET must be set and at least 32 characters long in production.',
      );
    }
    if (!parsed.OTP_PEPPER || parsed.OTP_PEPPER.length < 16) {
      throw new Error(
        'FATAL: OTP_PEPPER must be set and at least 16 characters long in production.',
      );
    }
    if (!parsed.DATABASE_URL) {
      throw new Error('FATAL: DATABASE_URL must be configured in production.');
    }
    if (!parsed.REDIS_URL) {
      throw new Error('FATAL: REDIS_URL must be configured in production.');
    }
    if (!parsed.RAZORPAY_KEY_ID || !parsed.RAZORPAY_KEY_SECRET) {
      throw new Error('FATAL: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in production.');
    }
    if (!parsed.GOOGLE_MAPS_SERVER_API_KEY && !parsed.GOOGLE_MAPS_API_KEY) {
      throw new Error('FATAL: GOOGLE_MAPS_SERVER_API_KEY must be set in production.');
    }
    if (!parsed.FIREBASE_SERVICE_ACCOUNT_KEY) {
      throw new Error('FATAL: FIREBASE_SERVICE_ACCOUNT_KEY must be set in production.');
    }
    if (!parsed.SMS_GATEWAY_API_KEY) {
      throw new Error('FATAL: SMS_GATEWAY_API_KEY must be set in production.');
    }
    if (!parsed.GCS_BUCKET_NAME) {
      throw new Error('FATAL: GCS_BUCKET_NAME must be set in production.');
    }
    if (!parsed.KMS_KEY_ID) {
      throw new Error('FATAL: KMS_KEY_ID must be set in production.');
    }
  }

  return parsed;
}

export const DispatchEnvSchema = z.object({
  NODE_ENV: NodeEnvSchema,
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  JWT_PUBLIC_KEY: z.string().optional(),
  GOOGLE_MAPS_SERVER_API_KEY: z.string().optional(),
  DISPATCH_SEARCH_RADIUS_KM: z.coerce.number().positive().default(5),
  DISPATCH_MATCH_TIMEOUT_SEC: z.coerce.number().positive().default(20),
});

export type DispatchEnv = z.infer<typeof DispatchEnvSchema>;

export function validateDispatchEnv(
  raw: Record<string, string | undefined> = process.env,
): DispatchEnv {
  return DispatchEnvSchema.parse(raw);
}

export const WebhooksEnvSchema = z.object({
  NODE_ENV: NodeEnvSchema,
  PORT: z.coerce.number().int().positive().default(3002),
  REDIS_URL: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET_FALLBACK: z.string().optional(),
  GCP_PROJECT_ID: z.string().optional(),
});

export type WebhooksEnv = z.infer<typeof WebhooksEnvSchema>;

export function validateWebhooksEnv(
  raw: Record<string, string | undefined> = process.env,
): WebhooksEnv {
  const parsed = WebhooksEnvSchema.parse(raw);
  if (
    parsed.NODE_ENV === 'production' &&
    (!parsed.RAZORPAY_WEBHOOK_SECRET || parsed.RAZORPAY_WEBHOOK_SECRET.length < 16)
  ) {
    throw new Error('FATAL: RAZORPAY_WEBHOOK_SECRET is missing or insecure in production.');
  }
  return parsed;
}

export const AdminEnvSchema = z.object({
  NODE_ENV: NodeEnvSchema,
  PORT: z.coerce.number().int().positive().default(3003),
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
});

export type AdminEnv = z.infer<typeof AdminEnvSchema>;

export function validateAdminEnv(raw: Record<string, string | undefined> = process.env): AdminEnv {
  return AdminEnvSchema.parse(raw);
}

export const MobileEnvSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url().default('http://localhost:3000/v1'),
  EXPO_PUBLIC_WS_URL: z.string().default('ws://localhost:3000/delivery'),
  EXPO_PUBLIC_GOOGLE_MAPS_KEY: z.string().optional(),
});

export type MobileEnv = z.infer<typeof MobileEnvSchema>;

export function validateMobileEnv(raw: Record<string, string | undefined> = {}): MobileEnv {
  return MobileEnvSchema.parse(raw);
}
