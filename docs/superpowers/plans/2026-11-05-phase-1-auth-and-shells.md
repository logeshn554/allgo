# Phase 1: Authentication & Mobile App Shells Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the end-to-end authentication infrastructure (Firebase Phone OTP exchange, RS256 JWT session issuance, refresh token rotation) and scaffold the three Flutter mobile applications (Customer, Partner, Merchant) using a shared design system and bilingual localization (Tamil and English).

**Architecture:** A centralized NestJS authentication service (`apps/api`) verifies Firebase ID tokens, checks user roles against PostgreSQL 15, and issues asymmetric RS256 session tokens with Redis-backed session management. On mobile, a modular Flutter architecture (`mobile/packages/allgo_ui`, `mobile/packages/allgo_auth`) provides reusable design tokens, components, and authenticated network interceptors to three distinct app shells (`customer`, `partner`, `merchant`).

**Tech Stack:** NestJS, Firebase Admin SDK, PostgreSQL 15 (Prisma), Memorystore Redis 7.0, RS256 JWT (`jose`), Flutter 3.29+ / Dart 3.7+, Flutter Riverpod 2.6+, Dio 5.7+, `flutter_secure_storage`, `flutter_localizations` (ARB: `en`, `ta`).

**Spec:** `delivery-super-app-prompt.md`, `docs/design-decisions.md`, `docs/api/openapi.yaml`, `docs/security/secrets-inventory.md`.

---

## Prerequisites: External Accounts & Developer Tools Checklist

Before Phase 1 implementation code can be executed on physical devices or emulators, the project owner must prepare the following accounts and environment tools:

### 1. Developer Workstation Tooling
- [ ] **Flutter SDK:** Install Flutter `3.29.x` (channel stable) with Dart `3.7.x`. Verify with `flutter doctor -v`.
- [ ] **Android Development Tooling:**
  - Android Studio Ladybug (2024.2.1+) or newer.
  - Android SDK Platform 34 (API 34) and 35.
  - Android SDK Build-Tools 34.0.0.
  - OpenJDK 17 (`JAVA_HOME` pointing to JDK 17).
  - Android Virtual Device (AVD) with Google Play Services enabled (API 34+).
- [ ] **iOS Development Tooling (macOS required for iOS builds):**
  - Xcode 16.x with Command Line Tools (`xcode-select --install`).
  - CocoaPods 1.16+ or Swift Package Manager support.
  - iOS Simulator (iOS 17+ or 18+).

