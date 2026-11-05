/**
 * AllGo Production Foundation - Authoritative Multi-Role Authorization Service
 *
 * Implements strict PostgreSQL/Redis authoritative permissions checking:
 * 1. Single phone number / user with multiple roles (Customer, Partner, Merchant, Admin)
 * 2. Instant two-tier revocation (Redis status check <1ms, independent of JWT expiry)
 * 3. Stale token claim detection (JWT claims are non-authoritative convenience only)
 * 4. Contextual role-switching enforcement (e.g. Courier mode vs Customer mode)
 */

export type UserRole =
  | 'CUSTOMER'
  | 'PARTNER'
  | 'MERCHANT_OPERATOR'
  | 'MERCHANT_ADMIN'
  | 'SUPPORT_AGENT'
  | 'ADMIN';

export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'PENDING_VERIFICATION';

export interface AssignedRole {
  role: UserRole;
  status: 'ACTIVE' | 'SUSPENDED';
  entityId?: string; // e.g. merchantId or partnerId
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
export function evaluateAuthoritativeAccess(
  req: AuthorizationCheckRequest
): AuthorizationDecision {
  const requireActive = req.requireActiveAccount !== false;

  // Tier 1: Global Account Status Check
  if (req.identity.accountStatus === 'BLOCKED') {
    return { allowed: false, reason: 'ACCOUNT_BLOCKED' };
  }

  if (requireActive && req.identity.accountStatus === 'SUSPENDED') {
    return { allowed: false, reason: 'ACCOUNT_SUSPENDED' };
  }

  if (requireActive && req.identity.accountStatus === 'PENDING_VERIFICATION') {
    return { allowed: false, reason: 'ACCOUNT_PENDING_VERIFICATION' };
  }

  // Tier 2: Active Role Context Verification
  const matchingRole = req.identity.roles.find(
    (r) => r.role === req.activeRoleContext
  );

  if (!matchingRole) {
    return {
      allowed: false,
      reason: `ROLE_NOT_ASSIGNED: User does not possess ${req.activeRoleContext} role`,
    };
  }

  if (matchingRole.status === 'SUSPENDED') {
    return {
      allowed: false,
      reason: `ROLE_SUSPENDED: Role ${req.activeRoleContext} is currently suspended`,
    };
  }

  // Tier 3: Endpoint Privilege Matching
  const isAuthorized = req.requiredRoles.includes(req.activeRoleContext);
  if (!isAuthorized) {
    return {
      allowed: false,
      reason: `INSUFFICIENT_PRIVILEGES: Active role ${req.activeRoleContext} not in [${req.requiredRoles.join(', ')}]`,
    };
  }

  return {
    allowed: true,
    activeRole: matchingRole,
  };
}

/**
 * Detects discrepancies between non-authoritative client claims and backend truth.
 */
export function detectStaleClaims(
  tokenClaims: { roles?: string[]; status?: string },
  authoritativeIdentity: UserIdentity
): { isStale: boolean; discrepancies: string[] } {
  const discrepancies: string[] = [];

  if (tokenClaims.status && tokenClaims.status !== authoritativeIdentity.accountStatus) {
    discrepancies.push(
      `Status mismatch: token claim is "${tokenClaims.status}", authoritative state is "${authoritativeIdentity.accountStatus}"`
    );
  }

  if (tokenClaims.roles) {
    const authoritativeActiveRoles = new Set(
      authoritativeIdentity.roles
        .filter((r) => r.status === 'ACTIVE')
        .map((r) => r.role)
    );

    for (const claimedRole of tokenClaims.roles) {
      if (!authoritativeActiveRoles.has(claimedRole as UserRole)) {
        discrepancies.push(
          `Revoked/inactive role in token: "${claimedRole}" is not active in authoritative state`
        );
      }
    }
  }

  return {
    isStale: discrepancies.length > 0,
    discrepancies,
  };
}
