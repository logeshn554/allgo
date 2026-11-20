import { z } from 'zod';
/**
 * AllGo Domain User Roles
 */
export const UserRole = {
    CUSTOMER: 'CUSTOMER',
    MERCHANT: 'MERCHANT',
    DRIVER: 'DRIVER',
    ADMIN: 'ADMIN',
    // Role specializations
    PARTNER: 'PARTNER',
    MERCHANT_OPERATOR: 'MERCHANT_OPERATOR',
    MERCHANT_ADMIN: 'MERCHANT_ADMIN',
    SUPPORT_AGENT: 'SUPPORT_AGENT',
};
export const UserRoleSchema = z.nativeEnum(UserRole);
//# sourceMappingURL=user-role.js.map