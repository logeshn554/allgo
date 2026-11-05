# AllGo Secrets Management, Environment Variables & IAM Inventory

This document defines the comprehensive inventory, security classification, provisioning guides, rotation procedures, and IAM least-privilege policies for all secrets, credentials, and configuration parameters across the AllGo platform.

---

## 1. Secrets Management Architecture Overview

AllGo adheres to defense-in-depth principles and cloud-native security standards:

1. **Google Secret Manager (GSM) as Single Source of Truth:**
   All sensitive credentials, API keys, private asymmetric keys, and service tokens are securely stored in Google Secret Manager in `asia-south1` (Mumbai).
2. **Cloud Run Native Secret Injection:**
   Services running on Cloud Run v2 (`apps/api`, `apps/dispatch`, `apps/webhooks`, and background workers) inject secrets directly at runtime using Cloud Run's native Secret Manager integration (`--set-secrets` or Terraform `google_cloud_run_v2_service` container `env.value_source.secret_key_ref`). Secrets are never baked into container images, committed to version control, or written to persistent disk.
3. **IAM Least Privilege:**
   Each Cloud Run service runs under its own dedicated Service Account (`sa-api`, `sa-dispatch`, `sa-webhooks`, `sa-worker`). IAM role `roles/secretmanager.secretAccessor` is granted with fine-grained resource-level bindings: a service account can only access secrets required for its bounded context.
4. **Local Development Isolation:**
   Local developers never use production secrets. Local environments consume sanitized templates (`.env.example` files copied to `.env` or `.env.local`), backed by local Docker containers (PostgreSQL 15 + PostGIS and Redis 7.0) and mock sandbox credentials.
5. **Leak Prevention:**
   The root `.gitignore` strictly rejects `.env`, `.env.*.local`, `*.pem`, `*.key`, and `*service-account*.json` files.

---

## 2. Secrets & Environment Inventory Matrix

### 2.1 Google Secret Manager (GSM) Managed Secrets

| Secret Identifier (GSM ID) | Consuming Service Account | Consuming Applications | Sensitivity | Rotation Frequency | Injected Target Variable | Description & Scope |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | `sa-api`, `sa-dispatch`, `sa-webhooks`, `sa-worker` | `apps/api`, `apps/dispatch`, `apps/webhooks`, `apps/admin` | `CRITICAL` | 90 days (dual user) | `DATABASE_URL` | PostgreSQL 15 connection string with credentials connecting over Cloud SQL Private IP socket / Auth Proxy. |
| `REDIS_URL` | `sa-api`, `sa-dispatch`, `sa-webhooks`, `sa-worker` | `apps/api`, `apps/dispatch`, `apps/webhooks`, `apps/admin` | `HIGH` | On infrastructure update | `REDIS_URL` | Redis 7.0 connection URI for cache, geospatial indexing (Redis GEO), pub/sub, and idempotency locks. |
| `JWT_PRIVATE_KEY` | `sa-api` | `apps/api`, `apps/admin` | `CRITICAL` | 90 days (dual key) | `JWT_PRIVATE_KEY` | RS256 2048-bit RSA private PEM key for signing authenticated session JWTs. |
| `JWT_PUBLIC_KEY` | `sa-api`, `sa-dispatch` | `apps/api`, `apps/dispatch`, `apps/admin` | `HIGH` | Concurrently with private key | `JWT_PUBLIC_KEY` | RS256 2048-bit RSA public PEM key for verifying incoming customer and driver session tokens. |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | `sa-api` | `apps/api`, `apps/admin` | `CRITICAL` | 180 days | `FIREBASE_SERVICE_ACCOUNT_KEY` | Service Account JSON credentials for Firebase Admin SDK (phone authentication & notification tokens). |
| `RAZORPAY_KEY_ID` | `sa-api` | `apps/api` | `MEDIUM` | 180 days | `RAZORPAY_KEY_ID` | Razorpay public identifier for Payment Gateway, Route split settlement, and RazorpayX payouts. |
| `RAZORPAY_KEY_SECRET` | `sa-api` | `apps/api` | `CRITICAL` | 90 days | `RAZORPAY_KEY_SECRET` | Razorpay private API secret for server-side order generation, settlement transfers, and refunds. |
| `RAZORPAY_WEBHOOK_SECRET` | `sa-webhooks` | `apps/webhooks` | `HIGH` | 90 days (dual webhook) | `RAZORPAY_WEBHOOK_SECRET` | Shared HMAC SHA256 secret used to cryptographically verify incoming Razorpay payment webhooks. |
| `GOOGLE_MAPS_SERVER_API_KEY` | `sa-api`, `sa-dispatch` | `apps/api`, `apps/dispatch` | `HIGH` | 180 days | `GOOGLE_MAPS_SERVER_API_KEY` | Backend API key restricted to server IP/VPC for Google Maps Routes API, Distance Matrix, Geocoding, and Places. |
| `GOOGLE_MAPS_CLIENT_ANDROID_KEY` | N/A (Mobile Client / GSM Vault) | Android Apps (`Rider`, `Partner`) | `MEDIUM` | 180 days | Client BuildConfig / GSM | Maps SDK for Android API key restricted by Android Package Name and SHA-1 certificate fingerprint. |
| `GOOGLE_MAPS_CLIENT_IOS_KEY` | N/A (Mobile Client / GSM Vault) | iOS Apps (`Rider`, `Partner`) | `MEDIUM` | 180 days | Client Info.plist / GSM | Maps SDK for iOS API key restricted by iOS Bundle Identifier. |

