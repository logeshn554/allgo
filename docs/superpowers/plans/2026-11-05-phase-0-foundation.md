# Phase 0: Architecture, Infrastructure & Data Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the complete foundational architecture, monorepo repository structure, parameterized GCP Terraform infrastructure, normalized PostgreSQL + PostGIS schema and migrations, OpenAPI & WebSocket specifications, secrets inventory, and itemized monthly INR cost model for the multi-vertical delivery and mobility platform.

**Architecture:** A containerized NestJS 3-service backend (`api`, `dispatch`, `webhooks`) deployed on Cloud Run with Direct VPC Egress to Cloud SQL (PostgreSQL + PostGIS) and Memorystore Redis. Live tracking is powered by WebSocket/Socket.IO with the Redis adapter (zero location writes to Firestore), cached single-call Google Routes API, and a unified data model (`checkout_session` $\rightarrow$ `order_group` $\rightarrow$ `sub_order` $\rightarrow$ `delivery_leg`) supporting both separate (Mode A) and combined (Mode B) fulfillment. All states, zones, pricing, taxes, and vertical toggles are 100% database-driven.

**Tech Stack:** NestJS, TypeScript, PostgreSQL 15, PostGIS 3.3, Memorystore Redis 7.0, Google Cloud (Cloud Run, Cloud SQL, Pub/Sub, Cloud Tasks, Secret Manager, Cloud Storage), Terraform, Firebase Auth (Phone OTP) + App Check, Google Maps Platform (Routes, Places), Razorpay / RazorpayX, Flutter (Dart 3).

**Spec:** `delivery-super-app-prompt.md`, `docs/design-decisions.md`, `docs/legal-and-tax-assumptions.md`.

---

## Global Constraints

- **Language Support:** Tamil (`ta`) and English (`en`) supported at launch across all apps; Hindi (`hi`) next. All UI copy and dynamic merchant catalog items must support translation.
- **Geography:** Target is all of India; zero hardcoded state/city logic. Chennai is dev-only seed data in a clearly labeled script.
- **Mobility Gating:** Rides, bike-taxi, and driver-hire remain disabled by default behind per-state database feature flags until legal clearance is obtained.
- **Tracking Costs:** Zero GPS location coordinates written to Firestore. GPS flows exclusively via WebSocket $\rightarrow$ Redis GEO $\rightarrow$ Socket.IO.
- **Fulfillment Engine:** Both Mode A (separate couriers) and Mode B (deliver together) must be implemented behind a pluggable `FulfillmentStrategyEngine` interface before pilot go-live.
- **Legal Wording:** No assertions of legal or tax compliance. All payment, wallet, and tax rules must be framed as assumptions in `docs/legal-and-tax-assumptions.md` for lawyer and CA verification.
- **Environments:** Two environments (`dev` and `prod`). Prod infrastructure must not be provisioned until instructed. Terraform must support full creation and destruction from variables.

---

## Review Focus

1. **Checkout Idempotency Under Retries:** Double-click on "Pay" or network timeout during `/checkout/pay` must never create duplicate Razorpay orders or duplicate `order_group` records.
2. **Mode B Unbatching Race Condition:** In a "Deliver together" order, if Merchant A marks food `READY` but Merchant B is delayed beyond threshold, unbatching into two independent delivery legs must preserve already-assigned courier state and update the customer's bill without charging two full delivery fees.
3. **Section 5B Mutual Exclusion Invariant:** A delivery partner actively assigned to a food or grocery leg must never receive a passenger ride offer in `/partner/jobs/feed`, regardless of mode switch timing.
4. **Unlaunched Zone Geofence Bypass:** A customer attempting to create a checkout session or book a courier with pickup/drop outside active PostGIS zone boundaries must be blocked with a 422 `ZONE_NOT_SERVICEABLE` response and prompted to join the waitlist.
5. **Google Routes Deviation Flapping:** Courier GPS jitter near the deviation distance threshold must not trigger cascading recalculation calls to Google Routes API; recalculation must enforce a minimum cooldown timer (60s) and minimum displacement (100m).

---

## Tasks

### Task 1: Monorepo Structure & Core Workspace Scaffolding

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `apps/api/package.json`
- Create: `apps/dispatch/package.json`
- Create: `apps/webhooks/package.json`
- Create: `apps/admin/package.json`
- Create: `packages/common/package.json`
- Create: `packages/common/src/index.ts`
- Create: `packages/common/src/enums/vertical.enum.ts`
- Create: `packages/common/src/enums/order-status.enum.ts`
- Create: `packages/common/src/enums/fulfillment-mode.enum.ts`
- Create: `packages/common/src/i18n/languages.ts`
- Test: `tests/workspace/monorepo-structure.spec.ts`

