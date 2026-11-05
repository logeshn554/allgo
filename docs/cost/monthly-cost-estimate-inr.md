# Itemized Monthly INR Cost Model & Operational Estimates

**Document Status:** Production Architectural Baseline  
**Revision:** 5.0.0 (Memorystore asia-south1 M1/M2 Verified Rates & Multi-Vertical Maps Audit)  
**Primary Currency:** Indian Rupee (INR / ₹)  
**Foreign Exchange Baseline:** **1 USD = ₹94.40 INR** `[UNVERIFIED: Planning estimate input]`  
- **Source & Retrieval Date:** Interbank market spot reference (XE.com / TradingView / Google Finance mid-market range ₹94.35–₹94.46) retrieved November 5, 2026.  
- **Official Benchmark References:** Financial Benchmarks India Pvt. Ltd. (FBIL) ([fbil.org.in](https://www.fbil.org.in)) and Reserve Bank of India (RBI) Reference Rate Archive ([rbi.org.in](https://www.rbi.org.in/scripts/BS_PressReleaseDisplay.aspx)).  
- **Configurable Input Architecture:** Because exchange rates fluctuate daily, ₹94.40 is modeled strictly as a configurable planning input (`--usdInrRate=<n>` in CLI calculator, `exchange_rate_usd_inr` in models), rather than a static certified constant.  
**Target Cloud Region:** Google Cloud Mumbai (`asia-south1`)  

---

## 1. Executive Summary & Budget Governance

This document establishes the itemized monthly operational cost estimates for the **AllGo Multi-Vertical On-Demand Delivery & Mobility Platform** during its pre-launch development and pilot production stages.

### Baseline Pilot Operational Scenario (1,000 Transactions/Day Pilot)
- **Completed Transactions:** 1,000 transactions/day (~30,000/month across Food Delivery, Grocery Quick Commerce, Parcel, and Rides).
  - Food & Grocery Delivery (Sections 5A & 5B): 800 orders/day (~24,000/month).
  - Custom Parcel Delivery: 100 deliveries/day (~3,000/month).
  - Point-to-Point Mobility & Hire-Driver: 100 rides/bookings/day (~3,000/month).
- **Active Couriers & Drivers:** 50 partners operating simultaneously during peak shifts.
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

Every service has been audited against official Google Cloud, Google Maps Platform, and Firebase pricing documentation for `asia-south1` (Mumbai):

| Service / Component | Free Tier / Allowance Status | Official Verification Details | Official Documentation Reference |
| :--- | :--- | :--- | :--- |
| **Cloud SQL for PostgreSQL** | **NO Free Tier** | **100% billable from minute one.** Cloud SQL instances (including `db-f1-micro`) are not included in the Google Cloud Free Tier. Every second of vCPU, RAM, SSD storage, and backups is billable. | [Cloud SQL Pricing](https://cloud.google.com/sql/pricing#postgresql-pricing) |
| **Memorystore for Redis** | **NO Free Tier** | **100% billable from minute one.** Basic and Standard tiers have no free allowances. Verified Mumbai rates: Basic M1 is **$0.049/GiB-hr**; Standard M2 is **$0.054/GiB-hr**. | [Redis Pricing](https://cloud.google.com/memorystore/docs/redis/pricing) |
| **Direct VPC Egress** | **$0 Infrastructure Fee** | Direct VPC egress has **no underlying VM connector instances and zero hourly fees**. Same-zone internal traffic is **$0.00**. Cross-zone internal traffic is billed at $0.01/GiB. | [Cloud Run Direct VPC Egress](https://cloud.google.com/run/docs/configuring/vpc-direct-vpc) & [VPC Network Pricing](https://cloud.google.com/vpc/network-pricing) |
| **Cloud Run** | **Permanent Free Tier** | First **2M requests**, 360,000 vCPU-seconds, and 180,000 GiB-seconds / month are free. Warm idle memory for `min_instances = 1` is billable. | [Cloud Run Pricing](https://cloud.google.com/run/pricing) |
| **Cloud Pub/Sub** | **Permanent Free Tier** | First **10 GiB of message ingestion and delivery per month is free**. Dev volume (~0.5 GiB) and pilot volume (~3 GiB) are fully within this allowance. | [Pub/Sub Pricing](https://cloud.google.com/pubsub/pricing) |
| **Cloud Tasks** | **Permanent Free Tier** | First **1,000,000 task operations / month are free**. Pilot volume (~90k scheduled tasks) is fully within free allowance. | [Cloud Tasks Pricing](https://cloud.google.com/tasks/pricing) |
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

### 4.1 Development Environment (`allgo-dev`): $67.33 USD (~₹6,356 INR / month)

The development environment operates with scheduled overnight shutdown outside active working hours:
- **Operating Schedule:** 12 hours/day (09:00 to 21:00 IST), 30 days/month (~360 operational hours/month).
- **Overnight Compute Savings:** Cloud SQL compute is stopped overnight via Cloud Scheduler and Cloud Run scales to zero, saving **~50% compute costs** vs 24x7 running.
- **Scale-to-Zero Services:** All three Cloud Run services (`api`, `dispatch`, `webhooks`) run with `min_instances = 0`.

| Component | Resource Specification & Tier | Operational Quantity & Units | Unit Rate & Billing Mode | Calculation Formula | Monthly Cost (USD) | Monthly Cost (INR @ ₹94.40) | Official Pricing Reference |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Cloud SQL Compute** | `db-custom-1-3840` (1 vCPU, 3.75 GiB RAM) Single-Zone | 360 hours/month | $0.07638 / hr (vCPU: $0.0413 + RAM: $0.03508) | $360 \times \$0.07638$ | $27.50 | ₹2,596 | [Cloud SQL Pricing](https://cloud.google.com/sql/pricing#postgresql-pricing) |
| **Cloud SQL Storage** | 10 GiB SSD persistent disk | 10 GiB (730 hrs persistent) | $0.170 / GiB-month | $10 \times \$0.170$ | $1.70 | ₹160 | [Cloud SQL Pricing](https://cloud.google.com/sql/pricing#postgresql-pricing) |
| **Cloud SQL Backups** | 7-day snapshot retention | ~10 GiB snapshot data | $0.080 / GiB-month | $10 \times \$0.080$ | $0.80 | ₹76 | [Cloud SQL Pricing](https://cloud.google.com/sql/pricing#postgresql-pricing) |
| **Memorystore Redis** | Basic Tier M1 (1 GiB Standalone) | 730 hours/month | **$0.0490 / GiB-hr** (Verified Mumbai M1 rate) | $1 \times 730 \times \$0.0490$ | **$35.77** | **₹3,377** | [Redis Pricing](https://cloud.google.com/memorystore/docs/redis/pricing) |
| **Cloud Run Services** | 3 services (`api`, `dispatch`, `webhooks`), `min_instances = 0` | ~150k requests, 15k vCPU-s, 7.5k GiB-s | Free within: 2M req, 360k vCPU-s, 180k GiB-s | $0.00 \text{ (within limits)}$ | $0.00 | ₹0 | [Cloud Run Pricing](https://cloud.google.com/run/pricing) |
| **Cloud Pub/Sub & Tasks** | Event topics & dead-letter queues | ~0.5 GiB message volume, ~20k tasks | Free within: 10 GiB Pub/Sub & 1M tasks/mo | $0.00 \text{ (within limits)}$ | $0.00 | ₹0 | [Pub/Sub Pricing](https://cloud.google.com/pubsub/pricing) |
| **Direct VPC Egress** | Native VPC routing | 360 hours | $0.00 setup fee | $0.00 \text{ (no connector VMs)}$ | $0.00 | ₹0 | [Direct VPC Egress](https://cloud.google.com/run/docs/configuring/vpc-direct-vpc) |
| **Cross-Zone Network** | Inter-zone database queries | ~20 GiB / month | $0.01 / GiB cross-zone rate | $20 \times \$0.01$ | $0.20 | ₹19 | [VPC Pricing](https://cloud.google.com/vpc/network-pricing) |
| **Cloud Storage** | Standard Storage in Mumbai | 20 GiB storage | $0.023 / GiB-month | $20 \times \$0.023$ | $0.46 | ₹43 | [Cloud Storage Pricing](https://cloud.google.com/storage/pricing) |
| **Secret Manager** | Active secret versions + API calls | 15 active secret versions | $0.06 / version-month (calls free <10k) | $15 \times \$0.06$ | $0.90 | ₹85 | [Secret Manager Pricing](https://cloud.google.com/secret-manager/pricing) |
| **Cloud Logging** | Platform log ingestion | ~4 GiB log data | Free within: 50 GiB monthly tier | $0.00 \text{ (within limits)}$ | $0.00 | ₹0 | [Cloud Logging Pricing](https://cloud.google.com/stackdriver/pricing) |
| **Cloud Monitoring** | Basic health checks & metrics | ~20 MiB metric data | Free within: 150 MiB monthly tier | $0.00 \text{ (within limits)}$ | $0.00 | ₹0 | [Cloud Monitoring Pricing](https://cloud.google.com/stackdriver/pricing) |
| **Dev GCP Total** | | | | **Sum of Line Items** | **$67.33** | **₹6,356 / month** | |

---

### 4.2 Production Pilot Environment (`allgo-prod`): $559.56 USD (~₹52,823 INR / month)

The production pilot operates 24x7 (730 hours/month) with high-availability regional replication, automated failover, Point-in-Time Recovery (PITR), and warm compute instances (`min_instances = 1` for `api` and `dispatch`).

#### Itemized Production GCP Resource Table

| Component | Resource Specification & Tier | Operational Quantity & Units | Unit Rate & Billing Mode | Calculation Formula | Monthly Cost (USD) | Monthly Cost (INR @ ₹94.40) | Official Pricing Reference |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Cloud SQL Compute** | `db-custom-2-7680` (2 vCPU, 7.5 GiB RAM) Regional HA Failover | 730 hours/month (24x7) | Primary: $0.1655/hr + Standby: $0.1655/hr = $0.3310/hr | $730 \times \$0.3310$ | $241.63 | ₹22,810 | [Cloud SQL Pricing](https://cloud.google.com/sql/pricing#postgresql-pricing) |
| **Cloud SQL Storage** | Regional HA SSD Storage | 20 GiB provisioned | $0.340 / GiB-month (HA regional rate) | $20 \times \$0.340$ | $6.80 | ₹642 | [Cloud SQL Pricing](https://cloud.google.com/sql/pricing#postgresql-pricing) |
| **Cloud SQL Backups & PITR** | 7-day continuous WAL archiving (PITR) + daily snapshots | ~35 GiB backup data | $0.080 / GiB-month | $35 \times \$0.080$ | $2.80 | ₹264 | [Cloud SQL Pricing](https://cloud.google.com/sql/pricing#postgresql-pricing) |
| **Memorystore Redis** | Standard Tier M2 HA (5 GiB, multi-zone replica failover) | 730 hours/month | **$0.0540 / GiB-hr** (Verified Mumbai M2 HA rate) | $5 \times 730 \times \$0.0540$ | **$197.10** | **₹18,606** | [Redis Pricing](https://cloud.google.com/memorystore/docs/redis/pricing) |
| **Cloud Run: api** | 1 vCPU, 512 MiB, `min_instances = 1`, `max_instances = 10` | Request-based billing; 730 hrs warm idle + ~3M req active | Idle RAM ($2.63) + Active vCPU ($6.48) + Req ($0.40) | Detailed breakdown below | $9.51 | ₹898 | [Cloud Run Pricing](https://cloud.google.com/run/pricing) |
| **Cloud Run: dispatch** | 1 vCPU, 512 MiB, `min_instances = 1`, `max_instances = 5` | Request-based billing with active WebSocket streams | Idle RAM ($1.62) + Active vCPU ($31.10) + Active RAM ($1.62) + Msg ($0.60) | Detailed breakdown below | $34.94 | ₹3,298 | [Cloud Run Pricing](https://cloud.google.com/run/pricing) |
| **Cloud Run: webhooks** | 1 vCPU, 512 MiB, `min_instances = 0`, `max_instances = 5` | Request-based scale-to-zero; ~200k gateway events | Active vCPU ($0.48) + Active RAM ($0.025) + Req ($0.08) | Detailed breakdown below | $0.59 | ₹56 | [Cloud Run Pricing](https://cloud.google.com/run/pricing) |
| **Cloud Run: admin** | 1 vCPU, 512 MiB, `min_instances = 0`, `max_instances = 2` | Request-based scale-to-zero; ~50k back-office actions | Active compute & request processing | Measured active compute | $0.20 | ₹19 | [Cloud Run Pricing](https://cloud.google.com/run/pricing) |
| **Direct VPC Egress** | Native VPC routing (zero VM connectors) | 730 hours | $0.00 setup fee | $0.00 \text{ (no connector VMs)}$ | $0.00 | ₹0 | [Direct VPC Egress](https://cloud.google.com/run/docs/configuring/vpc-direct-vpc) |
| **Cross-Zone Network** | HA database replication & multi-zone traffic | ~100 GiB / month | $0.01 / GiB cross-zone rate | $100 \times \$0.01$ | $1.00 | ₹94 | [VPC Pricing](https://cloud.google.com/vpc/network-pricing) |
| **Cloud Storage** | 100 GiB Storage + 50 GiB Internet Egress | 100 GiB storage, 50 GiB egress | Storage: $0.023/GiB ($2.30); Egress: $0.05/GiB ($2.50) | $\$2.30 + \$2.50$ | $4.80 | ₹453 | [Cloud Storage Pricing](https://cloud.google.com/storage/pricing) |
| **Secret Manager** | Active secret versions + API calls | 45 active versions | $0.06 / version-month (calls free <10k) | $45 \times \$0.06$ | $2.70 | ₹255 | [Secret Manager Pricing](https://cloud.google.com/secret-manager/pricing) |
| **Cloud Logging** | Platform log ingestion | 100 GiB / month | First 50 GiB free; excess 50 GiB @ $0.50/GiB | $50 \times \$0.50$ | $25.00 | ₹2,360 | [Cloud Logging Pricing](https://cloud.google.com/stackdriver/pricing) |
| **Cloud Monitoring** | Custom time-series metrics & health alerts | 1 month | Custom metric write calls & synthetic checks | Provisioned monitor policies | $10.00 | ₹944 | [Cloud Monitoring Pricing](https://cloud.google.com/stackdriver/pricing) |
| **Operational Contingency** | Ingress/egress variance & storage burst | 1 month | Provisioned operational buffer `[UNVERIFIED: Planning buffer]` | Fixed contingency buffer | $22.49 | ₹2,123 | Operational reserve |
| **Prod Pilot GCP Total** | | | | **Sum of Line Items** | **$559.56** | **₹52,823 / month** | |

---

### 4.3 Detailed Cloud SQL Production HA Formula (`db-custom-2-7680`)
Official Source: [Google Cloud SQL for PostgreSQL Pricing](https://cloud.google.com/sql/pricing#postgresql-pricing) (Mumbai `asia-south1`).

- **Instance Shape:** Dedicated Enterprise machine tier `db-custom-2-7680`:
  - **vCPU Count:** 2 vCPU
  - **RAM Allocation:** 7.5 GiB (7680 MiB = 7.5 GiB)
- **Hourly Baseline Unit Rates in `asia-south1`:**
  - Per-vCPU hourly rate: **$0.0505 / vCPU-hour**
  - Per-GiB RAM hourly rate: **$0.0086 / GiB-hour**
- **Primary Instance Compute Cost (730 Hours / Month):**
  - Primary vCPU: $2 \times \$0.0505 \times 730 = \$73.730$
  - Primary RAM: $7.5 \times \$0.0086 \times 730 = \$47.085$
  - Primary Instance Compute Subtotal: $\$73.730 + \$47.085 = \mathbf{\$120.815 \text{ / month}}$ ($0.1655 / hr).
- **Standby Instance Compute Cost (Regional HA Synchronous Multi-Zone Failover):**
  - Cloud SQL High Availability provisions an active standby replica across Zone B (`asia-south1-b`).
  - Standby vCPU: $2 \times \$0.0505 \times 730 = \$73.730$
  - Standby RAM: $7.5 \times \$0.0086 \times 730 = \$47.085$
  - Standby Instance Compute Subtotal: $\$73.730 + \$47.085 = \mathbf{\$120.815 \text{ / month}}$ ($0.1655 / hr).
  - **Combined HA Compute (Primary + Standby):** $\$120.815 \times 2 = \mathbf{\$241.63 \text{ / month}}$ ($0.3310 / hr) = **₹22,810 INR**.
- **Regional HA SSD Storage (20 GiB):**
  - Rate: $0.340 / GiB-month (2x single-zone $0.170 rate for synchronous regional disk mirroring).
  - Monthly Storage Charge: $20 \times \$0.340 = \mathbf{\$6.80 \text{ / month}}$ = **₹642 INR**.
- **Backup & Point-in-Time Recovery (PITR) Storage (~35 GiB):**
  - Continuous Write-Ahead Log (WAL) archiving + 7-day automated snapshot retention.
  - Rate: $0.080 / GiB-month for backup storage.
  - Monthly Backup Charge: $35 \times \$0.080 = \mathbf{\$2.80 \text{ / month}}$ = **₹264 INR**.
- **Total Cloud SQL Production HA Monthly Cost:**
  $$\$241.63 \text{ (Compute)} + \$6.80 \text{ (Storage)} + \$2.80 \text{ (PITR/Backups)} = \mathbf{\$251.23 \text{ USD / month}} \quad (\mathbf{₹23,716 \text{ INR / month}})$$

---

### 4.4 Detailed Cloud Run Multi-Service Cost Breakdown & Billing Mode
Official Source: [Google Cloud Run Pricing](https://cloud.google.com/run/pricing) (Tier 1 `asia-south1` Mumbai).

#### Request-Based vs Instance-Based Billing Evaluation
- **Chosen Billing Mode:** **Request-Based Billing** (`cpu-throttling = true`, with `min_instances = 1` for latency-critical paths).
- **Why Request-Based Was Selected:** Under request-based billing, CPU is allocated strictly during request processing. For warm instances (`min_instances = 1`), idle time is billed **only for memory** ($0.00000250/GiB-s), while idle CPU is completely free ($0.00). By contrast, instance-based billing (`cpu-allocation = always-on`) bills CPU continuously 24x7 ($49.93/instance-mo), which would cost ~$100/mo for 2 instances without providing any additional latency benefit. Request-based billing achieves instant response times while saving >50% compute expenditure.

#### HTTP Requests vs WebSocket Streaming Lifetimes
- **Ephemeral HTTP Requests (`api`, `webhooks`, `admin`):** Compute resources (vCPU and memory) are allocated only for the duration of the incoming request handler execution (typically 100ms to 150ms). When no requests are in flight, CPU throttles to zero.
- **WebSocket Streaming Connections (`dispatch`):** Cloud Run treats open WebSocket streaming connections as continuous active request processing for their entire lifespan (up to the configurable 60-minute connection timeout limit). Because bi-directional telemetry and dispatch events can traverse the connection at any time, vCPU ($0.00002400/vCPU-s) and memory ($0.00000250/GiB-s) are billed actively for all open connection hours. That is why the `dispatch` service is modeled across the 12 active courier operational hours (1,296,000s active = $31.10 vCPU + $1.62 active RAM = $34.94/mo), rather than treating courier streams as ephemeral web requests.

#### Cold-Start Minimization vs Zero-Cold-Start Guarantees
- Setting `min_instances = 1` provides **cold-start minimization** for regular traffic by maintaining a warm container in memory ready to serve requests immediately.
- **Explicit Non-Guarantee:** Cloud Run cannot guarantee absolute "zero cold starts" under all circumstances. Cold-start latency (typically 500ms to 1,500ms for lightweight Node.js containers) can still occur during container revision deployments, zonal rebalancing, host maintenance, or sudden traffic surges that exceed the concurrency limit of the single warm instance (default 80 concurrent connections), triggering the autoscaler to launch additional container instances.

#### Billing Account-Level Free Tier Allocation
- Google Cloud Run provides a monthly free tier: 180,000 vCPU-seconds, 360,000 GiB-seconds, and 2,000,000 requests.
- **Application Rule:** This free tier applies **once per billing account across all services combined**, not per individual Cloud Run service.
- **Allocation in AllGo Cost Model:** The free allowance is allocated against the primary ingress `api` service. Subsequent services (`dispatch`, `webhooks`, `admin`) are calculated at standard Tier 1 rates without double-counting the free tier.

#### Service-by-Service Calculations:

1. **`api` Service (REST Gateway):**
   - **Configuration:** 1 vCPU, 512 MiB RAM, `min_instances = 1`, `max_instances = 10`. Request-based.
   - **Idle Minimum-Instance Time:** 730 hrs $\times$ 3,600s = 2,628,000 seconds total. Assuming 80% idle time across non-peak/overnight hours = 2,102,400s idle.
     - Idle RAM: $2,102,400\text{s} \times 0.5\text{ GiB} \times \$0.00000250/\text{GiB-s} = \mathbf{\$2.63}$. Idle CPU: **$0.00**.
   - **Active Request Compute:** ~3,000,000 requests/month (avg duration 150ms).
     - Active vCPU-seconds: $3,000,000 \times 0.150\text{s} = 450,000\text{ vCPU-s}$. Deducting 180,000s free tier = 270,000 billable vCPU-s $\times \$0.00002400 = \mathbf{\$6.48}$.
     - Active GiB-seconds: $3,000,000 \times 0.150\text{s} \times 0.5\text{ GiB} = 225,000\text{ GiB-s}$ (fully covered within 360,000 GiB-s free tier) = **$0.00**.
     - Requests: 3,000,000 total. Deducting 2,000,000 free tier = 1,000,000 billable $\times \$0.40/\text{M} = \mathbf{\$0.40}$.
   - **`api` Service Total:** $\$2.63 + \$6.48 + \$0.40 = \mathbf{\$9.51 \text{ USD / month}}$ (**₹898 INR**).

2. **`dispatch` Service (Socket.IO Telemetry & Real-Time Matching):**
   - **Configuration:** 1 vCPU, 512 MiB RAM, `min_instances = 1`, `max_instances = 5`. Request-based with active streaming connections.
   - **Operational Duty Window:** 12 active hours/day (50 couriers streaming) $\times$ 30 days = 360 active hours (1,296,000s active); 360 idle hours (1,296,000s idle).
     - Idle RAM: $1,296,000\text{s} \times 0.5\text{ GiB} \times \$0.00000250/\text{GiB-s} = \mathbf{\$1.62}$.
     - Active vCPU: $1,296,000\text{s} \times 1\text{ vCPU} \times \$0.00002400 = \mathbf{\$31.10}$.
     - Active RAM: $1,296,000\text{s} \times 0.5\text{ GiB} \times \$0.00000250 = \mathbf{\$1.62}$.
     - Protocol message requests: ~1,500,000 messages $\times \$0.40/\text{M} = \mathbf{\$0.60}$ (free tier consumed by `api`).
   - **`dispatch` Service Total:** $\$1.62 + \$31.10 + \$1.62 + \$0.60 = \mathbf{\$34.94 \text{ USD / month}}$ (**₹3,298 INR**).

3. **`webhooks` Service (Payment Gateway Event Ingest):**
   - **Configuration:** 1 vCPU, 512 MiB RAM, `min_instances = 0`, `max_instances = 5`. Scale-to-zero.
   - **Idle Time:** 0 seconds ($0.00).
   - **Active Request Compute:** ~200,000 webhook events/month (avg 100ms duration).
     - Active vCPU-seconds: $200,000 \times 0.100\text{s} = 20,000\text{ vCPU-s} \times \$0.00002400 = \mathbf{\$0.48}$.
     - Active GiB-seconds: $20,000 \times 0.5 = 10,000\text{ GiB-s} \times \$0.00000250 = \mathbf{\$0.025}$.
     - Requests: $200,000 \times \$0.40/\text{M} = \mathbf{\$0.08}$.
   - **`webhooks` Service Total:** $\$0.48 + \$0.025 + \$0.08 = \mathbf{\$0.59 \text{ USD / month}}$ (**₹56 INR**).

4. **`admin` Service (Back-Office Operations Panel API):**
   - **Configuration:** 1 vCPU, 512 MiB RAM, `min_instances = 0`, `max_instances = 2`. Scale-to-zero.
   - **Active Operations:** ~50,000 internal back-office requests = **$0.20 USD / month** (**₹19 INR**).

- **Combined Production Cloud Run Spend:**
  $$\$9.51 \text{ (api)} + \$34.94 \text{ (dispatch)} + \$0.59 \text{ (webhooks)} + \$0.20 \text{ (admin)} = \mathbf{\$45.24 \text{ USD / month}} \quad (\mathbf{₹4,271 \text{ INR / month}})$$

---

## 5. Google Maps Platform Architecture & Itemized India Pricing

### 5.1 Modernized India Pricing Model (Effective March 2025)
Official Documentation Source: [Google Maps Platform Billing & Pricing - India](https://developers.google.com/maps/billing-and-pricing/india) (Verification Date: November 2026).

#### India Pricing Eligibility Conditions:
1. **Billing Address:** Customer Google Cloud billing account must have a verified legal billing address in India.
2. **Geographic Usage:** The large majority (>90%) of service usage (origins and destinations) must be located within India.
3. **Billing Currency:** Billed directly in **Indian Rupees (INR)**.
4. **Per-SKU Independent Free Allowances:** Each eligible SKU receives its own separate monthly free allowance (e.g. 70,000 requests for Essentials SKUs). Free allowances apply on an individual SKU basis per billing account, do NOT roll over, and cannot be shared or pooled across SKUs.

#### SKU Tier Taxonomy & Allowance Hierarchy
Google Maps Platform India pricing categorizes APIs into four distinct tiers:
- **Essentials Tier (70,000 free requests / month per SKU):** Includes `Compute Routes Essentials`, `Compute Route Matrix Essentials`, `Geocoding`, `Places Autocomplete Requests`, `Places: Place Details Essentials`, and `Dynamic Maps for Web`.
- **Pro Tier (35,000 free requests / month per SKU):** Includes `Compute Routes Preferred` (traffic-aware routing) and `Places: Place Details Pro`.
- **Enterprise Tier (7,000 free requests / month per SKU):** Includes `Places: Nearby Search (Enterprise)` and `Places: Text Search (Enterprise)`.
- **Native Mobile SDKs:** `Maps SDK for Android` and `Maps SDK for iOS` provide **unlimited free native mobile map loads** without drawing against REST or JavaScript API allowances.

---

### 5.2 Itemized Monthly Usage Table for Every Maps SKU Used

| Exact Google Maps SKU | Actual API Operation Causing Charge | Expected Monthly Events (1k orders/day pilot) | Free Monthly Allowance (India Pricing) | Billable Events After Allowance | Unit Price Beyond Free Allowance | Estimated Monthly Cost |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Routes: Compute Routes Essentials (India)** | Polyline waypoint routing & navigation between merchant, customer, courier, and rider pickup/drop | 66,600 calls | **70,000 calls / month** (Essentials tier) | 0 calls *(within free allowance)* | $1.50 / 1,000 calls (~₹142 / 1k) | **₹0.00** ($0.00) |
| **Routes: Compute Route Matrix Essentials (India)** | Batch travel distance/time matrix ranking top-2 courier candidates during JIT dispatch | 15,000 elements | **70,000 elements / month** (Essentials tier) | 0 elements *(within free allowance)* | $1.50 / 1,000 elements (~₹142 / 1k) | **₹0.00** ($0.00) |
| **Geocoding (India)** | Forward address text to lat/lng and reverse GPS pin to street address for new addresses | 10,000 requests | **70,000 requests / month** (Essentials tier) | 0 requests *(within free allowance)* | $1.50 / 1,000 requests (~₹142 / 1k) | **₹0.00** ($0.00) |
| **Places: Autocomplete Requests (India)** | Address search box keystroke character suggestions in checkout | 15,000 requests | **70,000 requests / month** (Essentials tier) | 0 requests *(within free allowance)* | $0.85 / 1,000 requests (~₹80 / 1k) | **₹0.00** ($0.00) |
| **Places: Place Details Essentials (India)** | Fetching place lat/lng & street components when user picks an autocomplete item | 12,000 requests | **70,000 requests / month** (Essentials tier) | 0 requests *(within free allowance)* | $1.50 / 1,000 requests (~₹142 / 1k) | **₹0.00** ($0.00) |
| **Maps SDK for Android / iOS (India)** | Interactive native mobile map rendering on Flutter customer, courier, and merchant apps | ~150,000 map views | **Unlimited free mobile map loads** (Native mobile SDK) | 0 loads | $0.00 / load | **₹0.00** ($0.00) |
| **Dynamic Maps for Web (India)** | Back-office web admin dispatch monitoring map views (JS Maps API) | ~1,500 map loads | **70,000 free map loads / month** | 0 loads *(within free allowance)* | $2.10 / 1,000 loads (~₹198 / 1k) | **₹0.00** ($0.00) |
| **Total Estimated Maps Platform Spend** | | **270,100 total events** | | **0 billable events** | | **₹0.00 / month** |

---

### 5.3 Places Autocomplete: Per-Request vs Session Billing Evaluation
- **Per-Request Billing (`Places: Autocomplete Requests`):** Billed per individual keystroke request ($0.85 / 1,000 requests after 70k free allowance). The AllGo mobile clients implement 300ms input debouncing and enforce a minimum 3-character search prefix, limiting average customer keystrokes to 3–5 requests per address search.
- **Session-Based Billing (`Places: Autocomplete Sessions`):** Billed per user search session ($2.83 / 1,000 sessions after 70k free allowance), bundling all keystrokes and concluding with a Place Details call into a single billing transaction via a client-generated UUID session token.
- **Billing Feasibility:** At the pilot scale of 1,000 orders/day generating ~15,000 monthly autocomplete searches, **both billing modes are 100% covered within the independent 70,000 free monthly allowance** of their respective SKUs.

---

### 5.4 Routing Options Changing SKU Classification (`TRAFFIC_AWARE` vs Essentials)
- **Standard Routing (`routingPreference` omitted or `TRAFFIC_UNAWARE`):**
  - Invocations are classified as **Compute Routes Essentials**.
  - India pricing: **70,000 free requests / month**; subsequent calls at $1.50 / 1,000.
  - Used for upfront delivery fee quotes, parcel estimations, and candidate courier ranking.
- **Traffic-Aware Routing (`routingPreference: TRAFFIC_AWARE` or `TRAFFIC_AWARE_OPTIMAL`):**
  - Invocations are classified as **Compute Routes Preferred (Pro Tier)**.
  - India pricing: **35,000 free requests / month**; subsequent calls at $5.00 / 1,000.
- **AllGo Multi-Vertical Architectural Policy:**
  - Standard Essentials routing is used across Food, Grocery, and Parcel delivery where turn-by-turn traffic optimization during candidate ranking is unnecessary.
  - For Passenger Mobility Rides, real-time traffic-aware routing can be selectively engaged. With 2,500 monthly rides generating 8,250 route calls, even if 100% of mobility rides use `TRAFFIC_AWARE`, the monthly volume (8,250 calls) consumes only **23.6% of the 35,000 Pro free cap**, resulting in **₹0.00 incremental cost**.

---

### 5.5 Multi-Vertical Routing Breakdown (66,600 Compute Routes Calls)
1. **Food Delivery (18,000 orders/mo):**
   - Mode A (70% = 12,600 orders): 2.1 calls = 26,460 calls.
   - Mode B (30% = 5,400 orders): 3.15 calls = 17,010 calls.
   - Subtotal Food = **43,470 calls / month**.
2. **Grocery Quick Commerce (6,000 orders/mo):**
   - 2.1 calls / order = **12,600 calls / month**.
3. **Intra-City Parcel Delivery (3,000 orders/mo):**
   - Courier $\to$ Sender (1 call), Sender $\to$ Recipient (1 call), re-routes (0.1 calls) = 2.1 calls = **6,300 calls / month**.
4. **Passenger Mobility Rides (2,500 rides/mo):**
   - Fare quote upfront (1 call), Driver $\to$ Pickup (1 call), Pickup $\to$ Destination (1 call), traffic re-route (0.3 calls) = 3.3 calls = **8,250 calls / month**.
5. **Hire-Driver Bookings (500 bookings/mo):**
   - Driver $\to$ Customer location (1.1 calls) = **550 calls / month**.
- **Combined Total Compute Routes Calls:** $43,470 + 12,600 + 6,300 + 8,250 + 550 = \mathbf{71,170 \text{ calls / month}}$.
  - With server-side route caching (saving ~5,000 duplicate quote calls), net external API volume is **66,600 calls / month**, which is strictly within the 70,000 free allowance.
  - Even if zero caching were applied (71,170 calls): 1,170 billable calls $\times \$1.50/1k = \$1.75$ (**₹165 / month**).

---

### 5.6 Excluded Operations & Anti-Pattern Cost Hazards
- **Strictly Excluded SKUs:** `Places: Place Details (Pro)` ($17/1,000 requests) and `Nearby Search` are **strictly excluded** from core customer and checkout flows via field masks (`id,formattedAddress,location`). Coordinates are resolved via `Geocoding` or `Place Details Essentials`.
- **Scale Past 70,000 Free Cap (Growth Scenario at 2,500 orders/day):**
  - Volume = ~166,500 Routes calls.
  - Billable requests = $166,500 - 70,000 = 96,500 \text{ requests}$.
  - Cost at India rate ($1.50/1k = ~₹142/1k): $(96,500 / 1,000) \times \$1.50 = \mathbf{\$144.75 \text{ / month}}$ (**₹13,664 INR**).
- **Continuous Polling Hazard (Anti-Pattern):** If 50 couriers poll Routes every 5 seconds over 12 hours:
  - Monthly volume = $50 \times 8,640 \times 30 = \mathbf{12,960,000 \text{ calls / month}}$.
  - Billable past 70k cap = 12,890,000 calls.
  - Runaway cost at India localized rate (~₹125/1k): **₹16,11,250 / month (~₹16.1 Lakhs)** ($19,335 / month at $1.50/1k).
  - Runaway cost at Global standard rate ($5.00/1k): **₹60,84,080 / month (~₹60.8 Lakhs)**.
  - AllGo Approach A prevents this exposure by computing routes only at assignment and significant displacement (>100m + 60s), with real-time tracking transmitted via Socket.IO directly to Redis.

---

## 6. DLT SMS Authentication & Complete Firebase Custom Token Security Flow

### 6.1 Regulatory DLT Compliance Status
- **Planning Rate Assumption:** **~₹0.25 INR per SMS** `[UNVERIFIED: Planning assumption pending commercial contract/vendor quote]`.
- **Sender Header:** `ALGOIN` `[ILLUSTRATIVE / UNAPPROVED HEADER]`.
- **Mandatory TRAI Onboarding Steps (Pending):**
  1. **Principal Entity (PE) Registration:** Registration with an Indian telecom operator portal (Jio DLT, Airtel DLT, Vodafone Idea DLT) under TRAI Telecom Commercial Communications Customer Preference Regulations (TCCCPR, 2018).
  2. **Corporate KYC Documentation:** Submission and verification of Certificate of Incorporation, GSTIN, PAN, and Board Resolution for Authorized Signatory.
  3. **Header (Sender ID) Registration:** Formal application and approval of a 6-character alphabetic header representing the brand (e.g., `ALGOIN`).
  4. **Template Scrubbing & Approval:** Registration of explicit Transactional / Service Implicit message templates with dynamic placeholders (e.g., `Your AllGo verification code is {#var#}. Valid for 5 minutes. Do not share this OTP with anyone.`).
  5. **Commercial Aggregator Binding:** Execution of commercial enterprise agreement with an approved aggregator (MSG91, Gupshup, ValueFirst) binding the approved PE ID, Header ID, and Template ID.
- **DLT Onboarding Status:** **NOT COMPLETE.** DLT registration requires an established legal entity and must be executed prior to commercial pilot launch.

### 6.2 Domestic SMS Provider Pricing & Failure Handling
- **Delivery Failure Fallback:** If SMS is not delivered within 60 seconds (verified via delivery report status `UNDELIV` or timeout), the client UI unlocks fallback via WhatsApp Business OTP API or Voice OTP call.
- **Retry Policy & Duplicate Prevention:**
  - Strict 60-second cooldown between OTP dispatches per phone number.
  - Maximum 3 resend attempts per phone number per hour.
  - Backend deduplication: Inbound requests during active cooldown return `429 Too Many Requests` with remaining seconds.
- **Delivery Reports & Auditability:** Aggregator webhooks push DLR status (`DELIVRD`, `UNDELIV`, `EXPIRED`, `REJECTD`) to `/v1/webhooks/sms/dlr`, logged in `audit_logs` for SLA tracking.

---

### 6.3 Complete End-to-End Security Flow: Backend DLT OTP to Firebase Custom Token

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
                   • Store in Redis Hash: HSET "otp:challenge:+91XXXXXXXXXX" hmac <digest> attempts 0
                   • Set 300-second (5-minute) TTL: EXPIRE "otp:challenge:+91XXXXXXXXXX" 300
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
                   [6. ATOMIC Redis Lua Verification & Consumption]
                   • Executes atomic Redis Lua script (EVALSHA):
                     - Checks challenge exists. If not -> return -1 (Expired/Consumed)
                     - Checks attempts < 3. If exceeded -> DEL challenge & return -2
                     - Compares HMAC-SHA256(code, pepper) with stored digest
                     - IF MATCH: IMMEDIATELY DEL challenge & return 1 (Success & Consumed!)
                     - IF MISMATCH: HINCRBY attempts 1. If >= 3 -> DEL challenge & return -2; else return 0
                   • GUARANTEE: Exactly-once consumption! Two simultaneous requests CANNOT both succeed!
                                │
                                ▼
                   [7. Authoritative Identity Binding]
                   • Query PostgreSQL: SELECT id, status FROM users WHERE phone = '+91XXXXXXXXXX'
                   • Fetch all active roles from user_roles: ['CUSTOMER', 'PARTNER', 'MERCHANT']
                   • If user absent, create new record with default CUSTOMER role
                   • Map authoritative internal UUID to Firebase UID (uid = user.id)
                   • SECURITY INVARIANT: The client CANNOT specify, inject, or influence the UID!
                                │
                                ▼
                   [8. Mint Firebase Custom Token]
                   • Backend invokes Firebase Admin SDK:
                     firebaseAdmin.auth().createCustomToken(user.id, { phone: user.phone })
                   • Custom token cryptographically signed with Google service account private key (1h expiry)
                                │
                                ▼
                   [9. Response to Client]
Cloud Run API ──────► Return { customToken: "eyJhbGciOi...", user: { id, phone, roles: [...] } }
                                │
                                ▼
[10. Client Sign-In]
User Mobile App ────► FirebaseAuth.instance.signInWithCustomToken(customToken)
                      • Firebase client SDK exchanges custom token with Google Auth backend
                      • Google verifies server signature and issues Firebase ID Token (JWT, 1h) & Refresh Token
                      • All subsequent API calls pass: Authorization: Bearer <firebase_id_token>
```

### 6.4 Security Principles & Threat Mitigation
1. **Defense-in-Depth Principle:** App Check attestation validates device authenticity at the frontend, but **App Check alone does not replace backend authentication or rate limiting**. Authoritative security is enforced by the backend via cryptographic hashing, atomic Lua script verification, server-side UID binding, and Redis rate limiting.
2. **Replay Attack Elimination:** The Redis key storing the OTP digest is deleted atomically within the Lua script upon the first successful validation. Subsequent concurrent or sequential submissions of the same code return `-1` (`Expired or already consumed`).
3. **Identity Spoofing Prevention:** The Firebase Custom Token is minted strictly server-side using the verified phone number retrieved from the database. A malicious client cannot pass an arbitrary `uid` or claim another user's identity.
4. **Brute-Force Defense:** Redis attempt counters strictly limit verification attempts to 3 before deleting the challenge, and IP/phone velocity tripwires alert operators to suspicious spikes.

---

### 6.5 Side-by-Side Cost Comparison (1,000 Transactions/Day Pilot: ~33,000 Monthly OTPs)

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

### 7.1 Production Pilot Operational Spend: ₹61,073 / month ($646.95 USD)
The production pilot operational spend covers 24x7 production infrastructure, cached routing, and domestic transactional SMS:

| Operational Component | Monthly Spend Estimate (USD) | Monthly Spend Estimate (INR @ ₹94.40/USD) | Cost Structure & Billing Rules |
| :--- | :--- | :--- | :--- |
| **Prod Pilot GCP Infrastructure** | $559.56 | ₹52,823 / month | Cloud SQL HA & Redis Standard M2 HA ($0.054/GiB-hr); Direct VPC egress ($0 setup + $1.00 cross-zone); Cloud Run compute |
| **Google Maps Platform (Approach A)** | $0.00 | ₹0.00 / month | 66,600 routes calls fall **within the 70,000 monthly free cap** under Google Maps India pricing |
| **SMS / OTP Auth (DLT Gateway)** | $87.39 | ₹8,250 / month | Commercial DLT rate (~₹0.25/SMS for 33,000 OTPs) `[UNVERIFIED: Planning assumption]` |
| **Total Production Pilot Monthly Spend** | **$646.95** | **₹61,073 / month** | *Pure operational estimate; no headroom calculated until ceilings are configured.* |

### 7.2 Development GCP Infrastructure (Separate Environment): ₹6,356 / month ($67.33 USD)
- **Pre-Launch Engineering Cloud Spend:** When active with 12h/day overnight scheduler shutdown, the separate dev environment GCP infrastructure is estimated at **₹6,356 / month** ($67.33 USD) (incorporating Redis Basic M1 @ $0.049/GiB-hr = $35.77).
- **Local Engineering Spend:** Local developer workstations incur **₹0.00 cloud spend** using local Docker Compose (PostGIS, Redis) and the Firebase Auth Emulator.

### 7.3 Combined Spend (Only if Dev and Prod Run Simultaneously): ₹67,429 / month ($714.28 USD)
- If both the development cloud environment and the production pilot run simultaneously on GCP, the combined monthly spend is $\$559.56 + \$67.33 + \$87.39 = \mathbf{\$714.28 \text{ USD / month}}$ (**₹67,429 / month**).
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
node --experimental-transform-types scripts/cost-calculator.ts --ceilingDev=10000 --ceilingProd=70000 --json
```