### 2.2 Non-Secret Runtime Configuration Variables

The following variables configure application behaviors across environments and do not contain cryptographic secrets:

| Variable Name | Present In | Default / Example Value | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | `apps/api`, `apps/dispatch`, `apps/webhooks`, `apps/admin` | `development` / `production` | Node.js execution environment mode (`development`, `staging`, `production`, `test`). |
| `PORT` | `apps/api`, `apps/dispatch`, `apps/webhooks`, `apps/admin` | `3000`, `3001`, `3002`, `3003` | TCP port on which the microservice listens for incoming HTTP / WebSocket traffic. |
| `CORS_ORIGIN` | `apps/api` | `http://localhost:3000,http://localhost:3001` | Comma-delimited list of allowed Cross-Origin Resource Sharing origins for browser clients. |
| `DISPATCH_SEARCH_RADIUS_KM` | `apps/dispatch` | `5` | Maximum geodesic search radius (in kilometers) when scanning for candidate drivers in Redis GEO. |
| `DISPATCH_MATCH_TIMEOUT_SEC` | `apps/dispatch` | `20` | Partner offer acceptance countdown window (in seconds) before matching escalates to next driver. |

---

## 3. Step-by-Step Provider Acquisition Guides

### 3.1 Firebase Console (`FIREBASE_SERVICE_ACCOUNT_KEY`)

