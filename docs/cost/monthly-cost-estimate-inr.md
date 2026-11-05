# Itemized Monthly INR Cost Model & Operational Estimates

**Document Status:** Production Architectural Baseline  
**Revision:** 3.0.0 (Optional Ceiling Config & Official Free-Tier Verification)  
**Primary Currency:** Indian Rupee (INR / ₹)  
**Standard Foreign Exchange Baseline:** 1 USD = ₹86.00 INR (as of November 2026 market baseline)  
**Target Cloud Region:** Google Cloud Mumbai (`asia-south1`)  

---

## 1. Executive Summary & Budget Governance

This document establishes the itemized monthly operational cost estimates for the **AllGo Multi-Vertical On-Demand Delivery & Mobility Platform** during its pre-launch development and pilot production stages.

### Budget Ceilings Architecture: Optional Configuration Variables
- **No Hardcoded Ceilings:** Budget ceilings are **not hardcoded** and contain no placeholder values.
- **Optional Config Variables:** Every budget ceiling is modeled as an optional configuration variable that remains **empty/unset by default**:
  - `dev_monthly_budget_ceiling`: Optional monthly ceiling for dev/pre-launch GCP environment.
  - `prod_monthly_budget_ceiling`: Optional monthly ceiling for production pilot GCP infrastructure.
  - `maps_monthly_budget_ceiling`: Optional monthly ceiling for Google Maps Platform.
  - `sms_monthly_budget_ceiling`: Optional monthly ceiling for SMS / OTP authentication.
- **Estimates Only (No Headroom):** Because ceiling values are decided later by the project owner, this financial model presents **pure operational cost estimates only**, with no headroom or buffer calculations, until explicit values are supplied.
- **Alert Hook Ready:** When values are populated via environment variables or Terraform (`TF_VAR_dev_monthly_budget_ceiling`, etc.), the monitoring subsystem automatically binds Google Cloud Billing budget alert triggers at 50%, 80%, and 100% of those values.

---

## 2. Official Free-Tier & Trial Credit Verification Matrix

Every service has been audited against official Google Cloud, Google Maps Platform, and Firebase documentation to determine whether it offers a permanent free tier, a recurring monthly credit, or is 100% billable from minute one:

