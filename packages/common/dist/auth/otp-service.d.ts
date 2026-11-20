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
    generateSecureOtp(length?: number): string;
    computeOtpHmac(phone: string, otp: string): string;
    evaluateAtomicVerification(currentData: OtpChallengeData | undefined, submittedHmac: string, maxAttempts?: number): {
        statusCode: number;
        status: OtpVerificationStatus;
        updatedData?: OtpChallengeData;
    };
}
export declare class AtomicOtpChallengeStore {
    private readonly store;
    private readonly security;
    private readonly lockQueue;
    constructor(securityService: OtpSecurityService);
    private withKeyLock;
    setChallenge(phone: string, otp: string, ttlSeconds?: number, maxAttempts?: number): Promise<string>;
    verifyAndConsumeOtp(phone: string, submittedOtp: string, maxAttempts?: number): Promise<OtpVerificationStatus>;
    getChallenge(phone: string): OtpChallengeData | undefined;
    clear(): void;
}
//# sourceMappingURL=otp-service.d.ts.map