1. **Access Firebase Console:**
   Navigate to [Firebase Console](https://console.firebase.google.com/) and select the project (`allgo-dev` or `allgo-prod`).
2. **Open Project Settings:**
   Click the gear icon next to **Project Overview** in the left sidebar and select **Project settings**.
3. **Navigate to Service Accounts:**
   Select the **Service accounts** tab.
4. **Generate New Private Key:**
   Ensure the Firebase Admin SDK configuration is selected (Node.js). Click **Generate new private key**, then confirm in the modal by clicking **Generate key**.
5. **Secure the Downloaded JSON:**
   Store the downloaded JSON payload in Google Secret Manager under secret name `FIREBASE_SERVICE_ACCOUNT_KEY`.
6. **Assign Least Privilege Roles:**
   In Google Cloud IAM, verify that the generated service account possesses only `roles/firebaseauth.admin` and `roles/fcm.admin`.

---

### 3.2 Razorpay Dashboard (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`)

1. **Access Razorpay Dashboard:**
   Log in to the [Razorpay Dashboard](https://dashboard.razorpay.com/) with organization admin credentials.
2. **Select Working Environment:**
   Ensure test mode is active for `dev` or live mode is active for `prod`.
3. **Acquire API Keys:**
   - Navigate to **Settings** > **API Keys**.
   - Click **Generate Key**.
   - Download the generated credentials:
     - `RAZORPAY_KEY_ID`: public merchant key identifier.
     - `RAZORPAY_KEY_SECRET`: private API secret key.
   - Upload both values into Google Secret Manager as `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
4. **Enable Razorpay Route (Marketplace Split Settlement):**
   - In Razorpay Dashboard, navigate to **Route**.
   - Enable Linked Accounts and configure Automated Split Transfers.
   - Verify that permissions allow split disbursements between merchant bank accounts, delivery partner accounts, and AllGo platform commissions.
5. **Enable RazorpayX (Partner Instant Payouts):**
   - Access **RazorpayX** banking module.
   - Enable API Access for Payouts.
   - Note the Source Account Number and add webhook event triggers for payout status updates.
6. **Configure Inbound Webhooks:**
   - Navigate to **Settings** > **Webhooks** > **Add New Webhook**.
   - Webhook URL: Enter the Cloud Run endpoint `https://webhooks.allgo.in/v1/webhooks/razorpay` (or ngrok/tunnel URL in dev).
   - Secret: Generate a high-entropy 32-character alphanumeric secret (`RAZORPAY_WEBHOOK_SECRET`).
   - Active Events: Select `order.paid`, `payment.authorized`, `payment.failed`, `refund.processed`, `payout.processed`, and `payout.reversed`.
   - Save the webhook and store `RAZORPAY_WEBHOOK_SECRET` in Google Secret Manager.

---

### 3.3 Google Cloud Console & Google Maps Platform

1. **Access Google Cloud Console:**
   Navigate to the [Google Cloud Console](https://console.cloud.google.com/) for the AllGo project.
2. **Enable Required APIs:**
   In **APIs & Services** > **Library**, enable:
   - Routes API
   - Geocoding API
   - Places API (New)
   - Maps SDK for Android
   - Maps SDK for iOS
3. **Provision Server Key (`GOOGLE_MAPS_SERVER_API_KEY`):**
   - Go to **Google Maps Platform** > **Credentials** > **Create Credentials** > **API Key**.
   - Rename to `allgo-maps-server-key`.
   - **Application Restrictions:** Select **IP addresses**. Add the Cloud Run static Direct VPC egress NAT external IPs or VPC subnet ranges.
   - **API Restrictions:** Select **Restrict key** and check exclusively:
     - *Routes API*
     - *Geocoding API*
     - *Places API (New)*
   - Save key and store in Google Secret Manager as `GOOGLE_MAPS_SERVER_API_KEY`.
4. **Provision Android Client Key (`GOOGLE_MAPS_CLIENT_ANDROID_KEY`):**
   - Create a new API key named `allgo-maps-client-android`.
   - **Application Restrictions:** Select **Android apps**.
   - Add package name and SHA-1 certificate fingerprint:
     - Package Name: `com.allgo.rider` & `com.allgo.partner`
     - SHA-1 Fingerprint: Release keystore SHA-1 (plus debug keystore SHA-1 for dev).
   - **API Restrictions:** Restrict key to *Maps SDK for Android* and *Places API (New)*.
   - Store in Google Secret Manager as `GOOGLE_MAPS_CLIENT_ANDROID_KEY`.
5. **Provision iOS Client Key (`GOOGLE_MAPS_CLIENT_IOS_KEY`):**
   - Create a new API key named `allgo-maps-client-ios`.
   - **Application Restrictions:** Select **iOS apps**.
   - Add iOS Bundle Identifier:
     - Bundle ID: `com.allgo.rider` & `com.allgo.partner`
   - **API Restrictions:** Restrict key to *Maps SDK for iOS* and *Places API (New)*.
   - Store in Google Secret Manager as `GOOGLE_MAPS_CLIENT_IOS_KEY`.

---

### 3.4 Cloud SQL Credentials (`DATABASE_URL`)

1. **Access Cloud SQL in GCP Console:**
   Navigate to **Cloud SQL** > Instances > Select instance (`dev-allgo-pg15` or `prod-allgo-pg15`).
2. **Create Database User:**
   - Go to **Users** tab > Click **Add user account**.
   - Select **Built-in authentication**.
   - Username: `allgo_api_user`.
   - Password: Generate 32+ character high-entropy random password.
3. **Grant Privileges:**
   Connect via Cloud Shell / psql and grant `CONNECT`, `SELECT`, `INSERT`, `UPDATE`, `DELETE` on all tables in schema `public` to `allgo_api_user`.
4. **Construct Connection URI:**
   ```text
   postgresql://allgo_api_user:<PASSWORD>@<PRIVATE_IP>:5432/allgo_db?sslmode=verify-full&sslrootcert=/etc/ssl/certs/server-ca.pem
   ```
5. **Store in Google Secret Manager:**
   Save the full URI under `DATABASE_URL`.

---

### 3.5 Memorystore Redis (`REDIS_URL`)

1. **Access Memorystore in GCP Console:**
   Navigate to **Memorystore** > **Redis** > Instances.
2. **Inspect Instance Endpoint:**
   Locate instance (`dev-allgo-redis` or `prod-allgo-redis`). Record the private IP address (`10.x.x.x`) and standard port (`6379`).
3. **Construct Connection URI:**
   ```text
   redis://10.x.x.x:6379
   ```
4. **Store in Google Secret Manager:**
   Save under `REDIS_URL`.

---

## 4. Zero-Downtime Secret Rotation Procedures

### 4.1 JWT Asymmetric Keypair Rotation (Dual-Key Verification Window)

AllGo authentication tokens are signed with RS256 asymmetric keys (`JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`). To rotate keypairs without invalidating active user sessions or forcing re-logins:

```
  Phase 1: Key Generation
  Generate new RS256 keypair (Private Key B, Public Key B).

  Phase 2: Add Public Key B to Verification Pool
  Update apps/api, apps/dispatch, and apps/admin with both Public Key A and Public Key B.
  Verification accepts tokens signed by either A or B.

  Phase 3: Switch Private Key to Key B
  Update apps/api and apps/admin JWT_PRIVATE_KEY to Private Key B.
  All newly minted sessions are signed by Key B.

  Phase 4: Grace Period Window
  Wait for existing session TTL (e.g. 7 days or refresh token rotation window).
  Active sessions signed by Key A naturally expire and refresh to Key B.

  Phase 5: Retire Public Key A
  Remove Public Key A from the verification pool in Google Secret Manager.
```

- **Step 1: Generate New Keypair:**
  ```bash
  openssl genpkey -algorithm RSA -out jwt_private_new.pem -pkeyopt rsa_keygen_bits:2048
  openssl rsa -pubout -in jwt_private_new.pem -out jwt_public_new.pem
  ```
- **Step 2: Dual Public Key Acceptance:**
  Store the new public key in Secret Manager. The auth validation middleware in `apps/api` and `apps/dispatch` verifies signatures against an array of valid public keys `[JWT_PUBLIC_KEY, JWT_PUBLIC_KEY_PREVIOUS]`.
- **Step 3: Rotate Private Key:**
  Update `JWT_PRIVATE_KEY` in Google Secret Manager to the new private key. New revisions of `apps/api` mint JWTs using Key B.
- **Step 4: Grace Period:**
  Allow the standard token TTL grace period (7 days) for legacy tokens to naturally cycle.
- **Step 5: Decommission Old Public Key:**
  Remove Key A from `JWT_PUBLIC_KEY_PREVIOUS`.

---

### 4.2 Razorpay Webhook Secret Rotation (Dual Webhook Verification Window)

To rotate `RAZORPAY_WEBHOOK_SECRET` without missing incoming payment event notifications:

```
  Phase 1: Support Dual Secrets in Service
  Update apps/webhooks to verify HMAC signatures against RAZORPAY_WEBHOOK_SECRET or
  RAZORPAY_WEBHOOK_SECRET_FALLBACK.

  Phase 2: Configure Secondary Webhook in Razorpay
  In Razorpay Dashboard, create a secondary webhook endpoint with the new secret.
  Razorpay sends events to both or routes traffic seamlessly.

  Phase 3: Rotate Primary Secret in Secret Manager
  Promote new secret to RAZORPAY_WEBHOOK_SECRET in GSM.
  Redeploy apps/webhooks.

  Phase 4: Decommission Legacy Webhook
  Remove legacy webhook endpoint from Razorpay Dashboard and remove fallback secret.
```

1. **Step 1:** In `apps/webhooks`, HMAC verification checks the incoming `x-razorpay-signature` header against both `RAZORPAY_WEBHOOK_SECRET` and an optional `RAZORPAY_WEBHOOK_SECRET_OLD` rotation window variable.
2. **Step 2:** Generate the new secret in Razorpay Dashboard and update the webhook settings.
3. **Step 3:** Update `RAZORPAY_WEBHOOK_SECRET` in Google Secret Manager.
4. **Step 4:** Deploy new revision of `apps/webhooks`. Both old in-flight and new incoming webhook signatures pass validation without dropping events.
5. **Step 5:** After 24 hours of successful event processing, purge the legacy secret.

---

### 4.3 Database Passwords Rotation (Cloud SQL Dual-User Rotation)

PostgreSQL on Cloud SQL supports zero-downtime database credential rotation via dual users:

```
  Phase 1: Create Secondary Database User
  CREATE USER allgo_api_v2 WITH PASSWORD '<NEW_STRONG_PASSWORD>';
  GRANT allgo_app_role TO allgo_api_v2;

  Phase 2: Test Secondary User Credentials
  Verify login connectivity via Cloud SQL Auth Proxy using allgo_api_v2.

  Phase 3: Update Secret Manager DATABASE_URL
  Update DATABASE_URL in Secret Manager with allgo_api_v2 credentials.

  Phase 4: Rolling Cloud Run Revision Deployment
  Cloud Run services spin up new instances using allgo_api_v2.
  Old instances finish in-flight queries on allgo_api_v1 and terminate gracefully.

  Phase 5: Decommission Legacy User
  DROP USER allgo_api_v1; (or revoke login permissions).
```

1. **Step 1 - Provision Secondary User:**
   Connect to Cloud SQL and create `allgo_user_green` with identical schema privileges as `allgo_user_blue`.
2. **Step 2 - Update Secret:**
   Update `DATABASE_URL` in Google Secret Manager pointing to `allgo_user_green`.
3. **Step 3 - Cloud Run Rolling Update:**
   Trigger revision deployment. Cloud Run uses rolling updates; incoming requests gradually route to containers authenticated as `allgo_user_green`. Existing requests on `allgo_user_blue` complete cleanly.
4. **Step 4 - Verify Zero Connections:**
   Check `pg_stat_activity` to ensure `allgo_user_blue` has 0 active connections.
5. **Step 5 - Revoke User:**
   Drop or disable `allgo_user_blue`.

---

## 5. IAM Principle of Least Privilege Access Mapping

Cloud Run service accounts are granted the role `roles/secretmanager.secretAccessor` strictly on individual secret resources:

```mermaid
graph TD
    GSM[Google Secret Manager] -->|DATABASE_URL, REDIS_URL, JWT_*, RAZORPAY_*, MAPS_*, FIREBASE_*| SA_API[sa-api]
    GSM -->|DATABASE_URL, REDIS_URL, JWT_PUBLIC_KEY, MAPS_*| SA_DISPATCH[sa-dispatch]
    GSM -->|DATABASE_URL, REDIS_URL, RAZORPAY_WEBHOOK_SECRET| SA_WEBHOOKS[sa-webhooks]
    GSM -->|DATABASE_URL, REDIS_URL| SA_WORKER[sa-worker]
```

### 5.1 Service Account Mapping Matrix

| Google Service Account | Assigned Least-Privilege GSM Secrets | Prohibited Secrets (Explicitly Denied) |
| :--- | :--- | :--- |
| `sa-api` | `DATABASE_URL`, `REDIS_URL`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `FIREBASE_SERVICE_ACCOUNT_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `GOOGLE_MAPS_SERVER_API_KEY` | `RAZORPAY_WEBHOOK_SECRET` (handled solely by webhooks service) |
| `sa-dispatch` | `DATABASE_URL`, `REDIS_URL`, `JWT_PUBLIC_KEY`, `GOOGLE_MAPS_SERVER_API_KEY` | `JWT_PRIVATE_KEY`, `RAZORPAY_KEY_*`, `FIREBASE_SERVICE_ACCOUNT_KEY` |
| `sa-webhooks` | `DATABASE_URL`, `REDIS_URL`, `RAZORPAY_WEBHOOK_SECRET` | `JWT_PRIVATE_KEY`, `RAZORPAY_KEY_SECRET`, `GOOGLE_MAPS_*`, `FIREBASE_*` |
| `sa-worker` | `DATABASE_URL`, `REDIS_URL` | All payment, authentication, and external API keys |

### 5.2 Terraform Resource-Level IAM Binding Example

```hcl
resource "google_secret_manager_secret_iam_member" "api_db_access" {
  project   = var.project_id
  secret_id = "DATABASE_URL"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:sa-api@${var.project_id}.iam.gserviceaccount.com"
}
```

---

## 6. Local Development vs Cloud Run Environment Management

### 6.1 Local Development Workflow

- Developers copy the relevant `.env.example` file to `.env` or `.env.local` within each application directory:
  ```bash
  cp apps/api/.env.example apps/api/.env.local
  cp apps/dispatch/.env.example apps/dispatch/.env.local
  cp apps/webhooks/.env.example apps/webhooks/.env.local
  cp apps/admin/.env.example apps/admin/.env.local
  ```
- Local containers run via Docker Compose:
  - PostgreSQL 15 with PostGIS on port 5432 (`postgresql://postgres:postgres@localhost:5432/allgo_dev`)
  - Redis 7.0 on port 6379 (`redis://localhost:6379`)
- Ephemeral test RSA keypairs can be generated locally or provided in `.env.local` for sandbox token generation.

### 6.2 Cloud Run Production Deployment

In staging and production, Cloud Run v2 services mount secrets directly from Secret Manager at container startup using `--set-secrets`:

```bash
gcloud run deploy prod-allgo-api \
  --image asia-south1-docker.pkg.dev/allgo-prod/allgo/api:latest \
  --region asia-south1 \
  --service-account sa-api@allgo-prod.iam.gserviceaccount.com \
  --vpc-connector cr-connector \
  --set-env-vars NODE_ENV=production,PORT=8080 \
  --set-secrets DATABASE_URL=DATABASE_URL:latest,\
REDIS_URL=REDIS_URL:latest,\
JWT_PRIVATE_KEY=JWT_PRIVATE_KEY:latest,\
JWT_PUBLIC_KEY=JWT_PUBLIC_KEY:latest,\
FIREBASE_SERVICE_ACCOUNT_KEY=FIREBASE_SERVICE_ACCOUNT_KEY:latest,\
RAZORPAY_KEY_ID=RAZORPAY_KEY_ID:latest,\
RAZORPAY_KEY_SECRET=RAZORPAY_KEY_SECRET:latest,\
GOOGLE_MAPS_SERVER_API_KEY=GOOGLE_MAPS_SERVER_API_KEY:latest
```

---

## 7. Security Best Practices & Incident Response

1. **Pre-Commit Secret Scanning:**
   Developers must install `gitleaks` pre-commit hooks to automatically prevent accidental commits of keys or credentials.
2. **Automated Audit Logging:**
   All secret access events in Google Secret Manager are audited via Cloud Audit Logs (`data_read` and `data_write`). An alert triggers if an unexpected principal attempts to read `JWT_PRIVATE_KEY` or payment credentials.
3. **Compromise Response Protocol:**
   If any secret key is compromised:
   - Immediately execute the zero-downtime rotation procedure to rotate the secret in Google Secret Manager.
   - Invalidate active sessions or webhook tokens.
   - Review Cloud Audit Logs for access windows and potential data exposure.