**Interfaces:**
- Consumes: None (root task).
- Produces: Monorepo package resolution, shared TypeScript definitions (`VerticalType`, `OrderStatus`, `FulfillmentMode`, `SupportedLanguage`), and test execution pipelines.

- [ ] **Step 1: Write the failing workspace structure test**
  Write `tests/workspace/monorepo-structure.spec.ts` asserting that workspace packages (`@allgo/common`, `@allgo/api`, `@allgo/dispatch`, `@allgo/webhooks`, `@allgo/admin`) exist, have valid `package.json` manifests, and `@allgo/common` exports the required enum constants and language codes (`en`, `ta`, `hi`).

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test -- tests/workspace/monorepo-structure.spec.ts` (or equivalent runner).
  Expected: FAIL (files missing).

- [ ] **Step 3: Implement monorepo configuration and shared package**
  Create root `package.json`, `pnpm-workspace.yaml`, base `tsconfig.json`, skeleton manifests for apps, and implement `@allgo/common` exporting `VerticalType` (`FOOD`, `GROCERY`, `PARCEL`, `RIDE`, `HIRE_DRIVER`, `HOME_MADE`), `OrderStatus`, `FulfillmentMode` (`SEPARATE`, `DELIVER_TOGETHER`), and `SupportedLanguages` (`en`, `ta`, `hi`).

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test -- tests/workspace/monorepo-structure.spec.ts`.
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add package.json pnpm-workspace.yaml tsconfig.base.json apps/ packages/ tests/
  git commit -m "feat(phase-0): scaffold monorepo workspace and common domain enums"
  ```

---

### Task 2: System Architecture & Flow Specification

**Files:**
- Create: `docs/architecture/system-architecture.md`
- Create: `docs/architecture/fulfillment-engine.md`
- Create: `docs/architecture/partner-continuity.md`
- Test: `tests/docs/architecture-doc-validation.spec.ts`

**Interfaces:**
- Consumes: `docs/design-decisions.md`.
- Produces: Exhaustive architectural diagrams, lifecycle state machines, and sequence diagrams for the backend services, mobile apps, and dispatch engine.

- [ ] **Step 1: Write the failing architecture validation test**
  Write `tests/docs/architecture-doc-validation.spec.ts` verifying that `docs/architecture/system-architecture.md`, `fulfillment-engine.md`, and `partner-continuity.md` exist and contain required mermaid diagrams (`checkout_session` sequence, Mode A vs Mode B state machines, Partner mutual exclusion guard, and Real-time Socket.IO/Redis data flow).

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test -- tests/docs/architecture-doc-validation.spec.ts`.
  Expected: FAIL (documentation files not found).

- [ ] **Step 3: Author architecture specifications**
  Write detailed specifications:
  - `docs/architecture/system-architecture.md`: Cloud Run microservices layout, Direct VPC Egress, Redis GEO, Socket.IO adapter, and PostGIS batch persistence.
  - `docs/architecture/fulfillment-engine.md`: Detailed specification of `FulfillmentStrategyEngine`, covering Mode A, Mode B proximity gating ($\le 1.5$ km), JIT delayed dispatch (grocery picked up last), delay threshold unbatching, and merchant cancellation refunds.
  - `docs/architecture/partner-continuity.md`: Section 5B implementation covering unified feed, mode switcher, safety mutual exclusion, and post-delivery customer cross-sells.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test -- tests/docs/architecture-doc-validation.spec.ts`.
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add docs/architecture/ tests/docs/
  git commit -m "docs(phase-0): detail system architecture, fulfillment engine, and partner continuity"
  ```

---

### Task 3: Parameterized GCP Terraform Skeleton & IAM Plan

