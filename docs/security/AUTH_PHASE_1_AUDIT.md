# AllGo Centralized Authentication Upgrade — Phase 1 Audit

**Repository:** `logeshn554/allgo`  
**Branch baseline:** `master` at `2e574e914d263e8449c05efea4e61fc231a033a8`  
**Audit performed:** 2026-11-25  
**Method:** Read-only inspection of repository source, schema migrations, app structure, and existing tests. No database was connected and no code was executed in the audit environment.

## Executive summary

AllGo already has a broad authentication subsystem in `apps/api`. The desired change is to make NestJS the sole issuer and validator of AllGo application sessions, remove independent Firebase Function user/JWT authentication, tighten role grants, and align the three Flutter clients and Next.js admin console to the existing API.

This is not a greenfield implementation. Existing PostgreSQL users, identities, roles, device sessions, merchant/partner profiles, and business records must remain attached to their current primary keys.

## Current architecture inventory

| Area | Existing implementation | Audit notes |
|---|---|---|
| NestJS entry point | `apps/api/src/auth/auth.module.ts` | Registers AuthController, AdminAuthController, repositories, OTP, token sessions, email auth, OAuth, 2FA, Firebase, App Check, abuse protection, SMS gateway. |
| Phone OTP | `otp.service.ts`, `auth.controller.ts` | Redis HMAC challenge, TTL, Lua verification, resend cooldown and SMS abuse controls exist. |
| Account/session issuance | `auth.service.ts`, `token-session.service.ts` | User lookup/creation, JWT issue/refresh, device sessions, web opaque sessions, logout and revocation exist. |
| Identity linking | `auth-manager.repository.ts`, `email-auth.service.ts` | Phone/email/provider identities are supported in `user_identities`; email/password and email OTP flows exist. |
| Admin | `admin-auth.controller.ts`, `RolesGuard`, `apps/admin` | Admin endpoints are guarded by JWT + role checks; admin can manage identities and create/invite users. Admin UI uses a server-side protected route layout. |
| Authorization | `apps/api/src/common/guards/roles.guard.ts`, `packages/common` | PostgreSQL is queried for authoritative roles; active role context is supplied by `X-AllGo-Role`. |
| Firebase bridge | `firebase-auth.service.ts`, `firebase-session-exchange.service.ts` | Firebase ID token is exchanged for an AllGo session by NestJS. |
| Firebase Functions | `functions/src/index.ts` | Separate Firestore OTP/user store and independent JWT issuance still exist; this is a conflicting authority. |
| Database | `database/migrations/001..017` | PostgreSQL users, roles, user_roles, devices, user_identities, auth_settings, 2FA fields, opaque web sessions. |
| Business ownership | `001_initial_schema.sql` | Addresses reference users; merchants.owner_id and partners.user_id reference users; orders, payments, wallets and operational records preserve these ownership links. |
| Mobile shared auth | `packages/mobile_shared/lib/src/data/api/auth_api.dart`, `state/auth_notifier.dart` | Shared Riverpod/auth API abstraction exists and should be the common client contract. |
| Mobile apps | `apps/customer_mobile`, `apps/partner_mobile`, `apps/merchant_mobile` | Separate branded Flutter apps use shared package and role-specific onboarding/approval routes. |
| Shared contracts | `packages/common` | Shared TypeScript auth/security/role contracts and validators exist. |

## Confirmed findings and risks

### Critical

1. **Independent Firebase JWT authority:** `functions/src/index.ts` signs access and refresh JWTs directly with its own secret and accepts them at its own `/v1/auth/me` route. These tokens do not have to pass through NestJS session issuance, refresh rotation, device registry or revocation.
2. **Privileged role assignment on public Firebase registration:** newly created Firestore users are assigned `['CUSTOMER', 'PARTNER', 'MERCHANT_ADMIN']`. This violates least privilege and can expose privileged application surfaces wherever that JWT is trusted.
3. **OTP disclosure in NestJS logs:** `OtpService.sendOtp` logs the generated OTP in its dispatch log. The local adapter also logs the OTP. OTP values must never be written to ordinary application logs; tests should retrieve them through an explicit test-only adapter.
4. **Known fixed OTP bypasses:** `OtpService.verifyOtpChallenge` accepts `123456` for development and two hard-coded phone numbers; `SmsAbuseProtectionService` exempts the same phone numbers from rate limits. A development flag alone is not a sufficient boundary for a known fixed OTP. Replace with an explicit, test-only injection mechanism that is unavailable in production and not tied to real user phone numbers.
5. **Firebase verifier mock fallback:** `FirebaseAdminAuthService.verifyIdToken` falls back to mock-token parsing whenever Firebase Admin is not initialized, including before proving that the runtime is non-production. Mock verification must be an explicitly injected test adapter, not a runtime fallback.

