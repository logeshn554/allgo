# Super-App Architecture & Design Decisions

This document records the foundational architecture, product decisions, and operational trade-offs agreed upon during brainstorming for the multi-vertical on-demand delivery and mobility platform. It serves as the single source of architectural truth for Phase 0 and subsequent phases.

---

## 1. Product Scope & Geographic Rollout

### 1.1 Multi-State Database-Driven Engine
- **Zero Hardcoded Geography:** All states, cities, service zones (PostGIS polygons), pricing matrices, required KYC documents, enabled verticals, and GST settings are database configurations managed via the Admin Web Panel.
- **State-by-State Rollout:** Every state starts in status `NOT_LAUNCHED`. The platform admin can activate a state to `LIVE`.
- **Coming Soon & Waitlist:** Users opening the app outside live zones see a localized "Coming Soon" screen with phone-number waitlist registration.
- **Pilot Geography:** **Tamil Nadu (seeded with Chennai as dev-only seed data)**. Real launch zones, pricing, and tax settings will be provisioned via the Admin Panel prior to commercial go-live.
- **Initial Live Verticals:** 
  1. Food Delivery (restaurants)
  2. Groceries / Quick Commerce (local grocery stores & dark stores)
  - *Purpose:* Validates the unified mixed-cart checkout and fulfillment model (Section 5A) under real conditions.
  - *Next Vertical:* Parcel / Courier delivery.
- **Mobility Gating:** Rides (bike-taxi, auto, cab), hire-a-driver, and the ride-job continuity features in Section 5B remain strictly behind per-state feature flags. They will be toggled on per state only after obtaining formal legal clearance from counsel. Pilot delivery partners operate two-wheelers only.
- **Multi-Language Architecture:**
  - Launch languages: **Tamil (`ta`) and English (`en`)** across Customer, Partner, and Merchant apps (Hindi `hi` scheduled next).
  - All static client copy localized via i18n bundles.
  - All dynamic catalog items (e.g., dish names, grocery descriptions) support multi-language translation via an `item_translations` database schema.

---

## 2. Section 5A: Unified Cart, Checkout & Dual Fulfillment

### 2.1 Customer & Data Model
- **Single Multi-Merchant Cart:** Customers can add items from multiple merchants across verticals (e.g., Restaurant Food + Local Grocery Store) into a single persistent cart.
- **Order Decomposition Model:**
  $$\text{checkout\_session} \longrightarrow \text{order\_group} \longrightarrow \text{sub\_orders} \longrightarrow \text{delivery\_legs}$$
  - `checkout_session`: Ephemeral quote with server-calculated prices, taxes, and fees locked for a 10-minute payment window. Holds soft inventory reservations.
  - `order_group`: Parent container representing a single customer transaction and single Razorpay payment.
  - `sub_orders`: Independent merchant-level orders. Each has its own state machine (`MERCHANT_ACCEPTED`, `PREPARING`, `READY`, etc.), independent invoice, GST calculation, merchant settlement, and partial cancellation lifecycle.
  - `delivery_legs`: Independent physical delivery assignments carrying dispatch state machines, pickup/drop coordinates, and partner compensation.

### 2.2 Dual Fulfillment Strategy (`FulfillmentStrategyEngine`)
Both fulfillment modes are core architectural requirements and must be operational before pilot launch:

1. **Mode A (Normal Separate Deliveries):**
   - Each `sub_order` gets an independent courier, independent delivery leg, separate tracking pin, and unique handover OTP.
   - Standard baseline for all single-vertical orders and mixed orders where merchants are geographically distant.

2. **Mode B (Deliver Together):**
   - Customer choice presented at checkout: *"Deliver together (1 courier, lower delivery fee)"* vs. *"Fastest (separate couriers)"*.
   - **Proximity Gating:** Offered only when both merchant pickup locations are within a configurable distance (default $\le 1.5$ km). Otherwise, UI displays Mode A with a clear explanatory notice.
   - **Just-in-Time (JIT) Dispatch:** The courier is dispatched only when the slower preparation item (typically restaurant food) is within a configurable threshold of being `READY`.
   - **Perishability Sequencing:** Pickups are strictly ordered so that cold/perishable groceries are collected last, minimizing courier transit time for temperature-sensitive items.
   - **Courier Gear & Capacity Verification:** Assigned couriers must have a verified insulated bag and meet volume/weight constraints. Couriers receive an additional multi-pickup compensation component.
   - **Dynamic Unbatching Fallback:** If one merchant experiences delays exceeding a configurable threshold, the system alerts the customer with an option to split the order into separate legs, adjusting fees automatically.
   - **Merchant Rejection:** If one merchant rejects or times out, the courier proceeds with the surviving `sub_order`, and the rejected `sub_order` is automatically refunded.
   - **Day-1 Telemetry:** Systematic tracking of estimated vs. actual prep time, courier pickup wait time, and inter-pickup transit duration.

---

## 3. Section 5B: Partner Continuity (Rapido-Style Multi-Job)

- **Single Partner App & Single Online Switch:** A partner uses one application with a unified, job-type-agnostic dispatch feed (`delivery_leg`, `parcel`, `ride`, `hire_booking`).
- **Partner Mode Switcher:** Partners can toggle between:
  1. *Deliveries only*
  2. *Rides only* (gated by state permits and vehicle compliance)
  3. *All jobs*
- **Strict Mutual Exclusion:**
  - A courier carrying food or parcel orders is strictly barred from receiving ride offers.
  - A driver engaged in a passenger trip is strictly barred from receiving delivery offers.
  - Previewing the next job is allowed only after the active pickup leg is completed.