**Files:**
- Create: `infrastructure/terraform/modules/vpc/main.tf`
- Create: `infrastructure/terraform/modules/vpc/variables.tf`
- Create: `infrastructure/terraform/modules/cloudsql/main.tf`
- Create: `infrastructure/terraform/modules/cloudsql/variables.tf`
- Create: `infrastructure/terraform/modules/redis/main.tf`
- Create: `infrastructure/terraform/modules/redis/variables.tf`
- Create: `infrastructure/terraform/modules/cloudrun/main.tf`
- Create: `infrastructure/terraform/modules/cloudrun/variables.tf`
- Create: `infrastructure/terraform/modules/iam/main.tf`
- Create: `infrastructure/terraform/modules/monitoring/main.tf`
- Create: `infrastructure/terraform/environments/dev/main.tf`
- Create: `infrastructure/terraform/environments/dev/terraform.tfvars.example`
- Create: `infrastructure/terraform/environments/prod/main.tf`
- Create: `infrastructure/terraform/environments/prod/terraform.tfvars.example`
- Test: `tests/infrastructure/terraform-structure.spec.ts`

**Interfaces:**
- Consumes: GCP configuration decisions from `docs/design-decisions.md`.
- Produces: Ready-to-plan Terraform modules for `dev` (single-zone DB, Basic Redis, min_instances=0, scheduled shutdown) and `prod` (HA Cloud SQL + PITR, Standard Redis HA, min_instances=1 on api/dispatch).

- [ ] **Step 1: Write the failing Terraform validation test**
  Write `tests/infrastructure/terraform-structure.spec.ts` that checks:
  1. All module files exist.
  2. `dev` environment configures `min_instances = 0`, single-zone database, and Basic tier Redis.
  3. `prod` environment configures `min_instances = 1` for `api` and `dispatch`, regional HA Cloud SQL with PITR, and Standard tier Redis.
  4. Monitoring module provisions budget alerts at 50%, 80%, 100% of Rs [X] (dev) and Rs [Y] (prod).

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test -- tests/infrastructure/terraform-structure.spec.ts`.
  Expected: FAIL.

- [ ] **Step 3: Implement Terraform modules and environment configurations**
  Write Terraform files in `infrastructure/terraform/`:
  - `vpc`: VPC network, direct VPC connector/egress, private service connection for Cloud SQL and Redis in `asia-south1`.
  - `cloudsql`: PostgreSQL 15 with PostGIS extension flag, configurable HA (`availability_type`), automated backup window, and PITR.
  - `redis`: Memorystore Redis 7.0, configurable tier (`BASIC` vs `STANDARD_HA`).
  - `cloudrun`: Consolidated 3 services (`allgo-api`, `allgo-dispatch`, `allgo-webhooks`) with environment variables, Secret Manager volume/env bindings, and configurable `min_instance_count`.
  - `iam`: Dedicated least-privilege service accounts (`sa-api`, `sa-dispatch`, `sa-webhooks`, `sa-worker`).
  - `monitoring`: Cloud Billing budget alerts, Cloud Scheduler job for dev overnight shutdown, and metric thresholds for Maps and Firebase Auth quotas.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test -- tests/infrastructure/terraform-structure.spec.ts`.
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add infrastructure/terraform/ tests/infrastructure/
  git commit -m "feat(infra): add parameterized terraform modules for dev and prod environments"
  ```

---

### Task 4: Normalized PostgreSQL + PostGIS Schema & Migrations

**Files:**
- Create: `database/migrations/001_initial_schema.sql`
- Create: `database/migrations/002_postgis_indexes.sql`
- Create: `database/seeds/dev_seed_chennai.sql`
- Create: `database/schema.prisma` (or TypeORM/Kysely equivalent schema definition)
- Test: `tests/database/schema-validation.spec.ts`

**Interfaces:**
- Consumes: Domain requirements from `delivery-super-app-prompt.md` and `docs/design-decisions.md`.
- Produces: Complete SQL DDL migrations with PostGIS GiST spatial indexing, foreign key constraints, translation schema, and labeled Chennai dev seed data.

- [ ] **Step 1: Write the failing SQL schema verification test**
  Write `tests/database/schema-validation.spec.ts` to parse `001_initial_schema.sql`, `002_postgis_indexes.sql`, and `dev_seed_chennai.sql`, asserting presence of:
  - Core tables: `states`, `cities`, `zones` (with `polygon geometry(Polygon, 4326)`), `waitlist_entries`.
  - Catalog: `merchants`, `outlets`, `catalogs`, `items`, `item_translations` (`item_id`, `language_code`, `name`, `description`).
  - Section 5A orders: `checkout_sessions`, `order_groups`, `sub_orders`, `delivery_legs`, `delivery_leg_stops`, `fulfillment_modes`.
  - Section 5B partner: `partners`, `partner_modes`, `partner_jobs` (generic job type: `delivery_leg`, `parcel`, `ride`, `hire_booking`), `partner_location_history`.
  - Financials: `wallets`, `ledger_entries` (double-entry), `payments`, `refunds`, `discount_allocations`, `refund_allocations`, `payouts`.
  - Tax: `tax_rules` (effective-dated, Sec 9(5), Sec 52, Sec 194-O), `tax_invoices`.
  - Assert that `dev_seed_chennai.sql` has header: `-- DEV ENVIRONMENT ONLY - NOT FOR PRODUCTION USE`.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test -- tests/database/schema-validation.spec.ts`.
  Expected: FAIL.