| Service / Component | Free Tier / Credit Availability | Official Verification Status | Key Rules & Billing Conditions | Documentation Source Link |
| :--- | :--- | :--- | :--- | :--- |
| **Cloud SQL for PostgreSQL** | **NO Free Tier** | Verified | Every second of vCPU, RAM, SSD storage, and backups is 100% billable from creation. Instance `db-f1-micro` is **not** free. | [Cloud SQL Pricing](https://cloud.google.com/sql/pricing#postgresql-pricing) |
| **Memorystore for Redis** | **NO Free Tier** | Verified | Hourly instance provisioning is 100% billable from creation across all tiers (Basic and Standard). | [Memorystore Redis Pricing](https://cloud.google.com/memorystore/docs/redis/pricing) |
| **Firebase Phone Auth (Blaze)** | **Partial Free Tier** (10,000/mo) | Verified | First **10,000 phone verifications / month are FREE**. All subsequent verifications incur carrier SMS charges. | [Firebase Pricing](https://firebase.google.com/pricing) |
| **Google Maps Platform** | **Recurring Credit** ($200/mo) | Verified | **$200.00 USD / month recurring credit** automatically applied to every Google Maps billing account. | [Google Maps Billing Credits](https://developers.google.com/maps/billing-credits) |
| **Cloud Run** | **Permanent Free Tier** | Verified | First **2M requests**, 360,000 vCPU-seconds, and 180,000 GiB-seconds / month are free. Warm instances (`min_instances > 0`) incur billable idle memory. | [Cloud Run Pricing](https://cloud.google.com/run/pricing) |
| **Serverless VPC Access** | **NO Free Tier** | Verified | Connector `e2-micro` instances are billed at standard compute engine instance rates ($0.0084/hr/instance). | [VPC Access Pricing](https://cloud.google.com/vpc/docs/serverless-vpc-access#pricing) |
| **Cloud Storage (`asia-south1`)** | **NO Free Tier** in Mumbai | Verified | Google Cloud Free Tier 5 GB-mo applies strictly to US regions (`us-east1`, `us-west1`, `us-central1`). Storage in `asia-south1` is 100% billable @ $0.023/GB/mo. | [Cloud Storage Pricing](https://cloud.google.com/storage/pricing) |
| **Secret Manager** | **Partial Free Tier** (API calls only) | Verified | First **10,000 secret access calls / month are free**. Active secret versions ($0.06/version/mo) have **NO free tier**. | [Secret Manager Pricing](https://cloud.google.com/secret-manager/pricing) |
| **Cloud Logging** | **Permanent Free Tier** (50 GiB/mo) | Verified | First **50 GiB of log ingestion / month is free**. Subsequent logs billed at $0.50/GiB. | [Cloud Logging Pricing](https://cloud.google.com/stackdriver/pricing) |
| **Cloud Monitoring** | **Permanent Free Tier** | Verified | First **150 MiB of metric data / month is free**. Additional metrics billed at tiered rates. | [Cloud Monitoring Pricing](https://cloud.google.com/stackdriver/pricing) |
| **Cloud Scheduler & Pub/Sub** | **Permanent Free Tier** | Verified | First **3 Cloud Scheduler jobs are free**. First **10 GiB of Pub/Sub messages / month are free**. | [Scheduler Pricing](https://cloud.google.com/scheduler/pricing) |

---

## 3. GCP Infrastructure Cost Estimates: asia-south1 (Mumbai)

All infrastructure is priced within the `asia-south1` (Mumbai, India) region to ensure low network latency and domestic data residency compliance.

### 3.1 Development Environment (`allgo-dev`)

The development environment operates with scheduled overnight shutdown outside active working hours.

- **Operating Hours:** 12 hours/day (09:00 to 21:00 IST), Monday through Saturday (~360 hours/month).
- **Overnight Shutdown Savings:** Cloud SQL compute and non-essential connectors are shut down outside operating hours, saving **~50% compute costs** vs 24x7 running.
- **Scale-to-Zero Compute:** All three Cloud Run services (`api`, `dispatch`, `webhooks`) run with `min_instances = 0`.

#### Itemized Monthly Dev Breakdown

| Component | Specification | Operational Hours | Free Tier Status | Monthly Rate (USD) | Monthly Cost (INR @ ₹86/USD) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cloud SQL (PostgreSQL 15)** | `db-custom-1-3840` (1 vCPU, 3.75 GB RAM) Single Zone | 360 hours/month (12h/day off) | **NO Free Tier** | $27.50 | ₹2,365 |
| **Cloud SQL Storage** | 10 GB SSD Storage | 1 month | **NO Free Tier** | $1.70 | ₹146 |
| **Cloud SQL Backups** | 7-day retention (10 GB snapshot) | 1 month | **NO Free Tier** | $0.80 | ₹69 |
| **Memorystore Redis** | Basic Tier (1 GB standalone) | 730 hours/month | **NO Free Tier** | $17.52 | ₹1,507 |
| **Cloud Run Services** | 3 services (`api`, `dispatch`, `webhooks`), `min_instances = 0` | <2M requests, ~100k vCPU-s | **Covered by Free Tier** | $0.00 | ₹0 |
| **Serverless VPC Access** | 2 `e2-micro` connector instances | 360 hours/month | **NO Free Tier** | $6.05 | ₹520 |
| **Cloud Storage** | 20 GB Standard Storage + Network Egress | 20 GB | **NO Free Tier** in Mumbai | $0.46 | ₹40 |
| **Secret Manager** | 15 Secret Versions + 10,000 API calls | 15 versions | Calls free; versions billable | $0.90 | ₹77 |
| **Cloud Logging & Monitoring** | Logs ingestion + metric collection | ~5 GB/month | **Covered by Free Tier** | $0.00 | ₹0 |
| **Cloud Scheduler & Pub/Sub** | 2 scheduler jobs + telemetry topics | ~50k messages | **Covered by Free Tier** | $0.00 | ₹0 |
| **Dev GCP Total Estimate** | | | | **$54.93** | **₹4,724 / month** |

---

### 3.2 Production Pilot Environment (`allgo-prod`)

The production pilot operates 24x7 (730 hours/month) with high-availability regional replication, automated failover, Point-in-Time Recovery (PITR), and warm compute instances (`min_instances = 1`).

#### Itemized Monthly Prod Pilot Breakdown (Baseline: 1,000 Orders/Day)

| Component | Specification | Units / Hours | Free Tier Status | Monthly Rate (USD) | Monthly Cost (INR @ ₹86/USD) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cloud SQL (PostgreSQL 15)** | `db-custom-2-7680` (2 vCPU, 7.5 GB RAM) HA Regional Failover | 730 hours/month (24x7) | **NO Free Tier** | $232.76 | ₹20,017 |
| **Cloud SQL Storage** | 20 GB SSD Regional HA Storage | 1 month | **NO Free Tier** | $6.80 | ₹585 |
| **Cloud SQL Backups & PITR** | 7-day PITR retention + automated snapshots (~35 GB) | 1 month | **NO Free Tier** | $2.80 | ₹241 |
| **Memorystore Redis** | Standard Tier HA (5 GB, multi-zone replica failover) | 730 hours/month | **NO Free Tier** | $175.20 | ₹15,067 |
| **Cloud Run: api** | 1 vCPU, 512 MiB, `min_instances = 1`, `max_instances = 10` | 730 hrs warm + active compute (~3M req) | Idle memory billable; active partially free | $20.00 | ₹1,720 |
| **Cloud Run: dispatch** | 1 vCPU, 512 MiB, `min_instances = 1`, `max_instances = 5` | 730 hrs warm + active compute (~1.5M req) | Idle memory billable; active partially free | $15.80 | ₹1,359 |
| **Cloud Run: webhooks** | 1 vCPU, 512 MiB, `min_instances = 0`, `max_instances = 5` | Scale-to-zero, ~200k webhook executions | **Covered by Free Tier** | $0.80 | ₹69 |
| **Serverless VPC Access** | 2 `e2-micro` connector instances | 730 hours/month (24x7) | **NO Free Tier** | $12.26 | ₹1,054 |
| **Cloud Storage** | 100 GB Standard Storage + 50 GB Network Egress | 100 GB | **NO Free Tier** in Mumbai | $4.80 | ₹413 |
| **Secret Manager** | 45 Secret Versions + 50k calls | 45 versions | Calls free; versions billable | $2.70 | ₹232 |
| **Cloud Logging** | Log ingestion (100 GB/month, first 50 GB free) | 50 GB billable | First 50 GB free; excess billable | $25.00 | ₹2,150 |
| **Cloud Monitoring** | Custom metrics, alerting policies, health checks | 1 month | Basic free; synthetic billable | $10.00 | ₹860 |
| **Buffer / Operational Contingency** | Network ingress/egress variance + snapshot spikes | 1 month | **NO Free Tier** `[UNVERIFIED]` | $40.00 | ₹3,440 |
| **Prod Pilot GCP Total Estimate** | | | | **$548.92** | **₹47,207 / month** |

---

## 4. Google Maps Platform Architecture & Cost Estimates

Google Maps Platform is subject to a **$200.00 USD recurring monthly credit** per billing account.

### 4.1 Approach A: AllGo Optimized Route Caching Architecture

- **Single Route Call Per Leg:** Exactly 2 calls to `ComputeRoutes` per completed order (Leg 1: Courier $\to$ Merchant; Leg 2: Merchant $\to$ Customer).
- **Polyline Caching in Redis:** Full encoded route geometry cached in Redis (`order:route:<order_id>:<leg_index>`) with a 2-hour TTL.
- **Flapping Guard & 100m Displacement Gate:** Recalculation is triggered only if courier deviates $> 100$ meters from the cached route AND at least 60 seconds have elapsed since the prior calculation (<0.1 additional calls per order).

#### Monthly Cost Estimate for Approach A (1,000 Orders/Day Pilot)
- Routes API calls: $1,000 \text{ orders/day} \times 2.1 \text{ calls/order} \times 30 \text{ days} = 63,000 \text{ calls/month}$.
- Gross Routes Cost: $(63,000 / 1,000) \times \$5.00 = \$315.00 \text{ USD}$.
- Geocoding & Places Autocomplete (25% un-cached addresses): $\$45.00 \text{ USD}$.
- Total Gross Maps Cost: $\$315.00 + \$45.00 = \$360.00 \text{ USD}$.
- **Net Billable Cost (After $200 Monthly Credit):** $\$360.00 - \$200.00 = \mathbf{\$160.00 \text{ USD / month}}$ (**₹13,760 / month**).

### 4.2 Naive Continuous Polling Anti-Pattern (Cost Runaway Comparison)
If courier coordinates are polled every 5 seconds over a 12-hour day across 50 active couriers:
- Monthly calls: $50 \times 8,640 \text{ calls/day} \times 30 = 12,960,000 \text{ calls/month}$.
- Net Billable Cost: $\$64,600.00 \text{ USD / month}$ (**₹55,55,600 / month**).
- **Divergence Factor:** Approach A achieves a **404x cost reduction**, preventing runaway expenditure.

---

## 5. SMS / OTP Authentication Cost & Security Model

### 5.1 Pricing Structure
- **Firebase Free Tier:** **First 10,000 verifications / month are FREE** on the Blaze plan.
- **Subsequent Volume:**
  - *Domestic DLT SMS Route:* Estimated at **~₹0.30 / SMS** `[UNVERIFIED: Commercial rate via registered Indian DLT aggregator]`.
  - *Direct International Route:* **~$0.06 per verification** `[UNVERIFIED: Direct Google Identity Platform international rate]`.

#### Monthly Pilot Estimate (1,000 Orders/Day)
- Total monthly OTP volume: ~33,000 OTP verifications / month.
- Free Tier Volume: 10,000 OTPs (FREE).
- Billable Volume: 23,000 OTPs.
- **Monthly Net Cost Estimate (DLT Route @ ₹0.30):** $23,000 \times ₹0.30 = \mathbf{₹6,900 / \text{month}}$ ($80.23 USD).

### 5.2 SMS Pumping Defense Architecture
To prevent automated toll fraud from exhausting auth resources:
1. **Firebase App Check:** Cryptographic attestation via Play Integrity (Android), DeviceCheck / App Attest (iOS), and reCAPTCHA Enterprise (Web). Unattested calls receive `403 Forbidden` before SMS dispatch.
2. **`+91` Country Code Restriction:** Strictly rejects non-Indian phone prefixes at the network edge.
3. **Multi-Tier Rate Limits in Redis:** 1 OTP/60s cooldown per number, max 3 OTPs/hr per number, max 5 OTPs/15m per IP.
4. **Velocity Tripwire:** Automated alert if OTP generation exceeds 5x rolling 1h average.

---

## 6. Combined Pilot Operational Spend Summary

| Operational Service | Monthly Cost Estimate (USD) | Monthly Cost Estimate (INR @ ₹86/USD) | Free Tier / Credit Treatment |
| :--- | :--- | :--- | :--- |
| **Prod Pilot GCP Infrastructure** | $548.92 | ₹47,207 / month | Cloud SQL & Redis have **NO free tier**; Cloud Run free tier partially offsets compute. |
| **Google Maps Platform (Approach A)** | $160.00 | ₹13,760 / month | First **$200.00 USD/month covered by recurring credit**. |
| **SMS / OTP Authentication (DLT Route)** | $80.23 | ₹6,900 / month | First **10,000 verifications/month covered by Blaze free tier**. |
| **Total Monthly Pilot Spend Estimate** | **$789.15** | **₹67,867 / month** | *Estimates only; no headroom calculated until ceilings are configured.* |

*(Pre-launch engineering dev environment spend estimate: **₹4,724 / month** when active).*

---

## 7. Optional Budget Ceiling Variables & Alert Escalation Hooks

The infrastructure is pre-wired to support optional budget ceilings configured as variables. When ceiling amounts are provided, Google Cloud Billing Budgets and Cloud Monitoring trigger the following automated escalation matrix:

| Threshold Relative to Configured Ceiling | Automated System Action & Escalation Path |
| :---: | :--- |
| **50% of Ceiling** | **Informational Warning:** Pub/Sub message dispatched to Cloud Function; warning posted to Slack `#alerts-billing-dev` and `#alerts-billing-prod`; run-rate logged to BigQuery. |
| **80% of Ceiling** | **Critical Operator Alert:** High-priority `@channel` Slack alert and engineering lead notification; automatic suspension of non-essential dev workloads outside working hours. |
| **100% of Ceiling** | **Emergency Circuit Breakers:**<br>• Dev environment: Automated shutdown of dev Cloud SQL and scale Cloud Run instances to zero.<br>• Prod pilot: Cloud Run `max_instances` capped to prevent autoscaling runaway; on-call P1 alert dispatched.<br>• Google Maps: Client apps fallback to static cached routes; displacement re-route threshold widened to 500m.<br>• SMS Auth: Stricter rate limits enforced (1 OTP/3 hrs); web registration gated behind waitlist. |

---

## 8. CLI Calculator Verification Command

The cost model is executable via `scripts/cost-calculator.ts`:

```bash
# Execute with default parameters (displays estimates and marks ceilings as unconfigured)
node --experimental-transform-types scripts/cost-calculator.ts

# Execute in machine-readable JSON format
node --experimental-transform-types scripts/cost-calculator.ts --json

# Execute with user-defined ceilings (optional evaluation)
node --experimental-transform-types scripts/cost-calculator.ts --ceilingDev=10000 --ceilingProd=100000 --json
```
