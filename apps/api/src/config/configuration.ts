import fs from 'node:fs';
import path from 'node:path';

export interface AppConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  redisUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;
  otpPepper: string;
  otpTtlSeconds: number;
  otpMaxAttempts: number;
  otpResendCooldownSeconds: number;
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  razorpayWebhookSecret?: string;
  googleMapsApiKey?: string;
  firebaseServiceAccountKey?: string;
  smsGatewayApiKey?: string;
  gcsBucketName?: string;
  kmsKeyId?: string;
}

export function validateAndLoadConfig(): AppConfig {
  if (!process.env.DATABASE_URL && typeof process.loadEnvFile === 'function') {
    for (const candidate of ['.env', 'apps/api/.env', path.resolve(process.cwd(), '../../.env')]) {
      try {
        if (fs.existsSync(candidate)) {
          process.loadEnvFile(candidate);
          break;
        }
      } catch {
        // Ignore unreadable .env
      }
    }
  }

  const nodeEnv = process.env.NODE_ENV || 'development';
  const port = parseInt(process.env.PORT || '3000', 10);

  const databaseUrl =
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/allgo_dev';

  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

  const jwtSecret =
    process.env.JWT_SECRET || 'allgo_local_dev_jwt_secret_must_be_at_least_32_characters_long_for_security';

  const otpPepper =
    process.env.OTP_PEPPER || 'allgo_local_dev_otp_pepper_secret_minimum_16_characters';

  // In production, enforce all critical operational variables
  if (nodeEnv === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error('FATAL: JWT_SECRET must be set and at least 32 characters long in production.');
    }
    if (!process.env.OTP_PEPPER || process.env.OTP_PEPPER.length < 16) {
      throw new Error('FATAL: OTP_PEPPER must be set and at least 16 characters long in production.');
    }
    if (!process.env.DATABASE_URL) {
      throw new Error('FATAL: DATABASE_URL must be configured in production.');
    }
    if (!process.env.REDIS_URL) {
      throw new Error('FATAL: REDIS_URL must be configured in production.');
    }
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('FATAL: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in production.');
    }
    if (!process.env.GOOGLE_MAPS_SERVER_API_KEY && !process.env.GOOGLE_MAPS_API_KEY) {
      throw new Error('FATAL: GOOGLE_MAPS_SERVER_API_KEY must be set in production.');
    }
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      throw new Error('FATAL: FIREBASE_SERVICE_ACCOUNT_KEY must be set in production.');
    }
    if (!process.env.SMS_GATEWAY_API_KEY) {
      throw new Error('FATAL: SMS_GATEWAY_API_KEY must be set in production.');
    }
    if (!process.env.GCS_BUCKET_NAME) {
      throw new Error('FATAL: GCS_BUCKET_NAME must be set in production.');
    }
    if (!process.env.KMS_KEY_ID) {
      throw new Error('FATAL: KMS_KEY_ID must be set in production.');
    }
  }

  return {
    port,
    nodeEnv,
    databaseUrl,
    redisUrl,
    jwtSecret,
    jwtExpiresIn: '15m',
    jwtRefreshExpiresIn: '7d',
    otpPepper,
    otpTtlSeconds: 300,
    otpMaxAttempts: 3,
    otpResendCooldownSeconds: 60,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
    googleMapsApiKey: process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.GOOGLE_MAPS_API_KEY,
    firebaseServiceAccountKey: process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    smsGatewayApiKey: process.env.SMS_GATEWAY_API_KEY,
    gcsBucketName: process.env.GCS_BUCKET_NAME,
    kmsKeyId: process.env.KMS_KEY_ID,
  };
}
