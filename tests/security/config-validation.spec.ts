import assert from 'node:assert';
import { describe, it } from 'node:test';
import { validateAndLoadConfig } from '../../services/api/dist/config/configuration.js';

describe('A.4: Production Configuration and Environment Validation', () => {
  const originalEnv = { ...process.env };

  function resetEnv() {
    process.env = { ...originalEnv };
  }

  it('should load config with development defaults when NODE_ENV is development', () => {
    resetEnv();
    process.env.NODE_ENV = 'development';
    const config = validateAndLoadConfig();

    assert.strictEqual(config.nodeEnv, 'development');
    assert.ok(config.databaseUrl);
    assert.ok(config.redisUrl);
    assert.ok(config.jwtSecret);
  });

  it('should throw fatal error in production if critical variables are missing', () => {
    resetEnv();
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;

    assert.throws(
      () => validateAndLoadConfig(),
      /FATAL: JWT_SECRET must be set and at least 32 characters long in production/i,
    );

    process.env.JWT_SECRET = 'a'.repeat(32);
    delete process.env.OTP_PEPPER;
    assert.throws(
      () => validateAndLoadConfig(),
      /FATAL: OTP_PEPPER must be set and at least 16 characters long in production/i,
    );

    process.env.OTP_PEPPER = 'b'.repeat(16);
    delete process.env.DATABASE_URL;
    assert.throws(
      () => validateAndLoadConfig(),
      /FATAL: DATABASE_URL must be configured in production/i,
    );

    process.env.DATABASE_URL = 'postgresql://allgo:pwd@host:5432/db';
    delete process.env.REDIS_URL;
    assert.throws(
      () => validateAndLoadConfig(),
      /FATAL: REDIS_URL must be configured in production/i,
    );

    process.env.REDIS_URL = 'redis://host:6379';
    delete process.env.RAZORPAY_KEY_ID;
    assert.throws(
      () => validateAndLoadConfig(),
      /FATAL: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in production/i,
    );

    process.env.RAZORPAY_KEY_ID = 'rzp_live_id';
    process.env.RAZORPAY_KEY_SECRET = 'rzp_sec';
    delete process.env.GOOGLE_MAPS_SERVER_API_KEY;
    delete process.env.GOOGLE_MAPS_API_KEY;
    assert.throws(
      () => validateAndLoadConfig(),
      /FATAL: GOOGLE_MAPS_SERVER_API_KEY must be set in production/i,
    );

    process.env.GOOGLE_MAPS_SERVER_API_KEY = 'maps_key';
    delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    assert.throws(
      () => validateAndLoadConfig(),
      /FATAL: FIREBASE_SERVICE_ACCOUNT_KEY must be set in production/i,
    );

    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = 'firebase_key';
    delete process.env.SMS_GATEWAY_API_KEY;
    assert.throws(
      () => validateAndLoadConfig(),
      /FATAL: SMS_GATEWAY_API_KEY must be set in production/i,
    );

    process.env.SMS_GATEWAY_API_KEY = 'sms_key';
    delete process.env.GCS_BUCKET_NAME;
    assert.throws(
      () => validateAndLoadConfig(),
      /FATAL: GCS_BUCKET_NAME must be set in production/i,
    );

    process.env.GCS_BUCKET_NAME = 'gcs_bucket';
    delete process.env.KMS_KEY_ID;
    assert.throws(() => validateAndLoadConfig(), /FATAL: KMS_KEY_ID must be set in production/i);
  });

  it('should successfully validate and load config when all production variables are supplied', () => {
    resetEnv();
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'production_jwt_secret_32_characters_minimum';
    process.env.OTP_PEPPER = 'production_otp_pepper_16b';
    process.env.DATABASE_URL = 'postgresql://allgo:pwd@cloudsql:5432/allgo_prod';
    process.env.REDIS_URL = 'redis://memorystore:6379';
    process.env.RAZORPAY_KEY_ID = 'rzp_live_123';
    process.env.RAZORPAY_KEY_SECRET = 'rzp_live_sec_123';
    process.env.GOOGLE_MAPS_SERVER_API_KEY = 'google_maps_key_123';
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = 'firebase_sa_key_123';
    process.env.SMS_GATEWAY_API_KEY = 'sms_api_key_123';
    process.env.GCS_BUCKET_NAME = 'allgo-prod-documents';
    process.env.KMS_KEY_ID = 'projects/prod/locations/asia-south1/keyRings/ring/cryptoKeys/key';

    const config = validateAndLoadConfig();
    assert.strictEqual(config.nodeEnv, 'production');
    assert.strictEqual(config.razorpayKeyId, 'rzp_live_123');
    assert.strictEqual(config.gcsBucketName, 'allgo-prod-documents');
    assert.strictEqual(
      config.kmsKeyId,
      'projects/prod/locations/asia-south1/keyRings/ring/cryptoKeys/key',
    );

    resetEnv();
  });
});
