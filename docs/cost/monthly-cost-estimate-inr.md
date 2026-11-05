# Itemized Monthly INR Cost Model & Operational Estimates

**Document Status:** Production Architectural Baseline  
**Revision:** 4.1.0 (Detailed Resource Breakdown, Topology Rules & DLT Custom-Token Security Flow)  
**Primary Currency:** Indian Rupee (INR / ₹)  
**Foreign Exchange Baseline:** **1 USD = ₹94.40 INR** `[UNVERIFIED: Planning estimate input]`  
- **Source & Retrieval Date:** Interbank market spot reference (XE.com / TradingView / Google Finance mid-market range ₹94.35–₹94.46) retrieved November 5, 2026.  
- **Official Benchmark References:** Financial Benchmarks India Pvt. Ltd. (FBIL) ([fbil.org.in](https://www.fbil.org.in)) and Reserve Bank of India (RBI) Reference Rate Archive ([rbi.org.in](https://www.rbi.org.in/scripts/BS_PressReleaseDisplay.aspx)).  
- **Configurable Input Architecture:** Because exchange rates fluctuate daily, ₹94.40 is modeled strictly as a configurable planning input (`--usdInrRate=<n>` in CLI calculator, `exchange_rate_usd_inr` in models), rather than a static certified constant.  
**Target Cloud Region:** Google Cloud Mumbai (`asia-south1`)  

---

## 1. Executive Summary & Budget Governance

This document establishes the itemized monthly operational cost estimates for the **AllGo Multi-Vertical On-Demand Delivery & Mobility Platform** during its pre-launch development and pilot production stages.

### Baseline Pilot Operational Scenario (1,000 Orders/Day Pilot)
- **Completed Orders:** 1,000 orders/day (~30,000 orders/month).
- **Active Couriers:** 50 couriers operating simultaneously during peak windows.
- **Operating Window:** 12 hours/day (09:00 to 21:00 IST).

### Budget Ceilings Governance: Optional Configuration Variables
- **Zero Invented Ceilings:** Budget ceilings are strictly decided by the project owner. No invented numbers or placeholder values exist in the codebase or infrastructure templates.
- **Optional Config Variables (Empty by Default):**
  - `dev_monthly_budget_ceiling`: Optional variable for dev/pre-launch GCP environment.
  - `prod_monthly_budget_ceiling`: Optional variable for production pilot GCP infrastructure.
  - `maps_monthly_budget_ceiling`: Optional variable for Google Maps Platform.
  - `sms_monthly_budget_ceiling`: Optional variable for SMS / OTP authentication.
- **Pure Estimates (No Headroom):** Because ceiling values are empty by default, this financial model presents **pure operational cost estimates only**, with zero headroom or buffer calculations, until explicit values are supplied by the owner.
- **Automated Escalation Hooks:** When values are provided via environment variables (`TF_VAR_dev_monthly_budget_ceiling`, etc.), Google Cloud Billing Budgets automatically provisions Pub/Sub alerts at 50%, 80%, and 100% of those amounts.

---

## 2. Official Free-Tier, Trial Credits & Billing Verification Matrix

Every service has been audited against official Google Cloud, Google Maps Platform, and Firebase pricing documentation:

| Service / Component | Free Tier / Allowance Status | Official Verification Details | Official Documentation Reference |
| :--- | :--- | :--- | :--- |
| **Cloud SQL for PostgreSQL** | **NO Free Tier** | **100% billable from minute one.** Cloud SQL instances (including `db-f1-micro`) are not included in the Google Cloud Free Tier. Every second of vCPU, RAM, SSD storage, and backups is billable. | [Cloud SQL Pricing](https://cloud.google.com/sql/pricing#postgresql-pricing) |
| **Memorystore for Redis** | **NO Free Tier** | **100% billable from minute one.** Basic and Standard tiers have no free allowances. Provisioned capacity is billed per GiB-hour. | [Redis Pricing](https://cloud.google.com/memorystore/docs/redis/pricing) |
| **Direct VPC Egress** | **$0 Infrastructure Fee** | Direct VPC egress has **no underlying VM connector instances and zero hourly fees**. Same-zone internal traffic is **$0.00**. Cross-zone internal traffic is billed at $0.01/GiB. | [Cloud Run Direct VPC Egress](https://cloud.google.com/run/docs/configuring/vpc-direct-vpc) & [VPC Network Pricing](https://cloud.google.com/vpc/network-pricing) |
| **Cloud Run** | **Permanent Free Tier** | First **2M requests**, 360,000 vCPU-seconds, and 180,000 GiB-seconds / month are free. Warm idle memory for `min_instances = 1` is billable. | [Cloud Run Pricing](https://cloud.google.com/run/pricing) |
| **Cloud Pub/Sub** | **Permanent Free Tier** | First **10 GiB of message ingestion and delivery per month is free**. Dev volume (~0.5 GiB) and pilot volume (~3 GiB) are fully within this allowance. | [Pub/Sub Pricing](https://cloud.google.com/pubsub/pricing) |
| **Google Maps Platform** | **Per-SKU Monthly Free Allowances** *(India localized pricing)* | The legacy universal $200 credit has been retired. Under modernized India pricing, eligible accounts receive independent monthly free SKU quotas: **70,000 free Compute Routes Essentials calls**, **70,000 free Geocoding calls**, and **70,000 free Places Autocomplete requests**. Maps SDK for Android/iOS has **unlimited free map loads** on mobile devices. Each SKU has its own independent quota. | [Google Maps India Pricing](https://developers.google.com/maps/billing-and-pricing/pricing/india-pricing) |
| **Firebase Phone Auth (Identity Platform)** | **NO 10,000 Free Tier for SMS** | Only **10 SMS/day globally (~300 SMS/month) are free**. Google Identity Platform charges **$0.07 USD per SMS (~₹6.61/SMS)** for Indian destinations. (Email/social auth has 50,000 free MAUs, but SMS incurs per-message carrier fees). | [Firebase Auth / Identity Platform Pricing](https://firebase.google.com/pricing) |
| **Cloud Storage (`asia-south1`)** | **NO Free Tier in Mumbai** | Free 5 GB-mo applies strictly to US regions (`us-east1`, `us-west1`, `us-central1`). Storage in `asia-south1` is 100% billable @ $0.023/GiB/mo. | [Cloud Storage Pricing](https://cloud.google.com/storage/pricing) |
| **Secret Manager** | **Partial Free Tier** | First **10,000 API access calls / month are free**. Active secret versions ($0.06/version/mo) have **NO free tier**. | [Secret Manager Pricing](https://cloud.google.com/secret-manager/pricing) |
| **Cloud Logging & Monitoring** | **Permanent Free Tier** | First **50 GiB/month of log ingestion is free** ($0.50/GiB beyond); first **150 MiB/month metric data is free**. | [Cloud Logging Pricing](https://cloud.google.com/stackdriver/pricing) |

---

## 3. Network Architecture & Topology: Direct VPC Egress

The AllGo system architecture uses **Direct VPC Egress** natively integrated into Cloud Run:

### 3.1 Connector Cost Elimination
- **Serverless VPC Access Connectors Removed:** Unlike legacy serverless architectures that required provisioning dedicated `e2-micro` connector VMs (incurring ~$10–$30/month in continuous idle waste), Direct VPC Egress carries **$0.00 fixed infrastructure cost**.

### 3.2 Network Traffic Topology & Pricing Rules
Network charges are governed strictly by Google Cloud Virtual Private Cloud (VPC) network pricing:

1. **Same-Zone Internal IP Traffic ($0.00 / GiB):**
   - Communication between Cloud Run and internal IP endpoints (Cloud SQL PostgreSQL, Memorystore Redis) routed within the exact same availability zone (e.g., `asia-south1-a` to `asia-south1-a`) incurs **$0.00 (free) data transfer charges**.
2. **Cross-Zone Internal IP Traffic ($0.01 / GiB):**
   - In a regional High-Availability (HA) topology, primary and standby database instances reside in different zones (`asia-south1-a` and `asia-south1-b`). Cloud Run instances routed across zones to internal private IPs incur standard inter-zone egress charges of **$0.01 per GiB**.
   - *Dev environment estimate:* ~20 GiB/month cross-zone telemetry = **$0.20 USD (~₹19 INR) / month**.
   - *Prod pilot environment estimate:* ~100 GiB/month cross-zone replication and telemetry = **$1.00 USD (~₹94 INR) / month**.
3. **Internet Network Egress:**
   - Outbound traffic from Cloud Run to external internet destinations (e.g., Razorpay payment APIs, external webhooks) utilizes Google's standard network tier. The first 100 GiB/month of general internet egress from compute instances is free under Google Cloud's general egress free tier.
   - Cloud Storage asset downloads (merchant images, delivery proofs) fetched directly by clients incur standard internet egress (~$0.05 per GiB for ~50 GiB = $2.50).

---

## 4. GCP Infrastructure Reproducible Cost Model: asia-south1 (Mumbai)

*(All figures computed using foreign exchange baseline 1 USD = ₹94.40 INR)*

### 4.1 Development Environment (`allgo-dev`): $49.08 USD (~₹4,633 INR / month)

The development environment operates with scheduled overnight shutdown outside active working hours:
- **Operating Schedule:** 12 hours/day (09:00 to 21:00 IST), 30 days/month (~360 operational hours/month).
- **Overnight Compute Savings:** Cloud SQL compute is stopped overnight via Cloud Scheduler and Cloud Run scales to zero, saving **~50% compute costs** vs 24x7 running.
- **Scale-to-Zero Services:** All three Cloud Run services (`api`, `dispatch`, `webhooks`) run with `min_instances = 0`.

| Component | Resource Specification & Tier | Operational Quantity & Units | Unit Rate & Billing Mode | Calculation Formula | Monthly Cost (USD) | Monthly Cost (INR @ ₹94.40) | Official Pricing Reference |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Cloud SQL Compute** | `db-custom-1-3840` (1 vCPU, 3.75 GiB RAM) Single-Zone | 360 hours/month | $0.07638 / hr (vCPU: $0.0413 + RAM: $0.03508) | $360 \times \$0.07638$ | $27.50 | ₹2,596 | [Cloud SQL Pricing](https://cloud.google.com/sql/pricing#postgresql-pricing) |
| **Cloud SQL Storage** | 10 GiB SSD persistent disk | 10 GiB (730 hrs persistent) | $0.170 / GiB-month | $10 \times \$0.170$ | $1.70 | ₹160 | [Cloud SQL Pricing](https://cloud.google.com/sql/pricing#postgresql-pricing) |
| **Cloud SQL Backups** | 7-day snapshot retention | ~10 GiB snapshot data | $0.080 / GiB-month | $10 \times \$0.080$ | $0.80 | ₹76 | [Cloud SQL Pricing](https://cloud.google.com/sql/pricing#postgresql-pricing) |
| **Memorystore Redis** | Basic Tier (1 GiB Standalone) | 730 hours/month | $0.0240 / GiB-hr | $1 \times 730 \times \$0.0240$ | $17.52 | ₹1,654 | [Redis Pricing](https://cloud.google.com/memorystore/docs/redis/pricing) |
| **Cloud Run Services** | 3 services (`api`, `dispatch`, `webhooks`), `min_instances = 0` | ~150k requests, 15k vCPU-s, 7.5k GiB-s | Free within: 2M req, 360k vCPU-s, 180k GiB-s | $0.00 \text{ (within limits)}$ | $0.00 | ₹0 | [Cloud Run Pricing](https://cloud.google.com/run/pricing) |
| **Cloud Pub/Sub** | Event topics & dead-letter queues | ~0.5 GiB message volume | Free within: 10 GiB monthly tier | $0.00 \text{ (within limits)}$ | $0.00 | ₹0 | [Pub/Sub Pricing](https://cloud.google.com/pubsub/pricing) |
| **Direct VPC Egress** | Native VPC routing | 360 hours | $0.00 setup fee | $0.00 \text{ (no connector VMs)}$ | $0.00 | ₹0 | [Direct VPC Egress](https://cloud.google.com/run/docs/configuring/vpc-direct-vpc) |
| **Cross-Zone Network** | Inter-zone database queries | ~20 GiB / month | $0.01 / GiB cross-zone rate | $20 \times \$0.01$ | $0.20 | ₹19 | [VPC Pricing](https://cloud.google.com/vpc/network-pricing) |
| **Cloud Storage** | Standard Storage in Mumbai | 20 GiB storage | $0.023 / GiB-month | $20 \times \$0.023$ | $0.46 | ₹43 | [Cloud Storage Pricing](https://cloud.google.com/storage/pricing) |
| **Secret Manager** | Active secret versions + API calls | 15 active secret versions | $0.06 / version-month (calls free <10k) | $15 \times \$0.06$ | $0.90 | ₹85 | [Secret Manager Pricing](https://cloud.google.com/secret-manager/pricing) |
| **Cloud Logging** | Platform log ingestion | ~4 GiB log data | Free within: 50 GiB monthly tier | $0.00 \text{ (within limits)}$ | $0.00 | ₹0 | [Cloud Logging Pricing](https://cloud.google.com/stackdriver/pricing) |
| **Cloud Monitoring** | Basic health checks & metrics | ~20 MiB metric data | Free within: 150 MiB monthly tier | $0.00 \text{ (within limits)}$ | $0.00 | ₹0 | [Cloud Monitoring Pricing](https://cloud.google.com/stackdriver/pricing) |
| **Dev GCP Total** | | | | **Sum of Line Items** | **$49.08** | **₹4,633 / month** | |

---

### 4.2 Production Pilot Environment (`allgo-prod`): $537.66 USD (~₹50,756 INR / month)

The production pilot operates 24x7 (730 hours/month) with high-availability regional replication, automated failover, Point-in-Time Recovery (PITR), and warm compute instances (`min_instances = 1`).

| Component | Resource Specification & Tier | Operational Quantity & Units | Unit Rate & Billing Mode | Calculation Formula | Monthly Cost (USD) | Monthly Cost (INR @ ₹94.40) | Official Pricing Reference |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Cloud SQL Compute** | `db-custom-2-7680` (2 vCPU, 7.5 GiB RAM) HA Regional Failover | 730 hours/month (24x7) | $0.31885 / hr (HA primary + standby compute in `asia-south1`) | $730 \times \$0.31885$ | $232.76 | ₹21,973 | [Cloud SQL Pricing](https://cloud.google.com/sql/pricing#postgresql-pricing) |
| **Cloud SQL Storage** | Regional HA SSD Storage | 20 GiB provisioned | $0.340 / GiB-month (HA rate) | $20 \times \$0.340$ | $6.80 | ₹642 | [Cloud SQL Pricing](https://cloud.google.com/sql/pricing#postgresql-pricing) |
| **Cloud SQL Backups & PITR** | 7-day PITR retention + automated snapshots | ~35 GiB backup data | $0.080 / GiB-month | $35 \times \$0.080$ | $2.80 | ₹264 | [Cloud SQL Pricing](https://cloud.google.com/sql/pricing#postgresql-pricing) |
| **Memorystore Redis** | Standard Tier HA (5 GiB, multi-zone replica failover) | 730 hours/month | $0.0480 / GiB-hr (Standard HA tier in `asia-south1`) | $5 \times 730 \times \$0.0480$ | $175.20 | ₹16,539 | [Redis Pricing](https://cloud.google.com/memorystore/docs/redis/pricing) |
| **Cloud Run: api** | 1 vCPU, 512 MiB, `min_instances = 1`, `max_instances = 10` | 730 hrs warm idle + ~3M requests active | Idle memory: $730 \times 0.5 \times \$0.0000025 \times 3600 = \$3.28$; active compute past free tier = $16.72 | Baseline warm + compute | $20.00 | ₹1,888 | [Cloud Run Pricing](https://cloud.google.com/run/pricing) |
| **Cloud Run: dispatch** | 1 vCPU, 512 MiB, `min_instances = 1`, `max_instances = 5` | 730 hrs warm idle + ~1.5M requests active | Idle memory: $3.28; active periodic assignment compute = $12.52 | Baseline warm + compute | $15.80 | ₹1,492 | [Cloud Run Pricing](https://cloud.google.com/run/pricing) |
| **Cloud Run: webhooks** | 1 vCPU, 512 MiB, `min_instances = 0`, `max_instances = 5` | Scale-to-zero, ~200k executions | Active request compute | Measured active compute | $0.80 | ₹76 | [Cloud Run Pricing](https://cloud.google.com/run/pricing) |
| **Direct VPC Egress** | Native VPC routing | 730 hours | $0.00 setup fee | $0.00 \text{ (no connector VMs)}$ | $0.00 | ₹0 | [Direct VPC Egress](https://cloud.google.com/run/docs/configuring/vpc-direct-vpc) |
| **Cross-Zone Network** | HA replication & multi-zone traffic | ~100 GiB / month | $0.01 / GiB cross-zone rate | $100 \times \$0.01$ | $1.00 | ₹94 | [VPC Pricing](https://cloud.google.com/vpc/network-pricing) |
| **Cloud Storage** | 100 GiB Storage + 50 GiB Internet Egress | 100 GiB storage, 50 GiB egress | Storage: $0.023/GiB ($2.30); Egress: $0.05/GiB ($2.50) | $\$2.30 + \$2.50$ | $4.80 | ₹453 | [Cloud Storage Pricing](https://cloud.google.com/storage/pricing) |
| **Secret Manager** | Active secret versions + API calls | 45 active versions | $0.06 / version-month (calls free <10k) | $45 \times \$0.06$ | $2.70 | ₹255 | [Secret Manager Pricing](https://cloud.google.com/secret-manager/pricing) |
| **Cloud Logging** | Platform log ingestion | 100 GiB / month | First 50 GiB free; excess 50 GiB @ $0.50/GiB | $50 \times \$0.50$ | $25.00 | ₹2,360 | [Cloud Logging Pricing](https://cloud.google.com/stackdriver/pricing) |
| **Cloud Monitoring** | Custom time-series metrics & health alerts | 1 month | Custom metric write calls & synthetic checks | Provisioned monitor policies | $10.00 | ₹944 | [Cloud Monitoring Pricing](https://cloud.google.com/stackdriver/pricing) |
| **Operational Contingency** | Ingress/egress variance & storage burst | 1 month | Provisioned operational buffer `[UNVERIFIED: Planning buffer]` | Fixed contingency | $40.00 | ₹3,776 | Operational reserve |
| **Prod Pilot GCP Total** | | | | **Sum of Line Items** | **$537.66** | **₹50,756 / month** | |

---

## 5. Google Maps Platform Architecture & Itemized India Pricing

### 5.1 Modernized India Pricing Model (Effective March 2025)
The legacy universal $200 monthly credit was retired in March 2025 and replaced by **product-specific monthly free allowances**. Under Google Maps Platform India-specific pricing (for accounts with an Indian billing address and domestic traffic):
- **Official Documentation Source:** [Google Maps Platform core services pricing list - India](https://developers.google.com/maps/billing-and-pricing/pricing/india-pricing) (Verification Date: November 2026).
- **Per-SKU Independence Rule:** Each eligible SKU receives its own separate monthly free allowance. Free allowances do NOT roll over and cannot be pooled or transferred between SKUs.

### 5.2 Implementation SKU Mapping & Expected Charges (1,000 Orders/Day Pilot)

Under AllGo Approach A, route requests are strictly bounded and cached:
- **Pickup Leg:** Courier accepted $\to$ Merchant (1 request).
- **Delivery Leg:** Courier picked up $\to$ Customer dropoff (1 request).
- **Recalculation:** Gated by **100m displacement AND 60s cooldown** (~0.1 additional calls/order).
- **Monthly Volume:** $1,000 \text{ orders/day} \times 2.1 \text{ calls} \times 30 \text{ days} = \mathbf{63,000 \text{ calls / month}}$.

#### Itemized SKU Breakdown & Billing Slabs

| Exact Implementation SKU | API / Service Invoked | Implementation Purpose | Monthly Pilot Volume | India Free Monthly Allowance (Per-SKU) | Billable Requests | Rate per 1,000 Beyond Free Cap (India) | Estimated Monthly Charge |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Routes: Compute Routes Essentials** | Routes API | Distance/time calculation & polyline path generation between courier, merchant, and dropoff | 63,000 calls | **70,000 free calls / month** | 0 *(within free cap)* | ~₹125 / 1,000 (~$1.32 USD) | **₹0.00** *(Covered by India Free Cap)* |
| **Geocoding** | Geocoding API | Converting text addresses to lat/long and reverse GPS-to-address lookups for new addresses | ~7,500 calls (25% un-cached) | **70,000 free calls / month** | 0 *(within free cap)* | ~₹125 / 1,000 (~$1.32 USD) | **₹0.00** *(Covered by India Free Cap)* |
| **Places: Autocomplete Requests** | Places API | Address search keystroke suggestions in customer checkout flow | ~11,250 requests (25% un-cached) | **70,000 free requests / month** | 0 *(within free cap)* | ~₹70 / 1,000 (~$0.74 USD) | **₹0.00** *(Covered by India Free Cap)* |
| **Maps SDK for Android** | Maps SDK | Interactive vector map rendering on courier and customer Android apps | ~150,000 map views | **Unlimited free mobile map loads** | 0 | $0.00 | **₹0.00** |
| **Maps SDK for iOS** | Maps SDK | Interactive map rendering on customer iOS app | Deferred to Mac/CI | **Unlimited free mobile map loads** | 0 | $0.00 | **₹0.00** |
| **Total Maps Estimated Spend** | | | | | | | **₹0.00 / month** |

> [!NOTE]
> **Strict SKU Boundaries:** AllGo does NOT invoke expensive `Places: Place Details (Pro)` or `Places: Nearby Search` in the core order lifecycle. Address coordinates are resolved via `Geocoding` by Place ID or address string (Essentials SKU), preserving all usage within the 70,000 monthly free tier.

#### Contrast with Naive Continuous Polling Anti-Pattern
If 50 active couriers poll the Routes API every 5 seconds over 12 hours:
- Monthly volume: $50 \times 8,640 \text{ calls/day} \times 30 = \mathbf{12,960,000 \text{ calls / month}}$.
- Billable requests past the 70,000 free cap: $12,890,000 \text{ requests}$.
- Cost at India localized rate (~₹125/1k): **₹16,11,250 / month (~₹16.1 Lakhs)**.
- Cost at Global standard rate ($5.00/1k): **₹60,84,080 / month (~₹60.8 Lakhs)**.
- Approach A eliminates this catastrophic financial risk entirely.

---

## 6. DLT SMS Authentication & Complete Firebase Custom Token Security Flow

### 6.1 Regulatory DLT Compliance Status
- **Planning Rate Assumption:** **~₹0.25 INR per SMS** `[UNVERIFIED: Planning assumption pending commercial contract/vendor quote]`.
- **Sender Header:** `ALGOIN` `[ILLUSTRATIVE / UNAPPROVED HEADER]`.
- **Mandatory TRAI Onboarding Steps (Pending):**
  1. **Principal Entity (PE) Registration:** Registration with an Indian telecom operator portal (Jio, Airtel, Vodafone Idea) under TRAI Telecom Commercial Communications Customer Preference Regulations (TCCCPR, 2018).
  2. **Corporate KYC Documentation:** Submission and verification of Certificate of Incorporation, GSTIN, PAN, and Board Resolution for Authorized Signatory.
  3. **Header (Sender ID) Registration:** Formal application and approval of a 6-character alphabetic header representing the brand (e.g., `ALGOIN`).
  4. **Template Scrubbing & Approval:** Registration of explicit Transactional / Service Implicit message templates with dynamic placeholders (e.g., `Your AllGo verification code is {#var#}. Valid for 5 minutes. Do not share this OTP with anyone.`).
  5. **Commercial Aggregator Binding:** Execution of commercial enterprise agreement with an approved aggregator (MSG91, Gupshup, ValueFirst) binding the approved PE ID, Header ID, and Template ID.
- **DLT Onboarding Status:** **NOT COMPLETE.** DLT registration requires an established legal entity and must be executed prior to commercial pilot launch.

---

### 6.2 Complete End-to-End Security Flow: Backend DLT OTP to Firebase Custom Token

The following security architecture governs authentication, completely eliminating client-side identity tampering, replay attacks, and SMS toll fraud:

```
[1. Initiate Login]
User Mobile App ────► POST /v1/auth/otp/send ────► Cloud Run API Gateway
                      • Payload: { phone: "+91XXXXXXXXXX" }
                      • Headers: { X-Firebase-AppCheck: "<token>" }
                                │
                                ▼
                   [2. Edge Defense & Validation]
                   • Verify Firebase App Check (Play Integrity / DeviceCheck / reCAPTCHA Enterprise)
                   • Enforce E.164 +91 Indian mobile format (+91[6-9]\d{9})
                   • Redis Rate Limit Check:
                     - 60s cooldown per phone number
                     - Max 3 OTP requests / hour per phone number
                     - Max 5 OTP requests / 15 min per IP address
                                │
                                ▼
                   [3. OTP Generation & Storage]
                   • Generate cryptographically secure 6-digit OTP (crypto.randomInt(100000, 1000000))
                   • Compute HMAC-SHA256(otp, server_pepper)
                   • Store in Redis: SET "otp:+91XXXXXXXXXX" hmac_digest EX 300 (5-minute TTL)
                   • Initialize attempt counter: SET "attempts:+91XXXXXXXXXX" 0 EX 300
                                │
                                ▼
                   [4. Domestic DLT SMS Dispatch]
                   • Dispatch SMS via Indian DLT Aggregator API using registered Header & Template ID
                   • User receives SMS: "Your AllGo verification code is 482910..."
                                │
                                ▼
[5. Submit Code]
User Mobile App ────► POST /v1/auth/otp/verify ──► Cloud Run API Gateway
                      • Payload: { phone: "+91XXXXXXXXXX", code: "482910" }
                                │
                                ▼
                   [6. Backend Verification & Replay Defense]
                   • Atomic Redis transaction:
                     - Increment "attempts:+91XXXXXXXXXX". If > 3 -> DEL key & return 429 Too Many Attempts
                     - Compare constant-time HMAC-SHA256(submitted_code, pepper) with stored digest
                     - IF MATCH: IMMEDIATELY DEL "otp:+91XXXXXXXXXX" (Guarantees zero OTP replay!)
                                │
                                ▼
                   [7. Authoritative Identity Binding]
                   • Query PostgreSQL: SELECT id, role, status FROM users WHERE phone = '+91XXXXXXXXXX'
                   • If not found, create new user record with default CUSTOMER role
                   • Map authoritative internal UUID to Firebase UID (e.g., uid = user.id)
                   • STRICT SECURITY INVARIANT: The client CANNOT specify or influence the UID!
                                │
                                ▼
                   [8. Mint Firebase Custom Token]
                   • Backend invokes Firebase Admin SDK:
                     firebaseAdmin.auth().createCustomToken(user.id, { role: user.role, phone: user.phone })
                   • Custom token cryptographically signed with Google service account private key
                   • Custom token has strict 1-hour expiration
                                │
                                ▼
                   [9. Response to Client]
Cloud Run API ──────► Return { customToken: "eyJhbGciOi...", user: { id, role, phone } }
                                │
                                ▼
[10. Client Sign-In]
User Mobile App ────► FirebaseAuth.instance.signInWithCustomToken(customToken)
                      • Firebase client SDK exchanges custom token with Google Auth backend
                      • Google verifies server signature and issues Firebase ID Token (JWT, 1h) & Refresh Token
                      • All subsequent API calls pass: Authorization: Bearer <firebase_id_token>
```

### 6.3 Security Principles & Threat Mitigation
1. **Defense-in-Depth Principle:** App Check attestation validates device authenticity at the frontend, but **App Check alone does not replace backend authentication or rate limiting**. Authoritative security is enforced by the backend via cryptographic hashing, atomic replay invalidation, server-side UID binding, and Redis rate limiting.
2. **Replay Attack Elimination:** The Redis key storing the OTP digest is deleted atomically upon the first successful validation. Subsequent submissions of the same code return `400 Invalid or expired OTP`.
3. **Identity Spoofing Prevention:** The Firebase Custom Token is minted strictly server-side using the verified phone number retrieved from the database. A malicious client cannot pass an arbitrary `uid` or claim another user's identity.
4. **Brute-Force & Toll Fraud Defense:** Redis attempt counters strictly limit verification attempts to 3 before invalidating the OTP, and IP/phone velocity tripwires alert operators to suspicious generation spikes.

---

### 6.4 Side-by-Side Cost Comparison (1,000 Orders/Day Pilot: ~33,000 Monthly OTPs)

| Metric / Dimension | Approach 1: Direct Firebase Phone Auth | Approach 2: Indian DLT Provider + Custom Token |
| :--- | :--- | :--- |
| **Pricing Model** | Google Identity Platform per-SMS rate for India: **$0.07 USD (~₹6.61 INR) per verification** | Commercial bulk transactional SMS via registered Indian aggregator: **~₹0.25 INR per SMS** `[UNVERIFIED]` |
| **Free Allowance** | First **10 SMS/day globally (~300 SMS/month)** per project | None (pay per transactional SMS bundle) |
| **Monthly Billable SMS (33k total)** | $33,000 - 300 = 32,700 \text{ paid SMS}$ | 33,000 paid SMS |
| **Estimated Monthly Spend** | $32,700 \times \$0.07 = \$2,289 \text{ USD} = \mathbf{₹2,16,082 / \text{month}}$ | $33,000 \times ₹0.25 = \mathbf{₹8,250 / \text{month}}$ ($87.39 USD) |
| **TRAI DLT Compliance** | Handled through Google's pooled shared shortcodes; no custom sender ID | 100% compliant with entity registration, approved sender ID (`ALGOIN`), and template scrubbing |
| **Architectural Verdict** | **Prohibitive for production scale in India** (~26x higher cost) | **Mandatory production architecture for India-market economics** |

> [!IMPORTANT]
> - **Phase 0 & Phase 1 Local Development:** Incur **₹0.00 SMS cost** by using Firebase Auth Emulator or pre-configured Firebase test phone numbers.
> - **Production Pilot:** Approach 2 (DLT SMS Gateway + Firebase Custom Token) is the primary recommendation. Direct Firebase SMS is retained strictly as an emergency fallback.

---

## 7. Operational Cost Summary & Environment Separation

### 7.1 Production Pilot Operational Spend: ₹59,006 / month ($625.05 USD)
The production pilot operational spend covers 24x7 production infrastructure, cached routing, and domestic transactional SMS:

| Operational Component | Monthly Spend Estimate (USD) | Monthly Spend Estimate (INR @ ₹94.40/USD) | Cost Structure & Billing Rules |
| :--- | :--- | :--- | :--- |
| **Prod Pilot GCP Infrastructure** | $537.66 | ₹50,756 / month | Cloud SQL HA & Redis Standard HA (NO free tier); Direct VPC egress ($0 setup + $1.00 cross-zone); Cloud Run compute |
| **Google Maps Platform (Approach A)** | $0.00 | ₹0.00 / month | 63,000 routes calls fall **within the 70,000 monthly free cap** under Google Maps India pricing |
| **SMS / OTP Auth (DLT Gateway)** | $87.39 | ₹8,250 / month | Commercial DLT rate (~₹0.25/SMS for 33,000 OTPs) `[UNVERIFIED: Planning assumption]` |
| **Total Production Pilot Monthly Spend** | **$625.05** | **₹59,006 / month** | *Pure operational estimate; no headroom calculated until ceilings are configured.* |

### 7.2 Development GCP Infrastructure (Separate Environment): ₹4,633 / month ($49.08 USD)
- **Pre-Launch Engineering Cloud Spend:** When active with 12h/day overnight scheduler shutdown, the separate dev environment GCP infrastructure is estimated at **₹4,633 / month** ($49.08 USD).
- **Local Engineering Spend:** Local developer workstations incur **₹0.00 cloud spend** using local Docker Compose (PostGIS, Redis) and the Firebase Auth Emulator.

### 7.3 Combined Spend (Only if Dev and Prod Run Simultaneously): ₹63,639 / month ($674.13 USD)
- If both the development cloud environment and the production pilot run simultaneously on GCP, the combined monthly spend is $\$537.66 + \$49.08 + \$87.39 = \mathbf{\$674.13 \text{ USD / month}}$ (**₹63,639 / month**).
- *Governance Rule:* During pre-launch development, prod resources are not provisioned (costs are zero). Dev resources can be destroyed when not in use.

---

## 8. Optional Budget Ceiling Variables & Automated Alert Escalation Hooks

The infrastructure is pre-wired to support optional budget ceilings configured as variables. When ceiling amounts are provided by the project owner via Terraform variables (`TF_VAR_dev_monthly_budget_ceiling`, `TF_VAR_prod_monthly_budget_ceiling`, etc.), Google Cloud Billing Budgets and Cloud Monitoring trigger the following automated escalation matrix:

| Threshold Relative to Configured Ceiling | Automated System Action & Escalation Path |
| :---: | :--- |
| **50% of Ceiling** | **Informational Warning:** Pub/Sub message dispatched to Cloud Function; warning notification posted to Slack `#alerts-billing-dev` and `#alerts-billing-prod`; run-rate logged to BigQuery. |
| **80% of Ceiling** | **Critical Operator Alert:** High-priority `@channel` Slack alert and engineering lead notification; automatic suspension of non-essential dev workloads outside working hours. |
| **100% of Ceiling** | **Emergency Circuit Breakers:**<br>• Dev environment: Automated shutdown of dev Cloud SQL and scale Cloud Run instances to zero.<br>• Prod pilot: Cloud Run `max_instances` capped to prevent autoscaling runaway; on-call P1 alert dispatched.<br>• Google Maps: Client apps fallback to static cached routes; displacement re-route threshold widened to 500m.<br>• SMS Auth: Stricter rate limits enforced (1 OTP/3 hrs); web registration gated behind waitlist. |

---

## 9. CLI Calculator Verification Command

The cost model is executable via `scripts/cost-calculator.ts`:

```bash
# Execute with default operational parameters (displays estimates and unconfigured ceilings)
node --experimental-transform-types scripts/cost-calculator.ts

# Execute in machine-readable JSON format
node --experimental-transform-types scripts/cost-calculator.ts --json

# Execute with custom exchange rate or operational parameters
node --experimental-transform-types scripts/cost-calculator.ts --usdInrRate=94.40 --ordersPerDay=2500 --json

# Execute with optional user-defined ceilings
node --experimental-transform-types scripts/cost-calculator.ts --ceilingDev=10000 --ceilingProd=60000 --json
```
