# Centralized Authentication Upgrade — Implementation Status

**Branch:** `security/centralized-auth-upgrade`  
**Base:** `master` at `2e574e914d263e8449c05efea4e61fc231a033a8`  
**Last updated:** 2026-11-25

## Phase status

| Phase | Status | Notes |
|---|---|---|
| 1. Audit | Complete (source-level) | Findings recorded in `AUTH_PHASE_1_AUDIT.md`. Live DB/admin identity reconciliation remains an owner-side preflight. |
| 2. Architecture | Design and additive migration prepared | Design in `AUTH_PHASE_2_ARCHITECTURE.md`; migration 018, rollback 018, and read-only SQL preflight are prepared. Migration not executed. |
| 3. Backend | Security hardening applied; remaining data-dependent work blocked | Firebase Function is now a NestJS auth compatibility proxy; OTP bypass/logging removed; Firebase mock verification fails closed outside development; email-only/OAuth account creation is blocked; admin identity-link endpoint only links to existing phone-verified accounts; role guard checks partner/merchant approval and enforces dual-identifier admin allowlist when migration exists. |
| 4. Applications | Existing API integration retained; limited config fix | Flutter shared AuthApi already targets NestJS OTP/session endpoints and is reused by the three apps. Admin AuthApi already targets NestJS. Admin server layout now uses the repository production API default instead of a hard-coded localhost URL. Full app builds and UI/device verification remain unrun. |
| 5. Migration & testing | Prepared, not executed | Static regression tests and read-only preflight SQL added. No production/staging DB migration, deployment, or live external-service test was performed. |

## Backend changes in this branch

- `functions/src/index.ts`: removed independent Firestore OTP/user creation and JWT signing. Auth routes proxy to `ALLGO_CORE_API_URL` (defaulting to the project API URL); non-auth routes are not served by this compatibility function.
- `apps/api/src/auth/otp.service.ts`: removed universal fixed-code OTP bypass and stopped logging the generated OTP.
- `apps/api/src/auth/adapters/local-otp-delivery.adapter.ts`: local adapter no longer logs OTP values; test-only in-memory OTP retrieval remains available.
- `apps/api/src/auth/sms-abuse-protection.service.ts`: removed hard-coded phone-number rate-limit exemptions.
- `apps/api/src/auth/firebase-auth.service.ts`: mock Firebase/App Check tokens and uninitialized-SDK fallback are limited to development; non-development fails closed.
- `apps/api/src/auth/email-auth.service.ts`: email/password registration cannot create a phone-less account; email OTP can only verify an existing phone-verified account.
- `apps/api/src/auth/oauth.service.ts`: OAuth cannot create a new AllGo account and cannot link to an existing account until phone verification is complete.
- `apps/api/src/auth/admin-auth.controller.ts`: generic admin user operation is constrained to linking an email identity to an existing phone-verified account; client-supplied privileged roles are rejected.
- `apps/api/src/common/guards/roles.guard.ts`: PARTNER and merchant roles are only included in the authoritative identity when the matching profile is approved/active; when migration 018 exists, ADMIN/SUPER_ADMIN access requires both verified phone and email allowlist records for the same user ID.
- `apps/admin/app/(admin)/layout.tsx`: production API default now follows `.cursorrules`.

## Required owner-side actions before any migration/cutover

1. Run `database/tests/verify_auth_migration_018.sql` against a restored staging snapshot and review duplicate identifiers, current admin candidates, role/profile mismatches, and preservation counts.
2. Confirm which existing `users.id` is the single administrator account and independently verify its current phone and email. This source-only session cannot inspect production data or determine those values.
3. Apply migration 018 only in staging after backup and approval. Insert exactly two allowlist records (PHONE and EMAIL) for that same existing user ID after verification. If migration 018 exists but those rows are absent or either user verification flag is false, admin endpoints protected by RolesGuard intentionally deny admin access.
4. Validate partner and merchant status values against actual current profile data. Review any existing role/profile mismatches before enabling the approval gate.
5. Test all legacy clients against the NestJS API before disabling any remaining external Firebase Function URLs.
6. Obtain explicit approval before production migrations or deployment.

## Verification status

- Added `tests/auth/centralized-auth-boundary.spec.ts` for static regression assertions covering the proxy boundary, OTP logging/bypass, Firebase mock restrictions, phone-first signup, and backend role/allowlist gates.
- Added `database/tests/verify_auth_migration_018.sql` for read-only preservation and conflict checks.
- **Not run in this session:** Node unit/integration suites, NestJS build, Next.js build, Flutter analyzer/tests/builds, PostgreSQL migration execution, Redis integration, Firebase Emulator, or live SMS.
- The repository's `OWNER_ACCEPTANCE_AUDIT.md` is historical evidence only; it is not a current test run for this branch.
- No production migration or deployment was executed.

## Known incomplete items

- Admin allowlist data cannot be safely populated until the owner verifies the existing admin identifiers and user ID from a trusted database snapshot.
- This branch does not reconcile legacy duplicate accounts or migrate Firestore user documents; no automatic merge or ID rewrite is safe without data exports and owner-approved mapping.
- Full Next.js/Flutter UI and device verification remains outstanding.
- The merchant approval gate currently uses the schema's `merchants.owner_id` relationship. If merchant staff identities are introduced through another relation in a later schema, that relation must be explicitly added before granting `MERCHANT_ADMIN` to staff accounts.
- The admin generic user-link endpoint preserves the existing route for compatibility but no longer creates a new account; admin-created invitations should use the phone OTP onboarding flow.
- The Firebase compatibility gateway only proxies `/v1/auth/*`; any unrelated Firebase Function behavior must be checked before removing this function from deployment.
