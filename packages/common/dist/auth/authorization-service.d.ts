/**
 * AllGo Production Foundation - Authoritative Multi-Role Authorization Service
 *
 * Implements strict PostgreSQL/Redis authoritative permissions checking:
 * 1. Single phone number / user with multiple roles (Customer, Partner, Merchant, Admin)
 * 2. Instant two-tier revocation (Redis status check <1ms, independent of JWT expiry)
 * 3. Stale token claim detection (JWT claims are non-authoritative convenience only)
 * 4. Contextual role-switching enforcement (e.g. Courier mode vs Customer mode)
 */
import { UserRole } from '../contracts/user-role.ts';
export { UserRole };
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'PENDING_VERIFICATION';
export interface AssignedRole {
    role: UserRole;
    status: 'ACTIVE' | 'SUSPENDED';
    entityId?: string;
}
export interface UserIdentity {
    userId: string;
    phoneNumber: string;
    accountStatus: AccountStatus;
    roles: AssignedRole[];
}
export interface AuthorizationCheckRequest {
    identity: UserIdentity;
    activeRoleContext: UserRole;
    requiredRoles: UserRole[];
    requireActiveAccount?: boolean;
}
export interface AuthorizationDecision {
    allowed: boolean;
    reason?: string;
    activeRole?: AssignedRole;
}
/**
 * Authoritatively evaluates access request against database/Redis truth.
 * Firebase token claims are never trusted for authorization decisions.
 */
export declare function evaluateAuthoritativeAccess(req: AuthorizationCheckRequest): AuthorizationDecision;
/**
 * Detects discrepancies between non-authoritative client claims and backend truth.
 */
export declare function detectStaleClaims(tokenClaims: {
    roles?: string[];
    status?: string;
}, authoritativeIdentity: UserIdentity): {
    isStale: boolean;
    discrepancies: string[];
};
//# sourceMappingURL=authorization-service.d.ts.map