/**
 * AllGo Platform - Cryptographic OTP Generation, Rate Limiting & Atomic Verification
 *
 * Security Invariants:
 * 1. Plaintext OTPs are NEVER persisted in Redis or database (only keyed HMAC-SHA256).
 * 2. OTP verification is strictly atomic via Redis Lua script, eliminating race conditions.
 * 3. Exactly-once consumption: A valid OTP challenge is immediately deleted upon match.
 * 4. Concurrent duplicate requests cannot both succeed.
 */
export declare const ATOMIC_OTP_VERIFY_AND_CONSUME_LUA: string;
export declare const OtpVerificationStatus: {
    readonly SUCCESS: "SUCCESS";
    readonly INVALID_OTP: "INVALID_OTP";
    readonly EXPIRED_OR_NOT_FOUND: "EXPIRED_OR_NOT_FOUND";
    readonly MAX_ATTEMPTS_EXCEEDED: "MAX_ATTEMPTS_EXCEEDED";
    readonly RATE_LIMITED: "RATE_LIMITED";
};
export type OtpVerificationStatus = (typeof OtpVerificationStatus)[keyof typeof OtpVerificationStatus];
export interface OtpChallengeData {
    phone: string;
    hmac: string;
    attempts: number;
    maxAttempts: number;
    expiresAt: number;
}
export interface RateLimitConfig {
    resendCooldownSeconds: number;
    maxRequestsPerHourPhone: number;
    maxRequestsPer15MinIp: number;
    maxRequestsPer15MinDevice: number;
}
export declare const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig;
export declare class OtpSecurityService {
    private readonly pepper;
    private readonly defaultTtlSeconds;
    private readonly maxAttempts;
    constructor(pepper: string, defaultTtlSeconds?: number, maxAttempts?: number);
    /**
     * Generates a cryptographically secure random 6-digit numeric OTP.
     * Utilizes node:crypto.randomInt to guarantee uniform distribution.
     */
    generateSecureOtp(length?: number): string;
    /**
     * Computes a keyed HMAC-SHA256 digest over the phone and OTP using server pepper.
     */
    computeOtpHmac(phone: string, otp: string): string;
    /**
     * Evaluates the atomic Redis Lua verification script logic.
     * Ensures identical atomic semantics in live Redis and testing environments.
     */
    evaluateAtomicVerification(currentData: OtpChallengeData | undefined, submittedHmac: string, maxAttempts?: number): {
        statusCode: number;
        status: OtpVerificationStatus;
        updatedData?: OtpChallengeData;
    };
}
/**
 * Thread-safe, atomic in-memory challenge store simulating Redis single-threaded execution.
 * Allows deterministic concurrency and race-condition testing without live Redis.
 */
export declare class AtomicOtpChallengeStore {
    private readonly store;
    private readonly security;
    private readonly lockQueue;
    constructor(securityService: OtpSecurityService);
    /**
     * Acquire a per-key sequential lock to emulate Redis single-threaded atomic Lua execution.
     */
    private withKeyLock;
    setChallenge(phone: string, otp: string, ttlSeconds?: number, maxAttempts?: number): Promise<string>;
    /**
     * Atomically verifies the OTP challenge and consumes it upon success.
     */
    verifyAndConsumeOtp(phone: string, submittedOtp: string, maxAttempts?: number): Promise<OtpVerificationStatus>;
    getChallenge(phone: string): OtpChallengeData | undefined;
    clear(): void;
}
//# sourceMappingURL=otp-service.d.ts.map