- **Proximity Next-Job Chaining:** After completing a drop-off at location $X$, the dispatch engine prioritizes offers originating near $X$ to minimize deadhead/empty travel.
- **Safety & Regulatory Checks:** Rides require verified passenger commercial permits, vehicle fitness/insurance, background checks, in-app SOS buttons, trip sharing, and masked calling.
- **Customer Cross-Sell:** Post-delivery screen presents non-intrusive cross-vertical suggestions (e.g., book a ride, send a parcel) driven by Remote Config.

---

## 4. Real-time Tracking & Cost-Controlled Maps Pipeline

To prevent severe Google Maps and Cloud billing inflation, the real-time tracking architecture follows **Approach A**:

```
[Partner App] 
     │ (Adaptive GPS: 3-5s active, 15-30s idle)
     ▼ WebSocket
[NestJS Dispatch Service]
     ├──► Updates Redis GEO Index (Memorystore)
     ├──► Broadcasts via Socket.IO (Redis Adapter) ──► [Customer App] (Active Tracking View)
     └──► Batched Buffer ──► [PostGIS (Location History)]
```

- **Zero Location Writes to Firestore:** GPS coordinates are never mirrored to Firestore. Firestore is strictly reserved for discrete order/trip lifecycle state updates (`ORDER_ACCEPTED`, `OUT_FOR_DELIVERY`, `DELIVERED`).
- **Socket.IO Redis Adapter:** Enables stateless Cloud Run horizontal scaling across multiple container instances without losing real-time client socket sessions.
- **Google Routes API Optimization:** Routes API is invoked **only once** per delivery leg (at initial assignment and at store pickup). The encoded polyline is cached. The mobile client interpolates the courier marker along this polyline. Re-routing is invoked only if the courier deviates beyond a configurable distance threshold.
- **Adaptive Ping Frequency:**
  - 3–5 seconds during active delivery/ride legs.
  - 15–30 seconds when partner is online and idle.
  - 0 seconds when offline.
- **Dispute Persistence:** Partner location breadcrumbs are buffered and written in batch to PostGIS for audit, safety disputes, and route playback.

---

## 5. Payments, Wallet & Tax Architecture

*(Note: Legal and tax items are structured as assumptions for legal/CA verification in `docs/legal-and-tax-assumptions.md`)*.

- **Customer Wallet (Option A - Closed-Loop Credit Ledger):**
  - Used exclusively for instant order cancellation refunds (customer choice of wallet credit or original payment method), promotional discounts, and referral cashbacks.
  - **No Customer Top-Ups:** Customers cannot pre-fund or deposit cash balances into the wallet.
  - **No Cash-Outs:** Wallet balances cannot be withdrawn to external bank accounts.
  - Wallet credits can be used at checkout as split payment alongside Razorpay PG.
- **Payment Collection & Escrow:**
  - Customer payments collected upfront via Razorpay Payment Gateway.
  - Evaluation of **Razorpay Route** for split settlement to merchant virtual accounts to avoid pooling merchant funds in platform operating accounts.
  - Automated partner and merchant payouts executed via **RazorpayX** net of commissions, packaging, delivery fees, and statutory withholdings.
- **Dynamic Tax Engine:**
  - Configurable, effective-dated database rules editable via the Admin Panel.
  - **Section 9(5) Restaurant GST:** Platform liable for 5% GST without Input Tax Credit (ITC); no TCS applied.
  - **Section 52 TCS:** E-commerce operator collects 0.5% TCS on net taxable supplies for non-restaurant merchants (grocery, home-made goods) with GSTR-8 reporting.
  - **Section 194-O TDS:** 0.1% TDS withheld on gross sales to participants (5% if PAN/Aadhaar unverified), with configurable threshold exemptions.
  - **Delivery Service GST:** Contingency configuration for Section 9(5) delivery services and GST on platform/delivery fees.
  - Automatic split of CGST + SGST (intra-state) vs. IGST (inter-state) with per-sub-order tax invoices.

---

## 6. GCP Infrastructure & Cost Optimization (Dev vs. Prod)

Managed via modular, parameterized **Terraform** scripts supporting zero-cost destruction and selective deployment:

| Component | Dev / Pre-Launch Environment | Pilot Production Environment |
| :--- | :--- | :--- |
| **GCP Project** | `allgo-dev` (single-region: `asia-south1`) | `allgo-prod` (single-region: `asia-south1`) |
| **Deployment Timing** | Immediate (Phase 0) | Provisioned only when approaching launch |
| **Cloud SQL (PostgreSQL + PostGIS)** | Single-zone `db-custom-2-4096`, daily backup, private IP | High Availability (regional multi-zone failover), PITR, private IP (read replica deferred) |
| **Memorystore Redis** | Basic Tier (1 GB standalone) | Standard Tier (HA with automated failover) |
| **Cloud Run Services** | 3 services (`api`, `dispatch`, `webhooks`), `min_instances = 0` (scale-to-zero) | 3 services (`api`, `dispatch`, `webhooks`), `min_instances = 1` on `api` and `dispatch` |
| **Ingress & Networking** | Direct Cloud Run URLs with Firebase App Check | Direct Cloud Run URLs initially; Global Load Balancer + Cloud Armor deferred to Phase 9 |
| **Scheduled Shutdown** | Cloud Scheduler automated overnight shutdown for idle compute | 24x7 active |
| **Observability & Budgets** | Budget alerts at 50%, 80%, 100% of Rs [X]; Maps quota Rs [Z]; SMS quota Rs [W] | Budget alerts at 50%, 80%, 100% of Rs [Y]; Maps quota Rs [Z]; SMS quota Rs [W] |

