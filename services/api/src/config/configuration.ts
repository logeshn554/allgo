import fs from 'node:fs';
import path from 'node:path';
import { validateApiEnv } from '@allgo/env';

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
    for (const candidate of [
      '.env',
      'services/api/.env',
      path.resolve(process.cwd(), '../../.env'),
    ]) {
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

  const env = validateApiEnv(process.env);

  return {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    databaseUrl: env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/allgo_dev',
    redisUrl: env.REDIS_URL || 'redis://127.0.0.1:6379',
    jwtSecret:
      env.JWT_SECRET ||
      'allgo_local_dev_jwt_secret_must_be_at_least_32_characters_long_for_security',
    jwtExpiresIn: '15m',
    jwtRefreshExpiresIn: '7d',
    otpPepper: env.OTP_PEPPER || 'allgo_local_dev_otp_pepper_secret_minimum_16_characters',
    otpTtlSeconds: 300,
    otpMaxAttempts: 3,
    otpResendCooldownSeconds: 60,
    razorpayKeyId: env.RAZORPAY_KEY_ID,
    razorpayKeySecret: env.RAZORPAY_KEY_SECRET,
    razorpayWebhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
    googleMapsApiKey: env.GOOGLE_MAPS_SERVER_API_KEY || env.GOOGLE_MAPS_API_KEY,
    firebaseServiceAccountKey: env.FIREBASE_SERVICE_ACCOUNT_KEY,
    smsGatewayApiKey: env.SMS_GATEWAY_API_KEY,
    gcsBucketName: env.GCS_BUCKET_NAME,
    kmsKeyId: env.KMS_KEY_ID,
  };
}
