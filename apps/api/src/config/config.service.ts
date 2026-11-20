import { Injectable } from '@nestjs/common';
import { type AppConfig, validateAndLoadConfig } from './configuration.js';

@Injectable()
export class ConfigService {
  private readonly config: AppConfig;

  constructor() {
    this.config = validateAndLoadConfig();
  }

  get port(): number {
    return this.config.port;
  }

  get nodeEnv(): string {
    return this.config.nodeEnv;
  }

  get isDevelopment(): boolean {
    return this.config.nodeEnv === 'development' || this.config.nodeEnv === 'test';
  }

  get isProduction(): boolean {
    return this.config.nodeEnv === 'production';
  }

  get databaseUrl(): string {
    return this.config.databaseUrl;
  }

  get redisUrl(): string {
    return this.config.redisUrl;
  }

  get jwtSecret(): string {
    return this.config.jwtSecret;
  }

  get jwtExpiresIn(): string {
    return this.config.jwtExpiresIn;
  }

  get jwtRefreshExpiresIn(): string {
    return this.config.jwtRefreshExpiresIn;
  }

  get otpPepper(): string {
    return this.config.otpPepper;
  }

  get otpTtlSeconds(): number {
    return this.config.otpTtlSeconds;
  }

  get otpMaxAttempts(): number {
    return this.config.otpMaxAttempts;
  }

  get otpResendCooldownSeconds(): number {
    return this.config.otpResendCooldownSeconds;
  }

  get firebaseServiceAccountKey(): string | undefined {
    return this.config.firebaseServiceAccountKey;
  }

  get googleMapsApiKey(): string | undefined {
    return this.config.googleMapsApiKey;
  }

  get smsGatewayApiKey(): string | undefined {
    return this.config.smsGatewayApiKey;
  }
}
