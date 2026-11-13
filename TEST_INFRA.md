# E2E Test Infra: AllGo Architecture Reorganization & Modularization

## Test Philosophy
- **Opaque-box, requirement-driven**: Tests verify compliance with `ORIGINAL_REQUEST.md` (R1: Directory Structure Conventions, R2: File Modularity & LOC <= 300 Limits, R3: Functionality & Build Integrity) and `PROJECT.md` without tight coupling to volatile internal private identifiers.
- **Methodology**: Category-Partition (Tier 1) + Boundary Value Analysis (Tier 2) + Pairwise Combinatorial Testing (Tier 3) + Real-World Workload Scenarios (Tier 4).
- **Execution Environment**: Node.js native test runner (`node --experimental-transform-types --test tests/e2e/reorg/*.spec.ts`). Zero external framework overhead (no Vitest/Jest required; runs in Node 24 directly with native type-stripping).
- **Pass/Fail Semantics**: Standard Node.js `node:test` exit codes (exit 0 = success, non-zero = failure).
- **Deterministic & Zero-Cost**: 100% deterministic static and integration verification; zero reliance on paid external APIs or unseeded live networks.

---

## Feature Inventory
Every feature from the Master `PROJECT.md § Feature Inventory` is mapped to verification tiers:

| # | Feature | Target Scope | Source Requirement | Tier 1 (Category-Partition) | Tier 2 (BVA LOC <= 300) | Tier 3 (Pairwise Integration) | Tier 4 (Workload Scenario) |
|---|---------|--------------|-------------------|:--------------------------:|:-----------------------:|:----------------------------:|:--------------------------:|
| 1 | `mobile_shared` API Client Decomposition | `packages/mobile_shared` | R1, R2, R3 | 5 cases | 5 cases | ✓ | Scenario 2 |
| 2 | `mobile_shared` Models & Structure Reorg | `packages/mobile_shared` | R1, R2, R3 | 5 cases | 5 cases | ✓ | Scenario 2 |
| 3 | `customer_mobile` Home & Outlets Modularization | `apps/customer_mobile` | R1, R2, R3 | 5 cases | 5 cases | ✓ | Scenario 2 |
| 4 | `customer_mobile` Mobility & Parcels Modularization | `apps/customer_mobile` | R1, R2, R3 | 5 cases | 5 cases | ✓ | Scenario 2 |
| 5 | `customer_mobile` Checkout & Orders Modularization | `apps/customer_mobile` | R1, R2, R3 | 5 cases | 5 cases | ✓ | Scenario 2 |
| 6 | `customer_mobile` Directory Structure R1 Migration | `apps/customer_mobile` | R1, R3 | 5 cases | 5 cases | ✓ | Scenario 2 |
| 7 | `partner_mobile` Home Shell & Registration Decomposition | `apps/partner_mobile` | R1, R2, R3 | 5 cases | 5 cases | ✓ | Scenario 3 |
| 8 | `merchant_mobile` Dashboard Shell Decomposition | `apps/merchant_mobile` | R1, R2, R3 | 5 cases | 5 cases | ✓ | Scenario 4 |
| 9 | `merchant_mobile` Operating Hours & Registration Decomposition | `apps/merchant_mobile` | R1, R2, R3 | 5 cases | 5 cases | ✓ | Scenario 4 |
| 10 | Partner & Merchant R1 Directory Migration | `partner_mobile` & `merchant_mobile` | R1, R3 | 5 cases | 5 cases | ✓ | Scenario 3, 4 |
| 11 | `admin` API Client & State Modularization | `apps/admin` | R1, R2, R3 | 5 cases | 5 cases | ✓ | Scenario 5 |
| 12 | `admin` Heavy Pages Decomposition | `apps/admin` | R1, R2, R3 | 5 cases | 5 cases | ✓ | Scenario 5 |
| 13 | `api` Merchant & Catalog Services Decomposition | `apps/api` | R1, R2, R3 | 5 cases | 5 cases | ✓ | Scenario 6, 7 |
| 14 | `api` Parcels & Orders Services Decomposition | `apps/api` | R1, R2, R3 | 5 cases | 5 cases | ✓ | Scenario 6, 7 |
| 15 | `api` Mobility, Zones & Finance Decomposition | `apps/api` | R1, R2, R3 | 5 cases | 5 cases | ✓ | Scenario 6, 7 |
| 16 | `api` ESM NodeNext Extension Compliance | `apps/api` | R3 | 5 cases | 5 cases | ✓ | Scenario 7 |
| 17 | Comprehensive Monorepo Verification & Test Suites | All 6 Targets | R1, R2, R3 | 5 cases | 5 cases | ✓ | Scenario 1, 8 |