### 2. Firebase Console Configuration
- [ ] **Create Firebase Project:** Create project `allgo-dev` (or production project) in [Firebase Console](https://console.firebase.google.com).
- [ ] **Enable Phone Authentication:**
  - Navigate to **Authentication** -> **Sign-in method** -> enable **Phone**.
  - Configure test phone numbers for local development (e.g., `+91 98765 43210` with OTP `123456`) to avoid SMS carrier costs during routine developer testing.
- [ ] **Register Mobile Apps:**
  - **Customer App:** Android package `in.allgo.customer`, iOS bundle ID `in.allgo.customer`.
  - **Partner App:** Android package `in.allgo.partner`, iOS bundle ID `in.allgo.partner`.
  - **Merchant App:** Android package `in.allgo.merchant`, iOS bundle ID `in.allgo.merchant`.
- [ ] **Configure Android SHA Fingerprints:**
  - Extract debug keystore SHA-1 and SHA-256 (`keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`).
  - Add SHA-1 and SHA-256 to each registered Android app in Firebase Project Settings (required for Phone Auth SMS verification and Play Integrity).
- [ ] **Download Firebase Configuration Files:**
  - `google-services.json` for Android applications.
  - `GoogleService-Info.plist` for iOS applications.
- [ ] **Generate Firebase Admin SDK Service Account Key:**
  - Navigate to **Project Settings** -> **Service Accounts** -> **Generate new private key**.
  - Save as `secrets/firebase-service-account.json` (covered by `.gitignore`).
- [ ] **Firebase App Check (Production Readiness):**
  - Register Play Integrity for Android.
  - Register DeviceCheck / App Attest for iOS.
  - Configure enforcement mode for Authentication endpoints.

### 3. Google Maps Platform Credentials
- [ ] **Enable Google Maps SDKs:**
  - Maps SDK for Android.
  - Maps SDK for iOS.
  - Routes API.
  - Places API (New).
  - Geocoding API.
- [ ] **Create API Keys:**
  - Android API Key restricted to package names (`in.allgo.*`) and SHA-1 fingerprints.
  - iOS API Key restricted to bundle identifiers (`in.allgo.*`).

---

## Global Constraints

- **Language Support:** Tamil (`ta`) and English (`en`) supported at launch across all apps; Hindi (`hi`) prepared in localization tables.
- **Zero Real Secrets in Source Control:** All API keys, Firebase service accounts, and private keys loaded via environment variables or Secret Manager; `.gitignore` enforced.
- **Asymmetric JWT Signing:** Access tokens signed via RS256 (`JWT_PRIVATE_KEY` on `api`, `JWT_PUBLIC_KEY` on `dispatch`); 15-minute access token TTL; 7-day refresh token TTL with single-use rotation.
- **Zero Location Writes to Firestore:** Location pings stream strictly via WebSocket to Redis GEO; Firestore reserved solely for coarse status state transitions.
- **No Unapproved Cloud Resources:** Development and testing proceed locally using mock providers, test phone numbers, and local SQLite/PostgreSQL.

---

## Review Focus

1. **Replay of Expired or Revoked Refresh Tokens:** If a refresh token is used after rotation or revocation, the system must detect token reuse, revoke the entire device session hierarchy, and return `401 Unauthorized`.
2. **Role Elevation Attack:** A user authenticated as `CUSTOMER` attempting to authenticate as `PARTNER` or `MERCHANT` without verified background KYC / outlet authorization must be rejected with `403 Forbidden`.
3. **Network Dropout During OTP Verification:** If network drops while client is awaiting backend token exchange after Firebase verification, the client must safely retry exchange without double-submitting or invalidating the Firebase session.
4. **Bilingual Dynamic Locale Switching:** Changing language between English and Tamil must instantly update all UI strings, button labels, and date/time formats without restarting the application or dropping navigation state.
5. **Cold-Start App Navigation Guard:** Launching the app while offline or with an expired session must deterministically land on the phone login screen without flashing empty home screens or throwing null pointer exceptions.

---

### Task 1: Backend Authentication Service & Token Exchange (`apps/api`)

**Files:**
- Create: `apps/api/src/auth/auth.module.ts`
- Create: `apps/api/src/auth/auth.controller.ts`
- Create: `apps/api/src/auth/auth.service.ts`
- Create: `apps/api/src/auth/guards/jwt-auth.guard.ts`
- Create: `apps/api/src/auth/guards/roles.guard.ts`
- Create: `apps/api/src/auth/services/firebase-auth.service.ts`
- Create: `apps/api/src/auth/services/token.service.ts`
- Test: `apps/api/test/auth/auth.service.spec.ts`
- Test: `apps/api/test/auth/token-rotation.spec.ts`

**Interfaces:**
- Consumes: `docs/api/openapi.yaml` (`POST /v1/auth/session`, `POST /v1/auth/refresh`, `POST /v1/auth/logout`), `database/schema.prisma` (`User`, `UserRole`, `Session`).
- Produces: Authenticated session endpoint returning `{ accessToken, refreshToken, expiresIn, user: { id, phoneNumber, role, language } }`.

- [ ] **Step 1: Write failing auth and token rotation tests**
  Write `apps/api/test/auth/auth.service.spec.ts` asserting:
  - Valid Firebase ID token exchange creates or retrieves user and returns RS256 JWT access token (15m) and refresh token (7d).
  - Invalid Firebase ID token throws `401 Unauthorized`.
  - Refresh token rotation returns new token pair and invalidates previous refresh token in Redis/DB.
  - Re-use of previously rotated refresh token invalidates entire session family.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test -w @allgo/api -- test/auth/auth.service.spec.ts`.
  Expected: FAIL.

- [ ] **Step 3: Implement FirebaseAuthService, TokenService, and AuthController**
  - Implement `FirebaseAuthService`: Wraps Firebase Admin SDK to verify ID tokens (`verifyIdToken`).
  - Implement `TokenService`: Uses `jose` to generate RS256 JWT access tokens and cryptographically random refresh tokens stored in Redis with SHA-256 hashes.
  - Implement `AuthService`: Orchestrates user lookup/creation in PostgreSQL via Prisma, role assignment, and session record creation.
  - Implement `JwtAuthGuard` and `RolesGuard`: Validates bearer tokens and enforces role-based access control.
  - Implement `AuthController`: Exposes `POST /v1/auth/session`, `POST /v1/auth/refresh`, and `POST /v1/auth/logout`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test -w @allgo/api -- test/auth/auth.service.spec.ts`.
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add apps/api/src/auth/ apps/api/test/auth/
  git commit -m "feat(api): implement firebase token exchange, rs256 jwt issuance, and refresh token rotation"
  ```

---

### Task 2: Shared Flutter Design System & Localization Package (`mobile/packages/allgo_ui`)

**Files:**
- Create: `mobile/packages/allgo_ui/pubspec.yaml`
- Create: `mobile/packages/allgo_ui/lib/src/theme/colors.dart`
- Create: `mobile/packages/allgo_ui/lib/src/theme/typography.dart`
- Create: `mobile/packages/allgo_ui/lib/src/theme/app_theme.dart`
- Create: `mobile/packages/allgo_ui/lib/src/widgets/app_button.dart`
- Create: `mobile/packages/allgo_ui/lib/src/widgets/app_text_field.dart`
- Create: `mobile/packages/allgo_ui/lib/src/widgets/otp_input_field.dart`
- Create: `mobile/packages/allgo_ui/lib/src/widgets/language_selector.dart`
- Create: `mobile/packages/allgo_ui/lib/l10n/intl_en.arb`
- Create: `mobile/packages/allgo_ui/lib/l10n/intl_ta.arb`
- Test: `mobile/packages/allgo_ui/test/widgets/app_button_test.dart`
- Test: `mobile/packages/allgo_ui/test/widgets/otp_input_field_test.dart`
- Test: `mobile/packages/allgo_ui/test/l10n/localization_test.dart`

**Interfaces:**
- Consumes: Brand tokens (Primary Blue `#0A84FF`, Delivery Green `#34C759`, Warning `#FF9500`, Error `#FF3B30`), Material 3 styling.
- Produces: Exported Flutter package `allgo_ui` providing themed components, 6-digit auto-advancing OTP input, and bilingual localization delegates (`AllGoLocalizations`).

- [ ] **Step 1: Write failing widget and localization tests**
  Write tests in `mobile/packages/allgo_ui/test/` asserting:
  - `AppButton` renders loading spinner when `isLoading: true` and disables tap interactions.
  - `OtpInputField` accepts 6 digits, auto-advances focus across inputs, and fires `onCompleted` callback upon entering 6th digit.
  - `AllGoLocalizations` resolves authentic Tamil translations (e.g., "Enter Phone Number" -> "தொலைபேசி எண்ணை உள்ளிடவும்").

- [ ] **Step 2: Run test to verify it fails**
  Run: `flutter test mobile/packages/allgo_ui`.
  Expected: FAIL (files missing).

- [ ] **Step 3: Implement design tokens, widgets, and ARB localization files**
  - Implement `colors.dart`, `typography.dart`, and `app_theme.dart` supporting light and dark modes.
  - Implement `AppButton` (Primary, Secondary, Text variants).
  - Implement `AppTextField` with validation feedback, prefix phone code (`+91`), and clear buttons.
  - Implement `OtpInputField` with automatic clipboard pasting and focus movement.
  - Define `intl_en.arb` and `intl_ta.arb` with all onboarding and auth strings.

- [ ] **Step 4: Run test to verify it passes**
  Run: `flutter test mobile/packages/allgo_ui`.
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add mobile/packages/allgo_ui/
  git commit -m "feat(mobile): create shared flutter design system and bilingual localization package"
  ```

---

### Task 3: Mobile Network Client & Secure Authentication Package (`mobile/packages/allgo_auth`)

**Files:**
- Create: `mobile/packages/allgo_auth/pubspec.yaml`
- Create: `mobile/packages/allgo_auth/lib/src/storage/secure_token_storage.dart`
- Create: `mobile/packages/allgo_auth/lib/src/api/auth_api_client.dart`
- Create: `mobile/packages/allgo_auth/lib/src/interceptors/auth_interceptor.dart`
- Create: `mobile/packages/allgo_auth/lib/src/state/auth_state.dart`
- Create: `mobile/packages/allgo_auth/lib/src/state/auth_notifier.dart`
- Test: `mobile/packages/allgo_auth/test/interceptors/auth_interceptor_test.dart`
- Test: `mobile/packages/allgo_auth/test/state/auth_notifier_test.dart`

**Interfaces:**
- Consumes: `allgo_ui`, Dio HTTP client, `flutter_secure_storage`.
- Produces: `AuthNotifier` Riverpod provider managing authentication states (`unauthenticated`, `otpCodeSent`, `authenticating`, `authenticated`, `error`) and Dio interceptor with transparent 401 token refresh queue.

- [ ] **Step 1: Write failing interceptor and state machine tests**
  Write tests in `mobile/packages/allgo_auth/test/` asserting:
  - 401 response triggers token refresh request with refresh token.
  - Subsequent API calls queued during refresh replay successfully once new access token is obtained.
  - If refresh fails, tokens are wiped from secure storage and state transitions to `unauthenticated`.
  - State machine correctly transitions through phone verification lifecycle.

- [ ] **Step 2: Run test to verify it fails**
  Run: `flutter test mobile/packages/allgo_auth`.
  Expected: FAIL.

- [ ] **Step 3: Implement SecureTokenStorage, AuthApiClient, AuthInterceptor, and AuthNotifier**
  - Implement `SecureTokenStorage`: Wraps `flutter_secure_storage` to persist access token, refresh token, and user session JSON.
  - Implement `AuthApiClient`: Calls `POST /v1/auth/session`, `POST /v1/auth/refresh`, `POST /v1/auth/logout`.
  - Implement `AuthInterceptor`: Queues pending requests on 401, invokes single token refresh, updates storage, and replays failed requests.
  - Implement `AuthNotifier` using Riverpod StateNotifier.

- [ ] **Step 4: Run test to verify it passes**
  Run: `flutter test mobile/packages/allgo_auth`.
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add mobile/packages/allgo_auth/
  git commit -m "feat(mobile): implement secure auth storage, dio refresh interceptor, and riverpod auth state"
  ```

---

### Task 4: Customer Flutter App Shell (`mobile/apps/customer`)

**Files:**
- Create: `mobile/apps/customer/pubspec.yaml`
- Create: `mobile/apps/customer/lib/main.dart`
- Create: `mobile/apps/customer/lib/src/screens/login_screen.dart`
- Create: `mobile/apps/customer/lib/src/screens/otp_screen.dart`
- Create: `mobile/apps/customer/lib/src/screens/service_check_screen.dart`
- Create: `mobile/apps/customer/lib/src/screens/main_shell_screen.dart`
- Create: `mobile/apps/customer/lib/src/screens/explore_tab.dart`
- Create: `mobile/apps/customer/lib/src/screens/orders_tab.dart`
- Create: `mobile/apps/customer/lib/src/screens/profile_tab.dart`
- Test: `mobile/apps/customer/test/login_flow_test.dart`
- Test: `mobile/apps/customer/test/main_navigation_test.dart`

**Interfaces:**
- Consumes: `allgo_ui`, `allgo_auth`, `GET /v1/zones/serviceable`.
- Produces: Runnable Customer App shell with Firebase Phone login, service zone check (displaying waitlist prompt when unserviceable), and 3-tab navigation shell (Explore, Orders, Profile).

- [ ] **Step 1: Write failing customer app widget tests**
  Write tests in `mobile/apps/customer/test/` asserting:
  - Phone entry screen validates 10-digit Indian mobile number (`+91`).
  - Successful OTP verification navigates to `MainShellScreen`.
  - When user location is outside serviceable polygon, `ServiceCheckScreen` displays "Coming Soon" with phone waitlist registration.
  - Bottom navigation bar switches between Explore, Orders, and Profile tabs.

- [ ] **Step 2: Run test to verify it fails**
  Run: `flutter test mobile/apps/customer`.
  Expected: FAIL.

- [ ] **Step 3: Implement Customer App Shell screens and routing**
  - Implement `main.dart` initializing Riverpod, Firebase, and `allgo_ui` theme.
  - Implement `LoginScreen` and `OtpScreen` wired to `AuthNotifier`.
  - Implement `ServiceCheckScreen` checking PostGIS active zones via `GET /v1/zones/serviceable`.
  - Implement `MainShellScreen` with Material 3 NavigationBar.
  - Implement placeholder tabs (`ExploreTab`, `OrdersTab`, `ProfileTab` with language selector).

- [ ] **Step 4: Run test to verify it passes**
  Run: `flutter test mobile/apps/customer`.
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add mobile/apps/customer/
  git commit -m "feat(customer): build customer flutter app shell with phone login and bottom navigation"
  ```

---

### Task 5: Partner Flutter App Shell (`mobile/apps/partner`)

**Files:**
- Create: `mobile/apps/partner/pubspec.yaml`
- Create: `mobile/apps/partner/lib/main.dart`
- Create: `mobile/apps/partner/lib/src/screens/partner_login_screen.dart`
- Create: `mobile/apps/partner/lib/src/screens/onboarding_kyc_screen.dart`
- Create: `mobile/apps/partner/lib/src/screens/location_permission_screen.dart`
- Create: `mobile/apps/partner/lib/src/screens/partner_home_screen.dart`
- Create: `mobile/apps/partner/lib/src/widgets/partner_mode_selector.dart`
- Create: `mobile/apps/partner/lib/src/widgets/online_toggle_switch.dart`
- Test: `mobile/apps/partner/test/partner_login_test.dart`
- Test: `mobile/apps/partner/test/partner_mode_selector_test.dart`

**Interfaces:**
- Consumes: `allgo_ui`, `allgo_auth`, `PUT /v1/partner/mode`, `GET /v1/partner/jobs/feed`.
- Produces: Runnable Partner App shell with partner authentication, background location disclosure dialog, Online/Offline status switch, and Section 5B Mode Selector (`DELIVERIES ONLY`, `RIDES ONLY`, `ALL JOBS`).

- [ ] **Step 1: Write failing partner app widget tests**
  Write tests in `mobile/apps/partner/test/` asserting:
  - Login verifies `PARTNER` role; rejects non-partner accounts with KYC onboarding prompt.
  - Prominent background location disclosure compliant with Google Play policy is displayed before requesting runtime permissions.
  - Mode selector toggles between `DELIVERIES_ONLY`, `RIDES_ONLY`, `ALL_JOBS` and disables switching when an active job is locked.

- [ ] **Step 2: Run test to verify it fails**
  Run: `flutter test mobile/apps/partner`.
  Expected: FAIL.

- [ ] **Step 3: Implement Partner App Shell screens and widgets**
  - Implement `PartnerLoginScreen` validating partner credentials.
  - Implement `LocationPermissionScreen` with compliant background location disclosure.
  - Implement `PartnerHomeScreen` featuring `OnlineToggleSwitch` and `PartnerModeSelector`.
  - Implement empty state for job feed with Socket.IO connection status indicator.

- [ ] **Step 4: Run test to verify it passes**
  Run: `flutter test mobile/apps/partner`.
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add mobile/apps/partner/
  git commit -m "feat(partner): build partner flutter app shell with mode selector and location disclosure"
  ```

---

### Task 6: Merchant Flutter App Shell (`mobile/apps/merchant`)

**Files:**
- Create: `mobile/apps/merchant/pubspec.yaml`
- Create: `mobile/apps/merchant/lib/main.dart`
- Create: `mobile/apps/merchant/lib/src/screens/merchant_login_screen.dart`
- Create: `mobile/apps/merchant/lib/src/screens/outlet_selection_screen.dart`
- Create: `mobile/apps/merchant/lib/src/screens/merchant_dashboard_screen.dart`
- Create: `mobile/apps/merchant/lib/src/widgets/store_status_toggle.dart`
- Create: `mobile/apps/merchant/lib/src/widgets/order_queue_tabs.dart`
- Test: `mobile/apps/merchant/test/merchant_login_test.dart`
- Test: `mobile/apps/merchant/test/store_status_toggle_test.dart`

**Interfaces:**
- Consumes: `allgo_ui`, `allgo_auth`, `GET /v1/merchants/{id}/catalog`.
- Produces: Runnable Merchant App shell with merchant authentication, multi-outlet selection, store open/closed toggle, and live order preparation queue tabs (New, Preparing, Ready).

- [ ] **Step 1: Write failing merchant app widget tests**
  Write tests in `mobile/apps/merchant/test/` asserting:
  - Login checks `MERCHANT` role and loads associated store outlets.
  - Store status toggle updates outlet state between `OPEN` and `CLOSED`.
  - Order queue tabs render three distinct lifecycle stages: "New Orders", "In Preparation", and "Ready for Courier".

- [ ] **Step 2: Run test to verify it fails**
  Run: `flutter test mobile/apps/merchant`.
  Expected: FAIL.

- [ ] **Step 3: Implement Merchant App Shell screens and widgets**
  - Implement `MerchantLoginScreen` and `OutletSelectionScreen`.
  - Implement `MerchantDashboardScreen` with `StoreStatusToggle`.
  - Implement `OrderQueueTabs` displaying order cards with items, prep countdown timer, and bilingual item names.

- [ ] **Step 4: Run test to verify it passes**
  Run: `flutter test mobile/apps/merchant`.
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add mobile/apps/merchant/
  git commit -m "feat(merchant): build merchant flutter app shell with outlet toggle and order queue tabs"
  ```

---

## Plan Self-Review Checklist

- [x] **Spec coverage:** Covers Firebase phone OTP login, backend auth service (`apps/api`), and three Flutter app shells (`customer`, `partner`, `merchant`) with shared design system and bilingual localization.
- [x] **Prerequisites Checklist:** Itemizes all external accounts, Firebase settings (Phone Auth, SHA fingerprints, App Check), and developer SDKs required before execution.
- [x] **Step scan:** Every task follows strict TDD (failing test -> fail verification -> minimal implementation -> pass verification -> commit).
- [x] **Type consistency:** Matches domain enums (`VerticalType`, `OrderStatus`, `FulfillmentMode`, `SupportedLanguages`) and OpenAPI schemas defined in Phase 0.
- [x] **Review Focus:** 5 operational failure modes (token reuse, role elevation, network retry, bilingual locale switch, cold start navigation) addressed in task tests.
- [x] **No premature execution:** Strictly plan-only; waits for user approval.
