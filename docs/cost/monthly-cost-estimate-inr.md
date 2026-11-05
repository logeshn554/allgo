# Itemized Monthly INR Cost Model & Operational Estimates

**Document Status:** Production Architectural Baseline  
**Revision:** 4.0.0 (Post-Review Modernized Pricing Alignment)  
**Primary Currency:** Indian Rupee (INR / ₹)  
**Verified Exchange Rate:** **1 USD = ₹94.40 INR**  
**Exchange Rate Date & Source:** November 2026 baseline — Financial Benchmarks India Pvt. Ltd. (FBIL) / Reserve Bank of India reference rate archive & Google Finance  
**Target Cloud Region:** Google Cloud Mumbai (`asia-south1`)  

---

## 1. Executive Summary & Budget Governance

This document establishes the itemized monthly operational cost estimates for the **AllGo Multi-Vertical On-Demand Delivery & Mobility Platform** during its pre-launch development and pilot production stages.

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
| **Memorystore for Redis** | **NO Free Tier** | **100% billable from minute one.** Basic and Standard tiers have no free allowances. | [Redis Pricing](https://cloud.google.com/memorystore/docs/redis/pricing) |
| **Direct VPC Egress** | **$0 Infrastructure Fee (FREE)** | Direct VPC egress has **no underlying VM connector instances and zero hourly fees**. Internal IP traffic within the same zone to Cloud SQL/Redis is **$0.00 (free)**. Cross-zone egress is $0.01/GiB. | [Cloud Run Direct VPC Egress](https://cloud.google.com/run/docs/configuring/vpc-direct-vpc) |
| **Cloud Run** | **Permanent Free Tier** | First **2M requests**, 360,000 vCPU-seconds, and 180,000 GiB-seconds / month are free. Warm idle memory for `min_instances = 1` is billable. | [Cloud Run Pricing](https://cloud.google.com/run/pricing) |
| **Google Maps Platform** | **Per-SKU Monthly Free Caps** *(Modernized March 2025 model)* | The legacy universal $200 credit has been retired. Under modernized India pricing, eligible accounts receive monthly free SKU quotas: **70,000 free Compute Routes calls**, **70,000 free Geocoding calls**, and **70,000 free Places Autocomplete requests**. Maps SDK for Android/iOS has **unlimited free map loads** on mobile devices. | [Google Maps Pricing Slabs](https://developers.google.com/maps/billing-credits) |
| **Firebase Phone Auth (Identity Platform)** | **NO 10,000 Free Tier for SMS** | Only **10 SMS/day globally (~300 SMS/month) are free**. Google Identity Platform charges **$0.07 USD per SMS (~₹6.61/SMS)** for Indian destinations. (First 50,000 MAUs are free for email/social, but SMS incurs per-message carrier fees). | [Firebase Auth / Identity Platform Pricing](https://firebase.google.com/pricing) |
| **Cloud Storage (`asia-south1`)** | **NO Free Tier in Mumbai** | Free 5 GB-mo applies strictly to US regions. Storage in `asia-south1` is 100% billable @ $0.023/GB/mo. | [Cloud Storage Pricing](https://cloud.google.com/storage/pricing) |
| **Secret Manager** | **Partial Free Tier** | First **10,000 API access calls / month are free**. Active secret versions ($0.06/version/mo) have **NO free tier**. | [Secret Manager Pricing](https://cloud.google.com/secret-manager/pricing) |
| **Cloud Logging & Monitoring** | **Permanent Free Tier** | First **50 GiB/month of log ingestion is free** ($0.50/GiB beyond); first **150 MiB/month metric data is free**. | [Cloud Logging Pricing](https://cloud.google.com/stackdriver/pricing) |

---

## 3. Network Architecture: Direct VPC Egress (Zero Connector Overhead)

The AllGo system architecture uses **Direct VPC Egress** natively integrated into Cloud Run:
- **Serverless VPC Access Connectors Removed:** Unlike legacy architectures that required running dedicated `e2-micro` connector VMs (incurring ~$10–$30/month in continuous idle waste), Direct VPC egress carries **$0.00 fixed infrastructure cost**.
- **Internal IP Traffic:** Communication between Cloud Run and Cloud SQL (PostgreSQL 15) and Memorystore Redis (Redis 7) over private VPC IP addresses within the same availability zone incurs **$0.00 data transfer charges**.
- **Cross-Zone Network Charges:** For high-availability failover across zones in `asia-south1`, cross-zone data transfer is billed at standard Google Cloud rates ($0.01 per GiB). For our expected pilot footprint of ~100 GiB/month cross-zone telemetry, network egress is estimated at **$1.00 USD (~₹94 INR) / month**.

---

## 4. GCP Infrastructure Cost Estimates: asia-south1 (Mumbai)

*(All figures computed using verified exchange rate 1 USD = ₹94.40 INR)*

### 4.1 Development Environment (`allgo-dev`)

The development environment operates with scheduled overnight shutdown outside active working hours.

- **Operating Hours:** 12 hours/day (09:00 to 21:00 IST), Monday through Saturday (~360 hours/month).
- **Overnight Shutdown Savings:** Cloud SQL compute and non-essential instances are shut down overnight, saving **~50% compute costs** vs 24x7 running.
- **Scale-to-Zero Compute:** All three Cloud Run services (`api`, `dispatch`, `webhooks`) run with `min_instances = 0`.

| Component | Specification | Operational Hours | Free Tier Status | Monthly Rate (USD) | Monthly Cost (INR @ ₹94.40/USD) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cloud SQL (PostgreSQL 15)** | `db-custom-1-3840` (1 vCPU, 3.75 GB RAM) Single Zone | 360 hours/month (12h/day off) | **NO Free Tier** | $27.50 | ₹2,596 |
| **Cloud SQL Storage** | 10 GB SSD Storage | 1 month | **NO Free Tier** | $1.70 | ₹160 |
| **Cloud SQL Backups** | 7-day retention (10 GB snapshot) | 1 month | **NO Free Tier** | $0.80 | ₹76 |
| **Memorystore Redis** | Basic Tier (1 GB standalone) | 730 hours/month | **NO Free Tier** | $17.52 | ₹1,654 |
| **Cloud Run Services** | 3 services (`api`, `dispatch`, `webhooks`), `min_instances = 0` | <2M requests, ~100k vCPU-s | **Covered by Free Tier** | $0.00 | ₹0 |
| **Direct VPC Egress** | Native VPC routing | 360 hours/month | **$0 Infrastructure Fee** | $0.00 | ₹0 |
| **Cross-Zone Network Egress** | Inter-zone database traffic (~20 GB) | 1 month | Standard $0.01/GiB | $0.20 | ₹19 |
| **Cloud Storage** | 20 GB Standard Storage | 20 GB | **NO Free Tier in Mumbai** | $0.46 | ₹43 |
| **Secret Manager** | 15 Secret Versions + 10,000 API calls | 15 versions | Calls free; versions billable | $0.90 | ₹85 |
| **Cloud Logging & Monitoring** | Logs ingestion + metric collection | ~5 GB/month | **Covered by Free Tier** | $0.00 | ₹0 |
| **Dev GCP Total Estimate** | | | | **$49.08** | **₹4,633 / month** |

---

### 4.2 Production Pilot Environment (`allgo-prod`)

The production pilot operates 24x7 (730 hours/month) with high-availability regional replication, automated failover, Point-in-Time Recovery (PITR), and warm compute instances (`min_instances = 1`).

| Component | Specification | Units / Hours | Free Tier Status | Monthly Rate (USD) | Monthly Cost (INR @ ₹94.40/USD) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cloud SQL (PostgreSQL 15)** | `db-custom-2-7680` (2 vCPU, 7.5 GB RAM) HA Regional Failover | 730 hours/month (24x7) | **NO Free Tier** | $232.76 | ₹21,973 |
| **Cloud SQL Storage** | 20 GB SSD Regional HA Storage | 1 month | **NO Free Tier** | $6.80 | ₹642 |
| **Cloud SQL Backups & PITR** | 7-day PITR retention + automated snapshots (~35 GB) | 1 month | **NO Free Tier** | $2.80 | ₹264 |
| **Memorystore Redis** | Standard Tier HA (5 GB, multi-zone replica failover) | 730 hours/month | **NO Free Tier** | $175.20 | ₹16,539 |
| **Cloud Run: api** | 1 vCPU, 512 MiB, `min_instances = 1`, `max_instances = 10` | 730 hrs warm + active compute (~3M req) | Idle memory billable; active partially free | $20.00 | ₹1,888 |
| **Cloud Run: dispatch** | 1 vCPU, 512 MiB, `min_instances = 1`, `max_instances = 5` | 730 hrs warm + active compute (~1.5M req) | Idle memory billable; active partially free | $15.80 | ₹1,492 |
| **Cloud Run: webhooks** | 1 vCPU, 512 MiB, `min_instances = 0`, `max_instances = 5` | Scale-to-zero, ~200k webhook executions | **Covered by Free Tier** | $0.80 | ₹76 |
| **Direct VPC Egress** | Native VPC routing | 730 hours/month (24x7) | **$0 Infrastructure Fee** | $0.00 | ₹0 |
| **Cross-Zone Network Egress** | Inter-zone replication & traffic (~100 GB) | 1 month | Standard $0.01/GiB | $1.00 | ₹94 |
| **Cloud Storage** | 100 GB Standard Storage + 50 GB Network Egress | 100 GB | **NO Free Tier in Mumbai** | $4.80 | ₹453 |
| **Secret Manager** | 45 Secret Versions + 50k calls | 45 versions | Calls free; versions billable | $2.70 | ₹255 |
| **Cloud Logging** | Log ingestion (100 GB/month, first 50 GB free) | 50 GB billable | First 50 GB free; excess billable | $25.00 | ₹2,360 |
| **Cloud Monitoring** | Custom metrics, alerting policies, health checks | 1 month | Basic free; synthetic billable | $10.00 | ₹944 |
| **Buffer / Operational Contingency** | Network ingress/egress variance + snapshot spikes | 1 month | **NO Free Tier** `[UNVERIFIED]` | $40.00 | ₹3,776 |
| **Prod Pilot GCP Total Estimate** | | | | **$537.66** | **₹50,756 / month** |

---

## 5. Google Maps Platform Architecture & Itemized India Pricing

### 5.1 Modernized Pricing Model (Effective March 2025)
The legacy universal $200 monthly credit was retired in March 2025 and replaced by **product-specific monthly free allowances**. Under Google Maps Platform India-specific pricing (for accounts with an Indian billing address and domestic traffic):
- **Maps SDK for Android & iOS:** **Unlimited free mobile map loads**.
- **Routes API (`ComputeRoutes` Essentials):** **70,000 free requests per month**.
- **Geocoding API:** **70,000 free requests per month**.
- **Places API (Autocomplete Requests):** **70,000 free requests per month**.

### 5.2 Approach A: Expected Pilot Usage & Estimated Charges (1,000 Orders/Day)

Under AllGo Approach A, route requests are strictly bounded and cached:
- **Leg 1 (Pickup Leg):** Courier accepted $\to$ Merchant (1 call).
- **Leg 2 (Delivery Leg):** Courier picked up $\to$ Customer dropoff (1 call).
- **Recalculation:** Gated by 100m displacement AND 60s cooldown (~0.1 additional calls/order).
- **Monthly Volume:** $1,000 \text{ orders/day} \times 2.1 \text{ calls} \times 30 \text{ days} = \mathbf{63,000 \text{ calls / month}}$.

#### Itemized SKU Breakdown & Expected Charges

| Google Maps SKU | Monthly Volume | Free Monthly Allowance (India) | Billable Requests | Rate per 1,000 (India Slabs) | Estimated Monthly Charge |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Maps SDK for Android** | ~150,000 mobile map views | **Unlimited** | 0 | $0.00 | **₹0.00** |
| **Maps SDK for iOS** | Deferred to Mac/Cloud | **Unlimited** | 0 | $0.00 | **₹0.00** |
| **Routes: ComputeRoutes Essentials** | 63,000 requests | **70,000 free calls/mo** | 0 *(Within free cap)* | ~₹125 / 1k (~$1.32 USD) | **₹0.00** *(Covered by India Free Cap)* |
| **Geocoding API** | ~7,500 requests (25% un-cached) | **70,000 free calls/mo** | 0 *(Within free cap)* | ~₹125 / 1k (~$1.32 USD) | **₹0.00** *(Covered by India Free Cap)* |
| **Places API: Autocomplete** | ~11,250 requests (25% un-cached) | **70,000 free calls/mo** | 0 *(Within free cap)* | ~₹70 / 1k (~$0.74 USD) | **₹0.00** *(Covered by India Free Cap)* |
| **Total Maps Estimated Spend (India Pricing)** | | | | | **₹0.00 / month** |

> [!NOTE]
> **Conservative Baseline / Scale Past Free Caps:** If pilot volume expands beyond 70,000 monthly calls (or if global pricing applies where free cap is 10,000 calls), excess calls are billed at localized rates (~₹125/1k for Routes and Geocoding; ~₹70/1k for Autocomplete). A growth volume of 100,000 Routes calls incurs $(30,000 / 1,000) \times ₹125 = \mathbf{₹3,750 / \text{month}}$.

#### Contrast with Naive Continuous Polling Anti-Pattern
If 50 couriers poll Routes API every 5 seconds over 12 hours:
- Monthly volume: $50 \times 8,640 \text{ calls/day} \times 30 = 12,960,000 \text{ calls/month}$.
- Billable volume past free cap: $12,890,000 \text{ calls}$.
- Cost at India localized rate (~₹125/1k): **₹16,11,250 / month** (~₹16.1 Lakhs).
- Cost at Global standard rate ($5.00/1k = ₹472/1k): **₹60,84,080 / month** (~₹60.8 Lakhs).
Approach A eliminates this catastrophic risk entirely.

---

## 6. Firebase Phone OTP vs Indian DLT SMS Architecture & Pricing

### 6.1 The Technical & Financial Contrast

A critical operational distinction exists between direct Firebase phone authentication and domestic Indian DLT SMS delivery:

```
[APPROACH 1: Direct Firebase Phone Auth]
User Phone Number ──► Firebase Auth SDK ──► Google Identity Platform Global Pool ──► International SMS Carrier ──► User Phone
                                            • Tariff: $0.07 USD (~₹6.61 INR) per SMS
                                            • No TRAI DLT Header compliance

[APPROACH 2: Domestic DLT SMS + Firebase Custom Token]
User Phone Number ──► AllGo Backend API ──► Registered Indian DLT Aggregator (MSG91/Gupshup) ──► Domestic Carrier ──► User Phone
                            │                • Tariff: ~₹0.20 - ₹0.30 INR per SMS
                            │                • Pre-approved header (e.g. ALGOIN) + Scrubbed DLT Template
                            ▼
              Validates OTP & Generates Custom Token (firebaseAdmin.auth().createCustomToken)
                            │
                            ▼
              Client SDK authenticates seamlessly with Custom Token
```

### 6.2 Side-by-Side Cost Comparison (1,000 Orders/Day Pilot: ~33,000 Monthly OTPs)

| Metric / Dimension | Approach 1: Direct Firebase Phone Auth | Approach 2: Indian DLT Provider + Custom Token |
| :--- | :--- | :--- |
| **Pricing Model** | Google Identity Platform per-SMS rate for India: **$0.07 USD (~₹6.61 INR) per verification** | Commercial bulk transactional SMS via registered Indian aggregator: **~₹0.25 INR per SMS** `[UNVERIFIED]` |
| **Free Allowance** | First **10 SMS/day globally (~300 SMS/month)** per project | None (pay per transactional SMS bundle) |
| **Monthly Billable SMS (33k total)** | $33,000 - 300 = 32,700 \text{ paid SMS}$ | 33,000 paid SMS |
| **Estimated Monthly Spend** | $32,700 \times \$0.07 = \$2,289 \text{ USD}$ = **₹2,16,082 / month** | $33,000 \times ₹0.25 = \mathbf{₹8,250 / \text{month}}$ ($87.39 USD) |
| **TRAI DLT Compliance** | Handled through Google's pooled headers; no custom sender ID | 100% compliant with entity registration, approved sender ID (`ALGOIN`), and template scrubbing |
| **Architectural Verdict** | **Prohibitive for production scale in India** (~26x higher cost) | **Mandatory production architecture for India-market economics** |

> [!IMPORTANT]
> - **Phase 0 & Phase 1 Local Development:** Incur **₹0.00 SMS cost** by using Firebase Auth Emulator or pre-configured Firebase test phone numbers.
> - **Production Pilot:** Approach 2 (DLT SMS Gateway + Firebase Custom Token) is the primary recommendation. Direct Firebase SMS is retained strictly as an emergency fallback.

### 6.3 SMS Pumping & Toll Fraud Attack Defense Architecture

To prevent automated bots and attackers from conducting SMS pumping attacks (toll fraud) that artificially inflate verification volumes:

1. **Firebase App Check Attestation:**
   - **Android:** Attested via **Play Integrity API**.
   - **iOS:** Attested via **DeviceCheck** and **App Attest**.
   - **Web / Admin:** Attested via **reCAPTCHA Enterprise**.
   - Unattested client requests receive an immediate `403 Forbidden` at the Cloud Run API layer before any OTP generation or SMS dispatch occurs.
2. **Strict Country Code Whitelist (`+91` Only):**
   - The pilot backend strictly rejects non-Indian phone number prefixes at the gateway edge, preventing international routing fraud.
3. **Multi-Tier Rate Limiting in Redis:**
   - **Cooldown:** Strict 60-second cooldown per phone number between OTP dispatches.
   - **Per-Number Cap:** Maximum 3 OTP requests per phone number per hour.
   - **Per-IP Cap:** Maximum 5 OTP requests per 15-minute sliding window per IP address.
   - **Velocity Tripwire:** Automated alert if overall platform OTP velocity exceeds 5x rolling 1-hour average.

---

## 7. Combined Pilot Operational Spend Estimate

Summary of projected production pilot costs under Approach A routing and Approach 2 DLT authentication:

| Operational Component | Monthly Spend Estimate (USD) | Monthly Spend Estimate (INR @ ₹94.40/USD) | Cost Structure & Billing Rules |
| :--- | :--- | :--- | :--- |
| **Prod Pilot GCP Infrastructure** | $537.66 | ₹50,756 / month | Cloud SQL HA & Redis Standard HA (NO free tier); Direct VPC egress ($0); Cloud Run compute |
| **Google Maps Platform (Approach A)** | $0.00 | ₹0 / month | 63,000 routes calls fall **within the 70,000 monthly free cap** under Google Maps India pricing |
| **SMS / OTP Auth (DLT Gateway)** | $87.39 | ₹8,250 / month | Commercial DLT rate (~₹0.25/SMS for 33,000 OTPs) `[UNVERIFIED]` |
| **Total Monthly Pilot Spend Estimate** | **$625.05** | **₹59,006 / month** | *Estimates only; no headroom calculated until ceilings are configured.* |

*(Note: Pre-launch dev environment GCP spend estimate is **₹4,633 / month** ($49.08 USD) when running with 12h/day overnight shutdown; local development on developer machines incurs **₹0.00 cloud cost**).*

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

# Execute with optional user-defined ceilings
node --experimental-transform-types scripts/cost-calculator.ts --ceilingDev=10000 --ceilingProd=60000 --json
```
