# AllGo Centralized Authentication — Phase 2 Architecture & Migration Plan

**Status:** Design proposal prepared before application-code changes.  
**Baseline:** `master` commit `2e574e914d263e8449c05efea4e61fc231a033a8`.

## 1. Target authority model

```
Customer Flutter ───────┐
Partner Flutter ────────┤
Merchant Flutter ───────┼── HTTPS / App Check where configured ──> NestJS apps/api
Next.js Admin ──────────┘                                      │
                                                               ├── PostgreSQL: users, identities, roles,
                                                               │   onboarding status, audit, devices
                                                               ├── Redis: OTP challenges, throttles,
                                                               │   opaque sessions, revocation, replay
                                                               └── Firebase Admin: verify Firebase ID token
                                                                   only (optional phone proof bridge)

Firebase Functions: remove public account/JWT authority; retain non-auth business functions.
If a compatibility endpoint must remain temporarily, it must proxy/verify through NestJS and must
not create users, store OTPs, assign roles, or sign AllGo session JWTs.
```

NestJS is the only issuer of AllGo access/refresh tokens and opaque web sessions, the only source of role/permission decisions, and the only service allowed to create/merge AllGo identities. Firebase may remain the SMS/phone-verification provider or Firebase ID-token verifier, but Firebase credentials must never be shipped to clients and Firebase Functions must not issue application sessions.

## 2. Identity resolution

- Canonical account key remains the existing `users.id`; no new user IDs for an existing person.
- Canonical phone representation for new registrations is E.164 `+91[6-9][0-9]{9}`.
- New registration sequence: normalize -> send OTP -> verify OTP -> transactionally create/activate one user with CUSTOMER only -> create/link phone identity -> create customer profile only where the existing business flow requires it.
- Existing phone accounts retain their ID. Accounts with uncertain historical phone verification remain usable through a controlled re-verification/step-up path; do not mass-disable, delete, or mark verified based solely on migration 015.
- Admin login accepts phone or email as an identifier. Resolve both through one `admin_identity_allowlist` record to the same existing `users.id`; verify the selected factor (phone OTP, existing password, or configured 2FA). A valid identifier alone never grants ADMIN.
- Admin allowlist enrollment is an operator-controlled action after matching the current account and independently verifying both identifiers. No user merge is permitted to achieve this.
- Conflicting phone/email ownership or multiple candidate admin accounts is a hard stop for manual review.

## 3. Authorization and onboarding policy

All authorization is server-side. Client-supplied role, account status, onboarding state, Firebase custom claims, and `X-AllGo-Role` are untrusted hints only.

| Role | Grant condition | Effective access |
|---|---|---|
| CUSTOMER | Default after verified-phone registration | Customer-owned resources only |
| PARTNER | Partner profile/application exists and backend approval state is APPROVED/ACTIVE; explicit role grant by trusted workflow | Partner APIs and own partner profile/jobs only |
| MERCHANT_ADMIN | Merchant record is approved/LIVE and user is owner or explicitly authorized staff; trusted grant | Merchant APIs scoped to authorized merchant/outlet |
| ADMIN | Existing admin record and explicit allowlist match; role grant audited | Admin APIs according to permission policy |
| SUPER_ADMIN | Explicit operator-controlled bootstrap/trusted grant with audit and 2FA | Highest-level admin permissions |

- No public endpoint accepts a role name.
- Registration always creates CUSTOMER only.
- Partner and merchant onboarding may create pending business/profile records, but not active privileged roles before approval.
- Role changes are transactional, audited, and require a trusted actor or approval workflow.
- Preserve existing legitimate partner/merchant role grants; reconcile them against profile approval state rather than blindly stripping access.

## 4. Session and factor policy

- OTP: cryptographically random; HMAC/peppered hash in Redis; five-minute expiry; atomic single-use verification; max attempts; per-phone, per-IP and subnet throttles; resend cooldown; SMS pumping detection. Never log OTP.
- Development OTP: injected deterministic adapter only in tests; no known fixed phone numbers or universal fixed code in runtime paths.
- Firebase: production verification must fail closed if Admin SDK is not initialized; mock verification only through test DI.
- Password: existing password hashing retained; verify algorithm/work factor and rehash policy; generic login errors and throttling.
- Tokens: NestJS signs access/refresh tokens; short-lived access; rotating, single-use refresh token bound to a device/session; refresh reuse revokes the family/session; secrets from validated environment/secret manager only.
- Web: opaque random HttpOnly Secure SameSite cookie, store only hash, CSRF protection for cookie-authenticated state-changing requests, server-side expiry/revocation.
- 2FA: existing TOTP/backup-code service retained; require for admin; step-up for sensitive admin operations.
- Logout: revoke current device/session and refresh token; support revoke-one and revoke-all; backend state checked by guards.
- Auditing: admin login success/failure, 2FA, role grant/revoke, allowlist change, account lock/unlock, session revoke, sensitive admin operations. Redact secrets and OTP values.

## 5. Database design and migration 018

The additive migration in `database/migrations/018_auth_trust_and_role_audit.sql` creates:
- `admin_identity_allowlist`: maps a verified email or E.164 phone to an existing `users.id`; does not create or update any user.
- `auth_role_grant_audit`: append-oriented evidence of role grant/revoke decisions, actor, reason, and approval reference.

It does not alter or delete users, roles, user_roles, devices, merchants, partners, orders, wallets, ledgers, or payments. The paired rollback removes only the two new empty/operational tables. Before applying, export and inspect current user/role/identity/profile counts and duplicate/conflicting identifiers. Populate the admin allowlist only after the current admin account has been confirmed against a trusted owner-provided record. Migration is not executed by this task.

## 6. Safe migration and rollback runbook

1. Take a consistent encrypted PostgreSQL backup and record migration checksums.
2. Run read-only preflight queries: counts of users/roles/user_roles/user_identities/devices/partners/merchants/orders/wallets/payments; duplicate normalized phones/emails; admin-role holders; admin phone/email candidate mapping; partner/merchant role-to-profile approval mismatches.
3. Stop if any admin identifier maps to multiple users, any existing business profile has no owner, or normalized identifier collisions are found.
4. Apply migration 018 in a transaction in staging only; verify table constraints and FK targets.
5. Populate allowlist only after human review; record exact current admin user ID; never merge users.
6. Deploy backend compatibility code in staging, test all apps and legacy login/session handling.
7. Use a staged cutover: NestJS-only token acceptance; monitor failed auth and role-denial rates; revoke legacy Function JWTs only after compatibility window and client upgrade.
8. Rollback application traffic to prior NestJS-compatible build if needed. Do not drop audit/allowlist data if it has been populated; export it and use the rollback only after explicit operator approval. Database rollback is not automatic on application rollback.
9. Production execution requires a separate explicit owner approval and maintenance window.

## 7. Implementation sequence (after this design is reviewed)

- Phase 3 Backend: remove OTP logging/bypass, isolate mocks, fail closed Firebase, eliminate Function JWT issuance, harden role grants and approval checks, bind admin identities through allowlist, improve audit/session checks, add regression tests.
- Phase 4 Applications: keep current UI/registration journeys; align shared Flutter auth API and role state to NestJS contract; admin uses backend-verified opaque session and redirects; no client-side role authority.
- Phase 5 Migration/testing: add preflight and verification SQL, regression tests for all 17 acceptance scenarios, run Node builds/tests and Flutter tests in an available local/CI environment. No production data migration or deployment.