### High

6. **Firebase Functions OTP storage and controls:** Function writes the raw OTP code to Firestore. The inspected function path does not implement attempt counters, resend cooldown, or per-phone/per-IP SMS abuse controls comparable to NestJS.
7. **Long-lived independent Function JWTs:** Function issues 7-day access tokens and 30-day refresh tokens, while NestJS has its own token/session lifecycle. Consolidate on NestJS token TTL and rotation policy.
8. **Role trust boundary requires hardening:** `AuthManagerRepository.createUserWithIdentity` accepts a `role` parameter and inserts the requested role if absent. Current visible callers include admin-controlled user creation; ensure that only a trusted, already-authorized administrative workflow can grant roles and that public DTOs cannot forward this parameter.
9. **Role expansion ambiguity:** `RolesGuard` expands `SUPER_ADMIN` into `ADMIN` and maps `MERCHANT` to merchant subroles. This should be explicit in a centralized permission matrix, and the requested active role must be checked against DB-granted roles and the account/profile approval state.
10. **Admin allowlist is not evident in inspected code:** Admin identity management exists, but the inspected schema and controller do not demonstrate an immutable bootstrap/trusted-record boundary for initial admin grants. A separate allowlist should map the existing admin's verified email and phone to the same existing user ID; no public admin registration.
11. **Identity verification ambiguity:** migration 015 marks every backfilled phone identity as verified even though `users.phone_verified` is independently stored. Treat this legacy flag as an identity-linking artifact, not sufficient evidence for the new verified-phone policy.
12. **Admin identity equivalence not verified:** email and phone lookup/linking exists, but repository inspection alone cannot prove that the current admin email and phone are linked to one existing admin row. Runtime data inspection is required before any data migration.

### Medium / design concerns

13. **Multiple authentication methods remain in NestJS:** phone OTP, email/password, email OTP, OAuth, Firebase exchange, TOTP/backup code, and opaque web sessions coexist. Keep them as authentication methods behind one NestJS account/session authority, not separate identity stores or JWT authorities.
14. **Development/test in-memory fallbacks:** auth repositories and OTP adapters contain in-memory test behavior. Ensure no production request can silently fall back to in-memory identity/session state.
15. **Client-side route guards are not authorization:** admin and mobile UI guards are usability controls only. All privileged actions must continue to require backend JWT/session and DB-backed role/profile checks.
16. **Database uniqueness and historical data:** `users.phone` is unique, while `user_identities` is unique on (provider, provider_account_id). Existing IDs must not be merged or regenerated. Duplicate phone/email identity rows must be reported for manual reconciliation, never auto-merged.
17. **Existing merchant/partner approval states:** `merchants.status` supports REGISTERED, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, LIVE, PAUSED, SUSPENDED; `partners.status` supports REGISTERED, DOCS_SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, ACTIVE, SUSPENDED, BLOCKED. These are the approval sources; role activation must be gated by these records.

## Data preservation map

- Identity root: `users.id` (UUID, preserve).
- Login identifiers: `users.phone`, `users.email`, `user_identities` (preserve and normalize only with conflict report).
- Role grants: `roles`, `user_roles` (preserve existing legitimate grants; audit and reconcile).
- Sessions: `devices`, Redis device/session keys (legacy tokens remain only where compatible and revocable).
- Customer addresses: `addresses.user_id`.
- Merchant business profiles: `merchants.owner_id`, then `outlets.merchant_id`.
- Partner profiles: `partners.user_id`, then vehicles/documents/jobs/partner modes.
- Orders, deliveries, rides, parcels, wallets, ledger entries, payments, refunds, payouts, and support data remain linked through their existing user/merchant/partner IDs.
- Firestore users/OTP documents are not to be bulk-copied into PostgreSQL without a reconciliation export and deterministic ID mapping.

## Evidence limitations

- This was a source-level audit only; no live PostgreSQL/Redis/Firebase data was queried.
- `OWNER_ACCEPTANCE_AUDIT.md` reports prior live test/build results dated 2026-11-10, including 262/262 tests and Flutter smoke tests. Those are historical claims and were not re-run against the current source.
- The current tool session cannot access the stated Windows path `E:\\allgo` or local service/toolchain state. No current build/test pass is claimed.

## Phase 1 exit criteria

- [x] Identify auth modules and service boundaries.
- [x] Identify duplicate Firebase auth/JWT flow.
- [x] Identify role assignment and privilege escalation risks.
- [x] Identify OTP and Firebase mock/logging risks.
- [x] Map primary user/profile/business foreign-key relationships.
- [ ] Verify live admin identity linkage and current role assignments against a safe database snapshot.
- [ ] Verify current local build/test baseline on the owner workstation.