- [ ] **Step 3: Implement complete PostgreSQL DDL and Chennai Dev Seed**
  Author:
  - `001_initial_schema.sql`: Full normalized DDL covering all entities, foreign keys, check constraints, and enum types.
  - `002_postgis_indexes.sql`: PostGIS spatial indexes (`GIST(polygon)`, `GIST(location)`), composite btree indexes for dispatch queues and ledger lookups.
  - `dev_seed_chennai.sql`: Explicitly labeled development seed data for Tamil Nadu (`state_code = '33'`), Chennai service zones, sample restaurants, dark stores, and catalog translations (`ta`, `en`).

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test -- tests/database/schema-validation.spec.ts`.
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add database/ tests/database/
  git commit -m "feat(database): define complete postgresql postgis schema and chennai dev seed"
  ```

---

### Task 5: OpenAPI 3.1 & WebSocket Event Specifications

**Files:**
- Create: `docs/api/openapi.yaml`
- Create: `docs/api/websocket-events.md`
- Test: `tests/api/openapi-lint.spec.ts`

**Interfaces:**
- Consumes: Section 5A, 5B, and mobile requirements.
- Produces: Strict contract definitions for client-server REST endpoints, status codes, error models, and bidirectional Socket.IO events.

- [ ] **Step 1: Write the failing OpenAPI lint test**
  Write `tests/api/openapi-lint.spec.ts` validating that `docs/api/openapi.yaml` complies with OpenAPI 3.1, contains schemas for multi-vertical checkout (`/checkout/quote`, `/checkout/pay`), partner job feed (`/partner/jobs/feed`), and partner mode switching (`/partner/mode`).

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test -- tests/api/openapi-lint.spec.ts`.
  Expected: FAIL.

- [ ] **Step 3: Implement OpenAPI 3.1 spec and WebSocket event documentation**
  Write:
  - `docs/api/openapi.yaml`: Comprehensive endpoints with request/response schemas, idempotency key headers, `Accept-Language` headers (`en`, `ta`), error payloads, and security schemes (Firebase Bearer token + rotating refresh tokens).
  - `docs/api/websocket-events.md`: Specification of real-time events over Socket.IO (namespaces `/tracking`, `/dispatch`), payload definitions for `location:ping`, `partner:location`, `order:status_updated`, `job:offer`, `job:accept`, and heartbeat/reconnect recovery.

- [x] **Step 4: Run test to verify it passes**
  Run: `npm test -- tests/api/openapi-lint.spec.ts`.
  Expected: PASS.

- [x] **Step 5: Commit**
  ```bash
  git add docs/api/ tests/api/
  git commit -m "docs(api): specify openapi 3.1 contracts and real-time websocket event schemas"
  ```

---

### Task 6: Secrets Management, Environment Variables & IAM Inventory

**Files:**
- Create: `docs/security/secrets-inventory.md`
- Create: `apps/api/.env.example`
- Create: `apps/dispatch/.env.example`
- Create: `apps/webhooks/.env.example`
- Create: `apps/admin/.env.example`
- Test: `tests/security/env-validator.spec.ts`

**Interfaces:**
- Consumes: Tech stack requirements (Razorpay, Google Maps, Firebase, Cloud SQL, Redis).
- Produces: Complete inventory of all secrets in Google Secret Manager, acquisition guides, rotation procedures, and local development environment templates.

- [x] **Step 1: Write the failing environment variable validation test**
  Write `tests/security/env-validator.spec.ts` checking that every environment variable referenced in `.env.example` files is documented in `docs/security/secrets-inventory.md` with: secret name, provider source, sensitivity classification, and rotation method. Ensure no plain-text secret keys exist.

- [x] **Step 2: Run test to verify it fails**
  Run: `npm test -- tests/security/env-validator.spec.ts`.
  Expected: FAIL.

- [x] **Step 3: Implement secrets inventory and `.env.example` files**
  Create:
  - `docs/security/secrets-inventory.md`: Complete matrix of credentials (`FIREBASE_SERVICE_ACCOUNT_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `GOOGLE_MAPS_SERVER_API_KEY`, `GOOGLE_MAPS_CLIENT_ANDROID_KEY`, `GOOGLE_MAPS_CLIENT_IOS_KEY`, `DATABASE_URL`, `REDIS_URL`, `JWT_SIGNING_KEY`), including instructions on how to acquire each from official developer consoles.
  - `.env.example` files for `apps/api`, `apps/dispatch`, `apps/webhooks`, and `apps/admin`.

