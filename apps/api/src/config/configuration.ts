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
}

export function validateAndLoadConfig(): AppConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const port = parseInt(process.env.PORT || '3000', 10);

  const databaseUrl =
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/allgo_dev';

  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

  const jwtSecret =
    process.env.JWT_SECRET || 'allgo_local_dev_jwt_secret_must_be_at_least_32_characters_long_for_security';

  const otpPepper =
    process.env.OTP_PEPPER || 'allgo_local_dev_otp_pepper_secret_minimum_16_characters';

  // In production, enforce non-default secrets
  if (nodeEnv === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error('FATAL: JWT_SECRET must be set and at least 32 characters long in production.');
    }
    if (!process.env.OTP_PEPPER || process.env.OTP_PEPPER.length < 16) {
      throw new Error('FATAL: OTP_PEPPER must be set and at least 16 characters long in production.');
    }
    if (!process.env.DATABASE_URL) {
      console.warn('WARN: DATABASE_URL not set in production. Using repository fallback mode.');
    }
  }

  return {
    port,
    nodeEnv,
    databaseUrl,
    redisUrl,
    jwtSecret,
    jwtExpiresIn: '1h',
    jwtRefreshExpiresIn: '30d',
    otpPepper,
    otpTtlSeconds: 300,
    otpMaxAttempts: 3,
    otpResendCooldownSeconds: 60,
  };
}