---

## Test Architecture

### Directory Layout
The E2E test suites are authored in TypeScript and placed under `tests/e2e/reorg/`:
```
tests/e2e/reorg/
├── reorg-test-helpers.ts              # Shared helpers (LOC counters, import parsers, artifact filters)
├── tier1-feature-coverage.spec.ts     # Category-Partition tests across all 17 features (>= 85 test cases)
├── tier2-boundary-limits.spec.ts      # Boundary Value Analysis: strict LOC <= 300, 0 LOC, whitespace (>= 85 test cases)
├── tier3-cross-combinations.spec.ts   # Pairwise combinatorial testing: imports, isolation, bridges (>= 17 test cases)
└── tier4-workload-scenarios.spec.ts   # Real-world workload execution: specs, builds, universal audit (>= 8 test cases)
```

### Test Runner Invocation
All suites execute natively using Node.js v24.14.1 with built-in type stripping:
- **Full Suite**:
  ```powershell
  node --experimental-transform-types --test tests/e2e/reorg/*.spec.ts
  ```
- **Tier 1 Only**:
  ```powershell
  node --experimental-transform-types --test tests/e2e/reorg/tier1-feature-coverage.spec.ts
  ```
- **Tier 2 Only**:
  ```powershell
  node --experimental-transform-types --test tests/e2e/reorg/tier2-boundary-limits.spec.ts
  ```
- **Tier 3 Only**:
  ```powershell
  node --experimental-transform-types --test tests/e2e/reorg/tier3-cross-combinations.spec.ts
  ```
- **Tier 4 Only**:
  ```powershell
  node --experimental-transform-types --test tests/e2e/reorg/tier4-workload-scenarios.spec.ts
  ```

---

## Real-World Workload Scenarios (Tier 4)
| # | Scenario | Features Exercised | Target Suites / Verification Command | Expected Outcome |
|---|----------|--------------------|--------------------------------------|------------------|
| 1 | Monorepo Structure & Scaffolding | F17, R1 | `node --experimental-transform-types --test tests/workspace/monorepo-structure.spec.ts` | 12 tests pass, exit 0 |
| 2 | Mobile Architecture & Customer App | F1, F2, F3, F4, F5, F6 | `node --experimental-transform-types --test tests/mobile/mobile-architecture.spec.ts` | 18 tests pass, exit 0 |
| 3 | Partner Mobile Onboarding & Lifecycle | F7, F10 | `node --experimental-transform-types --test tests/mobile/partner-mobile.spec.ts` | 3 tests pass, exit 0 |
| 4 | Merchant Mobile Dashboard & Swiggy/Zomato Flow | F8, F9, F10 | `node --experimental-transform-types --test tests/mobile/merchant-mobile.spec.ts` | 21 tests pass, exit 0 |
| 5 | Admin Web Console Foundation & Security | F11, F12 | `node --experimental-transform-types --test tests/admin/admin-frontend.spec.ts` | 16 tests pass, exit 0 |
| 6 | Backend Health & Infrastructure Resilience | F13, F14, F15 | `node --experimental-transform-types --test tests/backend/health-check.spec.ts` | 1 test pass, exit 0 |
| 7 | Backend NestJS TypeScript Compilation | F16, R3 | `cd apps/api; npm run build` (`tsc -p tsconfig.json`) | 0 compilation errors, exit 0 |
| 8 | Monorepo-Wide Strict LOC Audit | F17, R2 | Universal file audit over all 6 targets | 0 files > 300 LOC, exit 0 |

---

## Coverage Thresholds
| Tier | Description | Minimum Target | Target Test Suite File |
|------|-------------|:--------------:|------------------------|
| **Tier 1** | Feature Coverage (Category-Partition across `pages/`, `components/`, `data/`) | ≥ 85 test cases | `tests/e2e/reorg/tier1-feature-coverage.spec.ts` |
| **Tier 2** | Boundary Value Analysis (LOC <= 300, 0 LOC, whitespace, single-job per file) | ≥ 85 test cases | `tests/e2e/reorg/tier2-boundary-limits.spec.ts` |
| **Tier 3** | Cross-Feature Combinations (Pairwise matrix, app isolation, re-export bridges) | ≥ 17 test cases | `tests/e2e/reorg/tier3-cross-combinations.spec.ts` |
| **Tier 4** | Real-World Workload Scenarios (Integration test suites, builds, universal audit) | ≥ 8 test cases | `tests/e2e/reorg/tier4-workload-scenarios.spec.ts` |
| **Total** | **Comprehensive E2E Suite Target** | **≥ 195 test cases** | Full suite execution |
