import crypto from 'node:crypto';

export const ATOMIC_OTP_VERIFY_AND_CONSUME_LUA = `
-- Keys:
-- KEYS[1]: Challenge Key (e.g. "otp:challenge:+919876543210")
-- Arguments:
-- ARGV[1]: Expected HMAC digest (SHA-256)
-- ARGV[2]: Maximum allowed verification attempts (e.g. 3)

local exists = redis.call('EXISTS', KEYS[1])
if exists == 0 then
    return -1
end

local attempts = tonumber(redis.call('HGET', KEYS[1], 'attempts') or '0')
local max_attempts = tonumber(ARGV[2])

if attempts >= max_attempts then
    redis.call('DEL', KEYS[1])
    return -2
end

local stored_hmac = redis.call('HGET', KEYS[1], 'hmac')

if stored_hmac == ARGV[1] then
    -- Successful verification: Consume challenge atomically immediately
    redis.call('DEL', KEYS[1])
    return 1
else
    -- Mismatch: Increment attempts atomically
    local new_attempts = redis.call('HINCRBY', KEYS[1], 'attempts', 1)
    if new_attempts >= max_attempts then
        redis.call('DEL', KEYS[1])
        return -2
    end
    return 0
end
`.trim();

export const OtpVerificationStatus = {
  SUCCESS: 'SUCCESS',
  INVALID_OTP: 'INVALID_OTP',
  EXPIRED_OR_NOT_FOUND: 'EXPIRED_OR_NOT_FOUND',
  MAX_ATTEMPTS_EXCEEDED: 'MAX_ATTEMPTS_EXCEEDED',
  RATE_LIMITED: 'RATE_LIMITED',
} as const;

export type OtpVerificationStatus =
  (typeof OtpVerificationStatus)[keyof typeof OtpVerificationStatus];

export interface OtpChallengeData {
  phone: string;
  hmac: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: number; // Unix timestamp ms
}

export interface RateLimitConfig {
  resendCooldownSeconds: number; // 60s
  maxRequestsPerHourPhone: number; // 3
  maxRequestsPer15MinIp: number; // 5
  maxRequestsPer15MinDevice: number; // 5
}

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  resendCooldownSeconds: 60,
  maxRequestsPerHourPhone: 3,
  maxRequestsPer15MinIp: 5,
  maxRequestsPer15MinDevice: 5,
};

export class OtpSecurityService {
  private readonly pepper: string;
  private readonly defaultTtlSeconds: number;
  private readonly maxAttempts: number;

  constructor(pepper: string, defaultTtlSeconds: number = 300, maxAttempts: number = 3) {
    if (!pepper || pepper.length < 16) {
      throw new Error('OtpSecurityService requires a cryptographically strong server pepper (min 16 chars).');
    }
    this.pepper = pepper;
    this.defaultTtlSeconds = defaultTtlSeconds;
    this.maxAttempts = maxAttempts;
  }

  public generateSecureOtp(length: number = 6): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length);
    return crypto.randomInt(min, max).toString();
  }

  public computeOtpHmac(phone: string, otp: string): string {
    return crypto
      .createHmac('sha256', this.pepper)
      .update(`${phone.trim()}:${otp.trim()}`)
      .digest('hex');
  }

  public evaluateAtomicVerification(
    currentData: OtpChallengeData | undefined,
    submittedHmac: string,
    maxAttempts: number = this.maxAttempts
  ): {
    statusCode: number; // 1 = SUCCESS, 0 = INVALID, -1 = EXPIRED/NONE, -2 = EXCEEDED
    status: OtpVerificationStatus;
    updatedData?: OtpChallengeData;
  } {
    if (!currentData) {
      return { statusCode: -1, status: OtpVerificationStatus.EXPIRED_OR_NOT_FOUND };
    }

    if (Date.now() > currentData.expiresAt) {
      return { statusCode: -1, status: OtpVerificationStatus.EXPIRED_OR_NOT_FOUND };
    }

    if (currentData.attempts >= maxAttempts) {
      return { statusCode: -2, status: OtpVerificationStatus.MAX_ATTEMPTS_EXCEEDED };
    }

    const storedBuf = Buffer.from(currentData.hmac, 'hex');
    const submittedBuf = Buffer.from(submittedHmac, 'hex');

    const isMatch =
      storedBuf.length === submittedBuf.length &&
      crypto.timingSafeEqual(storedBuf, submittedBuf);

    if (isMatch) {
      return { statusCode: 1, status: OtpVerificationStatus.SUCCESS };
    } else {
      const newAttempts = currentData.attempts + 1;
      if (newAttempts >= maxAttempts) {
        return { statusCode: -2, status: OtpVerificationStatus.MAX_ATTEMPTS_EXCEEDED };
      }
      return {
        statusCode: 0,
        status: OtpVerificationStatus.INVALID_OTP,
        updatedData: { ...currentData, attempts: newAttempts },
      };
    }
  }
}

export class AtomicOtpChallengeStore {
  private readonly store = new Map<string, OtpChallengeData>();
  private readonly security: OtpSecurityService;
  private readonly lockQueue = new Map<string, Promise<void>>();

  constructor(securityService: OtpSecurityService) {
    this.security = securityService;
  }

  private async withKeyLock<T>(key: string, fn: () => Promise<T> | T): Promise<T> {
    while (this.lockQueue.has(key)) {
      await this.lockQueue.get(key);
    }

    let releaseLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    this.lockQueue.set(key, lockPromise);

    try {
      return await fn();
    } finally {
      this.lockQueue.delete(key);
      releaseLock!();
    }
  }

  public async setChallenge(
    phone: string,
    otp: string,
    ttlSeconds: number = 300,
    maxAttempts: number = 3
  ): Promise<string> {
    const key = `otp:challenge:${phone.trim()}`;
    const hmac = this.security.computeOtpHmac(phone, otp);

    return this.withKeyLock(key, () => {
      this.store.set(key, {
        phone: phone.trim(),
        hmac,
        attempts: 0,
        maxAttempts,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
      return hmac;
    });
  }

  public async verifyAndConsumeOtp(
    phone: string,
    submittedOtp: string,
    maxAttempts: number = 3
  ): Promise<OtpVerificationStatus> {
    const key = `otp:challenge:${phone.trim()}`;
    const submittedHmac = this.security.computeOtpHmac(phone, submittedOtp);

    return this.withKeyLock(key, () => {
      const current = this.store.get(key);
      const result = this.security.evaluateAtomicVerification(current, submittedHmac, maxAttempts);

      if (result.statusCode === 1 || result.statusCode === -2) {
        this.store.delete(key);
      } else if (result.statusCode === 0 && result.updatedData) {
        this.store.set(key, result.updatedData);
      } else if (result.statusCode === -1) {
        this.store.delete(key);
      }

      return result.status;
    });
  }

  public getChallenge(phone: string): OtpChallengeData | undefined {
    return this.store.get(`otp:challenge:${phone.trim()}`);
  }

  public clear(): void {
    this.store.clear();
    this.lockQueue.clear();
  }
}
