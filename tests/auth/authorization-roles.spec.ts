import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  evaluateAuthoritativeAccess,
  detectStaleClaims,
  type UserIdentity,
} from '../../packages/common/src/index.ts';

describe('Authoritative Multi-Role Authorization & Revocation Verification', () => {
  const multiRoleUser: UserIdentity = {
    userId: 'usr_chennai_001',
    phoneNumber: '+919840012345',
    accountStatus: 'ACTIVE',
    roles: [
      { role: 'CUSTOMER', status: 'ACTIVE' },
      { role: 'PARTNER', status: 'ACTIVE', entityId: 'ptn_bike_001' },
      { role: 'MERCHANT_OPERATOR', status: 'ACTIVE', entityId: 'mch_bakery_001' },
    ],
  };

  describe('Multi-Role Contextual Authorization', () => {
    it('should allow customer operations when user is in CUSTOMER context', () => {
      const decision = evaluateAuthoritativeAccess({
        identity: multiRoleUser,
        activeRoleContext: 'CUSTOMER',
        requiredRoles: ['CUSTOMER'],
      });

      assert.strictEqual(decision.allowed, true);
      assert.strictEqual(decision.activeRole?.role, 'CUSTOMER');
    });

    it('should allow partner operations when user is in PARTNER context', () => {
      const decision = evaluateAuthoritativeAccess({
        identity: multiRoleUser,
        activeRoleContext: 'PARTNER',
        requiredRoles: ['PARTNER'],
      });

      assert.strictEqual(decision.allowed, true);
      assert.strictEqual(decision.activeRole?.role, 'PARTNER');
      assert.strictEqual(decision.activeRole?.entityId, 'ptn_bike_001');
    });

    it('should reject partner endpoint access when user makes request under CUSTOMER context', () => {
      const decision = evaluateAuthoritativeAccess({
        identity: multiRoleUser,
        activeRoleContext: 'CUSTOMER',
        requiredRoles: ['PARTNER'],
      });

      assert.strictEqual(decision.allowed, false);
      assert.match(decision.reason || '', /INSUFFICIENT_PRIVILEGES/);
    });

    it('should reject role context user does not possess', () => {
      const decision = evaluateAuthoritativeAccess({
        identity: multiRoleUser,
        activeRoleContext: 'ADMIN',
        requiredRoles: ['ADMIN'],
      });

      assert.strictEqual(decision.allowed, false);
      assert.match(decision.reason || '', /ROLE_NOT_ASSIGNED/);
    });
  });

  describe('Immediate Account Revocation & Blocking (Two-Tier Architecture)', () => {
    it('should instantly block requests for BLOCKED account regardless of valid JWT or roles', () => {
      const blockedUser: UserIdentity = {
        ...multiRoleUser,
        accountStatus: 'BLOCKED',
      };

      const decision = evaluateAuthoritativeAccess({
        identity: blockedUser,
        activeRoleContext: 'CUSTOMER',
        requiredRoles: ['CUSTOMER'],
      });

      assert.strictEqual(decision.allowed, false);
      assert.strictEqual(decision.reason, 'ACCOUNT_BLOCKED');
    });

    it('should instantly reject requests for SUSPENDED account on protected endpoints', () => {
      const suspendedUser: UserIdentity = {
        ...multiRoleUser,
        accountStatus: 'SUSPENDED',
      };

      const decision = evaluateAuthoritativeAccess({
        identity: suspendedUser,
        activeRoleContext: 'PARTNER',
        requiredRoles: ['PARTNER'],
      });

      assert.strictEqual(decision.allowed, false);
      assert.strictEqual(decision.reason, 'ACCOUNT_SUSPENDED');
    });

    it('should reject suspended individual role while permitting remaining active roles', () => {
      const partialSuspendedUser: UserIdentity = {
        userId: 'usr_chennai_002',
        phoneNumber: '+919840054321',
        accountStatus: 'ACTIVE',
        roles: [
          { role: 'CUSTOMER', status: 'ACTIVE' },
          { role: 'PARTNER', status: 'SUSPENDED', entityId: 'ptn_bike_002' }, // e.g. license expired
        ],
      };

      // Partner attempt rejected
      const partnerDecision = evaluateAuthoritativeAccess({
        identity: partialSuspendedUser,
        activeRoleContext: 'PARTNER',
        requiredRoles: ['PARTNER'],
      });
      assert.strictEqual(partnerDecision.allowed, false);
      assert.match(partnerDecision.reason || '', /ROLE_SUSPENDED/);

      // Customer attempt allowed
      const customerDecision = evaluateAuthoritativeAccess({
        identity: partialSuspendedUser,
        activeRoleContext: 'CUSTOMER',
        requiredRoles: ['CUSTOMER'],
      });
      assert.strictEqual(customerDecision.allowed, true);
    });
  });

  describe('Stale Token Claims Detection', () => {
    it('should detect stale token when token claims a role that has been revoked authoritatively', () => {
      const singleRoleUser: UserIdentity = {
        userId: 'usr_chennai_003',
        phoneNumber: '+919840099999',
        accountStatus: 'ACTIVE',
        roles: [{ role: 'CUSTOMER', status: 'ACTIVE' }],
      };

      const staleToken = {
        roles: ['CUSTOMER', 'ADMIN'], // Stale claim from before admin role revocation
        status: 'ACTIVE',
      };

      const check = detectStaleClaims(staleToken, singleRoleUser);
      assert.strictEqual(check.isStale, true);
      assert.strictEqual(check.discrepancies.length, 1);
      assert.match(check.discrepancies[0], /Revoked\/inactive role in token: "ADMIN"/);
    });

    it('should detect status mismatch if client token claims ACTIVE but database has BLOCKED', () => {
      const blockedUser: UserIdentity = {
        ...multiRoleUser,
        accountStatus: 'BLOCKED',
      };

      const unexpiredToken = {
        roles: ['CUSTOMER'],
        status: 'ACTIVE', // Token minted before fraud team blocked account
      };

      const check = detectStaleClaims(unexpiredToken, blockedUser);
      assert.strictEqual(check.isStale, true);
      assert.match(check.discrepancies[0], /Status mismatch/);
    });
  });
});

