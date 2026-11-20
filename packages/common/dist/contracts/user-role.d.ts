import { z } from 'zod';
/**
 * AllGo Domain User Roles
 */
export declare const UserRole: {
    readonly CUSTOMER: "CUSTOMER";
    readonly MERCHANT: "MERCHANT";
    readonly DRIVER: "DRIVER";
    readonly ADMIN: "ADMIN";
    readonly PARTNER: "PARTNER";
    readonly MERCHANT_OPERATOR: "MERCHANT_OPERATOR";
    readonly MERCHANT_ADMIN: "MERCHANT_ADMIN";
    readonly SUPPORT_AGENT: "SUPPORT_AGENT";
};
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
export declare const UserRoleSchema: z.ZodEnum<{
    readonly CUSTOMER: "CUSTOMER";
    readonly MERCHANT: "MERCHANT";
    readonly DRIVER: "DRIVER";
    readonly ADMIN: "ADMIN";
    readonly PARTNER: "PARTNER";
    readonly MERCHANT_OPERATOR: "MERCHANT_OPERATOR";
    readonly MERCHANT_ADMIN: "MERCHANT_ADMIN";
    readonly SUPPORT_AGENT: "SUPPORT_AGENT";
}>;
//# sourceMappingURL=user-role.d.ts.map