- [x] **Step 4: Run test to verify it passes**
  Run: `npm test -- tests/security/env-validator.spec.ts`.
  Expected: PASS.

- [x] **Step 5: Commit**
  ```bash
  git add docs/security/ apps/*/.env.example tests/security/
  git commit -m "docs(security): publish secret manager inventory and service environment templates"
  ```

---

### Task 7: Itemized Monthly INR Cost Model & Budget Ceiling Analysis

**Files:**
- Create: `docs/cost/monthly-cost-estimate-inr.md`
- Create: `scripts/cost-calculator.ts`
- Test: `tests/cost/cost-model-validation.spec.ts`

**Interfaces:**
- Consumes: Google Cloud Mumbai (`asia-south1`) pricing, Google Maps Platform pricing, Firebase Auth pricing, and budget ceilings (`Rs [X]`, `Rs [Y]`, `Rs [Z]`, `Rs [W]`).
- Produces: Itemized INR cost model, scaling sensitivity analysis, cost spike mitigation strategies, and budget alert configurations.

- [x] **Step 1: Write the failing cost model validation test**
  Write `tests/cost/cost-model-validation.spec.ts` verifying that `docs/cost/monthly-cost-estimate-inr.md` exists, provides mathematical breakdowns for both `dev` and `prod`, breaks out Google Maps and Firebase Auth costs under varying traffic assumptions, and explicitly flags cost components capable of breaching budget ceilings Rs [X], [Y], [Z], and [W].

- [x] **Step 2: Run test to verify it fails**
  Run: `npm test -- tests/cost/cost-model-validation.spec.ts`.
  Expected: FAIL.

- [x] **Step 3: Implement cost calculator script and detailed INR model document**
  Author:
  - `docs/cost/monthly-cost-estimate-inr.md`:
    - Detailed line-item GCP bill for `dev` (with overnight shutdown savings) and `prod pilot`.
    - Real-time Google Maps usage calculation: single Routes API call per leg vs continuous recalculation, showing the dramatic cost divergence.
    - Firebase Auth Phone OTP pricing (free tier vs pay-per-verification in India, plus SMS pumping defense via App Check).
    - Threshold alert triggers at 50%, 80%, and 100% of the user's budget ceilings Rs [X], [Y], [Z], and [W].
  - `scripts/cost-calculator.ts`: CLI utility to project costs given partner count, active order volume, and daily operating hours.

- [x] **Step 4: Run test to verify it passes**
  Run: `npm test -- tests/cost/cost-model-validation.spec.ts`.
  Expected: PASS.

- [x] **Step 5: Commit**
  ```bash
  git add docs/cost/ scripts/cost-calculator.ts tests/cost/
  git commit -m "docs(cost): publish itemized inr monthly cost model and budget ceiling sensitivity analysis"
  ```

---

## Plan Self-Review Checklist

- [x] **Spec coverage:** Skimmed all requirements in `delivery-super-app-prompt.md` and `docs/design-decisions.md`. All Phase 0 deliverables (architecture doc, repo structure, GCP/Terraform skeleton, schema/migrations, OpenAPI spec, secrets plan, INR cost model, legal/tax assumptions) are covered by explicit tasks.
- [x] **Step scan:** Every step contains a verifiable action, failing test command, implementation target, passing verification command, and commit message.
- [x] **Type consistency:** Domain enums (`VerticalType`, `OrderStatus`, `FulfillmentMode`, `SupportedLanguages`) are defined in Task 1 and consistently referenced across Task 2, Task 4 (schema), and Task 5 (OpenAPI).
- [x] **Review Focus:** 5 critical operational failure modes (idempotency, unbatching race, mutual exclusion, zone geofence, and route deviation flapping) are explicitly detailed in the Review Focus section.
- [x] **Proportion:** The plan is focused directly on Phase 0 foundational deliverables without generating premature app feature code.

