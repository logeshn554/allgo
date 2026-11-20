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
};
export const DEFAULT_RATE_LIMIT_CONFIG = {
    resendCooldownSeconds: 60,
    maxRequestsPerHourPhone: 3,
    maxRequestsPer15MinIp: 5,
    maxRequestsPer15MinDevice: 5,
};
export class OtpSecurityService {
    pepper;
    defaultTtlSeconds;
    maxAttempts;
    constructor(pepper, defaultTtlSeconds = 300, maxAttempts = 3) {
        if (!pepper || pepper.length < 16) {
            throw new Error('OtpSecurityService requires a cryptographically strong server pepper (min 16 chars).');
        }
        this.pepper = pepper;
        this.defaultTtlSeconds = defaultTtlSeconds;
        this.maxAttempts = maxAttempts;
    }
    generateSecureOtp(length = 6) {
        const min = Math.pow(10, length - 1);
        const max = Math.pow(10, length);
        return crypto.randomInt(min, max).toString();
    }
    computeOtpHmac(phone, otp) {
        return crypto
            .createHmac('sha256', this.pepper)
            .update(`${phone.trim()}:${otp.trim()}`)
            .digest('hex');
    }
    evaluateAtomicVerification(currentData, submittedHmac, maxAttempts = this.maxAttempts) {
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
        const isMatch = storedBuf.length === submittedBuf.length &&
            crypto.timingSafeEqual(storedBuf, submittedBuf);
        if (isMatch) {
            return { statusCode: 1, status: OtpVerificationStatus.SUCCESS };
        }
        else {
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
    store = new Map();
    security;
    lockQueue = new Map();
    constructor(securityService) {
        this.security = securityService;
    }
    async withKeyLock(key, fn) {
        while (this.lockQueue.has(key)) {
            await this.lockQueue.get(key);
        }
        let releaseLock;
        const lockPromise = new Promise((resolve) => {
            releaseLock = resolve;
        });
        this.lockQueue.set(key, lockPromise);
        try {
            return await fn();
        }
        finally {
            this.lockQueue.delete(key);
            releaseLock();
        }
    }
    async setChallenge(phone, otp, ttlSeconds = 300, maxAttempts = 3) {
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
    async verifyAndConsumeOtp(phone, submittedOtp, maxAttempts = 3) {
        const key = `otp:challenge:${phone.trim()}`;
        const submittedHmac = this.security.computeOtpHmac(phone, submittedOtp);
        return this.withKeyLock(key, () => {
            const current = this.store.get(key);
            const result = this.security.evaluateAtomicVerification(current, submittedHmac, maxAttempts);
            if (result.statusCode === 1 || result.statusCode === -2) {
                this.store.delete(key);
            }
            else if (result.statusCode === 0 && result.updatedData) {
                this.store.set(key, result.updatedData);
            }
            else if (result.statusCode === -1) {
                this.store.delete(key);
            }
            return result.status;
        });
    }
    getChallenge(phone) {
        return this.store.get(`otp:challenge:${phone.trim()}`);
    }
    clear() {
        this.store.clear();
        this.lockQueue.clear();
    }
}
//# sourceMappingURL=otp-service.js.map