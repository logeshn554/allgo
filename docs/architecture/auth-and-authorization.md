# Authentication, Authorization & Session Architecture

**Document Status:** Production Architectural Specification  
**Platform Scope:** Multi-Role Identity, Domestic DLT OTP Binding, Firebase Custom Tokens & Backend RBAC  
**Target Services:** `@allgo/api`, `@allgo/dispatch`, `@allgo/admin`, `@allgo/webhooks`  

---

## 1. Overview & Official Firebase References

The AllGo platform separates **Identity Attestation** (handled via domestic Indian DLT SMS and verified by the backend) from **Client Session Management** (delegated to Firebase Authentication).

### Official Documentation References
- [Firebase Admin SDK: Create Custom Tokens](https://firebase.google.com/docs/auth/admin/create-custom-tokens)
- [Firebase Admin SDK: Manage User Sessions & Revoke Tokens](https://firebase.google.com/docs/auth/admin/manage-sessions)
- [Firebase Admin SDK: Verify ID Tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
- [Control Access with Custom Claims and Security Rules](https://firebase.google.com/docs/auth/admin/custom-claims)

---

## 2. Token Lifecycle & Provider Clarifications

A strict distinction exists between token lifetimes and authentication providers:

| Token / Credential Type | Issuer | Validity / Lifetime | Storage Location | Revocation Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **Custom Token** | AllGo Backend API (via Firebase Admin SDK) | **Strictly 1 Hour** | In-flight TLS response only; exchanged immediately | Single-use on client; cannot be used to authenticate backend API endpoints |
| **Firebase ID Token (JWT)** | Google Identity Platform | **Strictly 1 Hour** | Encrypted client storage (`flutter_secure_storage`) | Verified with `checkRevoked = true`; cached status checked on backend gateway |
| **Firebase Refresh Token** | Google Identity Platform | **Indefinite (until revoked)** | Secure device keystore / keychain | Revoked via `admin.auth().revokeRefreshTokens(uid)` |

### Native Phone Provider vs. Custom Token Distinction
- **Native Firebase Phone Provider (`sign_in_provider: "phone"`):** Billed at Google Identity Platform international rates ($0.07/SMS = ~₹6.61 INR) and uses Google's shared shortcodes.
- **AllGo DLT + Custom Token Architecture (`sign_in_provider: "custom"`):** Uses domestic Indian TRAI-registered transactional SMS (~₹0.25 INR).
- **Security Invariant:** A custom `phone` claim in a Firebase token does **NOT** indicate that Google's native phone provider verified the number. The **AllGo backend and PostgreSQL `users` table are the sole authoritative sources of verified phone identity**.

---

## 3. Multi-Role Identity & Authoritative Permissions

In Indian on-demand operations, an individual user frequently holds multiple roles simultaneously (e.g., ordering food as a `CUSTOMER`, driving during evening hours as a `PARTNER`, and managing a family restaurant as a `MERCHANT_ADMIN`).

### 3.1 PostgreSQL Role Schema
Roles are modeled as a normalized Many-to-Many relationship, never a single static column:
```sql
-- users table holds authoritative primary identity
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, BLOCKED
    firebase_uid VARCHAR(128) UNIQUE NOT NULL
);

-- user_roles table supports simultaneous active roles
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    UNIQUE (user_id, role_id)
);
```

### 3.2 Authorization Authority: PostgreSQL vs. Custom Claims
- **Custom Claims are Strictly Non-Authoritative:** Custom claims (e.g. `{ roles: ['CUSTOMER', 'PARTNER'] }`) are embedded in the Firebase ID token **purely as convenience metadata** for client-side UI rendering.
- **Backend Authorization Authority:** All backend endpoints (`@allgo/api`, `@allgo/dispatch`) enforce Role-Based Access Control (RBAC) by querying the **authoritative PostgreSQL permissions** (cached in Redis with a 60-second TTL).
- **Client Identity Non-Tampering Invariant:** The client **cannot specify, inject, or influence the UID or roles**. The Firebase UID is deterministically bound by the backend:
  $$\text{Firebase UID} \equiv \text{users.id (UUID)}$$

---

## 4. Real-Time Account Suspension, Blocking & Token Revocation

Because Firebase ID tokens have a 1-hour lifespan, relying solely on cryptographic token verification would allow a suspended courier or fraudulent user to perform privileged operations for up to 60 minutes after suspension.

### 4.1 Two-Tier Revocation Architecture

```
[Incoming Request with Bearer ID Token]
                 │
                 ▼
     [1. Token Cryptographic Check]
     • Verify signature via Firebase Admin SDK (Google public keys)
     • Check token expiration (max 1 hour)
                 │
                 ▼
     [2. Immediate Redis Status Check] (Latency: <1ms)
     • Key: "user:status:<user_id>"
     • IF status == "SUSPENDED" OR "BLOCKED" ──► RETURN 403 Forbidden
     • IF status == "ACTIVE" ──────────────────► ALLOW to Controller
                 │
                 ▼ (If Redis cache miss)
     [3. PostgreSQL Query & Cache Populate]
     • SELECT status, roles FROM users WHERE id = :userId
     • SET "user:status:<user_id>" status EX 60
```

### 4.2 Immediate Enforcement Workflows
1. **Account Suspension / Blocking:**
   - Platform admin changes user status to `SUSPENDED` or `BLOCKED` in PostgreSQL.
   - An event is published to Redis: `HSET "user:status:<id>" "BLOCKED"`.
   - Backend calls `admin.auth().revokeRefreshTokens(firebase_uid)`.
   - Result: All subsequent API calls fail with `403 Forbidden` within milliseconds, and client token refresh fails immediately.
2. **Partner Mode Deactivation:**
   - If a courier is deactivated or fails an equipment check, `partner_modes.is_online` is set to `FALSE` and `partners.status` is set to `SUSPENDED`.
   - Dispatch feed queries (`GET /v1/partner/jobs/feed`) verify `partners.status = 'ACTIVE'` directly in PostgreSQL/Redis, preventing unassigned or deactivated couriers from receiving jobs.

---

## 5. Device Session Management & Logout

- **Device Registry (`devices` table):** Tracks active device installations per user (`device_id`, `platform`, `fcm_token`, `last_active_at`).
- **Single Device Logout:**
  - Client invokes `POST /v1/auth/logout` with `device_id`.
  - Backend deletes the specific device record from `devices`.
  - Client clears local tokens via `FirebaseAuth.instance.signOut()`.
- **Global Logout ("Log out of all devices"):**
  - Backend deletes all device records for `user_id`.
  - Backend invokes `admin.auth().revokeRefreshTokens(firebase_uid)`.
  - Backend writes `DEL "user:session:<user_id>"`.
  - All existing mobile sessions are terminated.

---

## 6. Account Enumeration Defense & App Check Boundaries

### 6.1 Account Enumeration Protection
- **Uniform API Response:** The endpoint `POST /v1/auth/otp/send` returns an identical response payload regardless of whether the submitted phone number belongs to an existing registered user or a new prospective customer:
  ```json
  {
    "status": "OTP_SENT",
    "challenge_id": "chl_7f8a9b2c3d4e",
    "cooldown_seconds": 60
  }
  ```
- **Constant-Time Timing Parity:** The backend performs identical cryptographic HMAC operations regardless of user existence, preventing timing side-channel analysis from determining whether an account is registered.
- **Brute-Force & Enumeration Rate Limits:**
  - Per Phone Number: Maximum 1 OTP per 60 seconds; maximum 5 OTPs per rolling hour.
  - Per Client IP Subnet: Maximum 20 OTP requests per hour across IPv4 `/24` or IPv6 `/48`.
  - Per Device Fingerprint: Maximum 5 OTP requests per hour.

### 6.2 Firebase App Check & Backend Authorization Boundaries
- **Client Attestation via App Check:**
  - Android client attestation: Google Play Integrity API.
  - iOS client attestation: Apple DeviceCheck / App Attest.
  - Web client attestation: reCAPTCHA Enterprise.
- **Architectural Boundary:**
  - Firebase App Check defends the network edge against automated headless bots, scraped endpoints, and SMS toll fraud exhaustion.
  - **Critical Invariant:** App Check tokens verify *app authenticity only*, not *caller identity or permissions*. The backend strictly requires a valid verified Firebase ID token and evaluates PostgreSQL RBAC on every privileged API request.

---

## 7. OTP Verification Testing Architecture & Scope Classification

To ensure complete transparency regarding test fidelity:
- **Unit & Contract Testing Suite (`tests/auth/otp-concurrency.spec.ts`):**
  - Executes against an in-memory single-threaded atomic challenge store simulator (`AtomicOtpChallengeStore`).
  - Simulates Redis's single-threaded event loop and atomic Lua script execution semantics.
  - **Scope:** Verifies the cryptographic entropy, HMAC hashing, attempt counter increment, 3-attempt lock, challenge expiry, and race-condition resistance algorithms.
  - **Explicit Non-Claim:** This in-memory simulator proves algorithm and contract correctness, but is **NOT** a substitute for live Redis server execution.
- **Live Integration Testing Suite (`tests/auth/redis-live-integration.spec.ts`):**
  - Connects to a real Redis server daemon via TCP port `6379`.
  - Evaluates the production Lua script (`ATOMIC_OTP_VERIFY_AND_CONSUME_LUA`) using live Redis `EVAL` commands.
  - When Redis/Docker is offline on the local host, this test suite is marked **BLOCKED / PENDING** without false claims of integration readiness.

