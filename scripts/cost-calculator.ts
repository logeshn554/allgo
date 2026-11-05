#!/usr/bin/env node

/**
 * AllGo Multi-Vertical On-Demand Platform
 * Dynamic Monthly INR Cost Projection & Operational Estimates Calculator
 *
 * Revision: 5.0.0 (Memorystore asia-south1 M1/M2 Verified Rates & Multi-Vertical Maps Audit)
 *
 * Usage:
 *   node --experimental-transform-types scripts/cost-calculator.ts
 *   node --experimental-transform-types scripts/cost-calculator.ts --json
 *   node --experimental-transform-types scripts/cost-calculator.ts --ordersPerDay=2500 --activeCouriers=100 --operatingHours=14 --json
 *   node --experimental-transform-types scripts/cost-calculator.ts --usdInrRate=94.40 --ceilingDev=10000 --ceilingProd=80000 --json
 */

export interface CalculatorInputs {
  ordersPerDay: number;
  activeCouriers: number;
  operatingHours: number;
  exchangeRateUsdInr: number;
  ceilingDev?: number;
  ceilingProd?: number;
  ceilingMaps?: number;
  ceilingSms?: number;
  formatJson: boolean;
}

export interface BudgetCeilingsConfig {
  devCeilingInr?: number;
  prodCeilingInr?: number;
  mapsCeilingInr?: number;
  smsCeilingInr?: number;
  devCeilingConfigured: boolean;
  prodCeilingConfigured: boolean;
  mapsCeilingConfigured: boolean;
  smsCeilingConfigured: boolean;
}

export interface CeilingEvaluation {
  status: 'NOT_SET' | 'SAFE' | 'WARNING_50' | 'CRITICAL_80' | 'BREACHED_100';
  percentage?: number;
  headroomInr?: number;
}

export interface CostProjection {
  inputs: CalculatorInputs;
  exchangeRateUsdInr: number;
  devGcpMonthlyInr: number;
  prodGcpMonthlyInr: number;
  mapsMonthlyInr: number;
  mapsNaiveMonthlyInr: number;
  mapsDivergenceRatio: number;
  smsMonthlyInr: number;
  smsDirectFirebaseMonthlyInr: number;
  totalPilotMonthlyInr: number;
  combinedDevAndProdMonthlyInr: number;
  ceilings: BudgetCeilingsConfig;
  evaluation?: {
    dev: CeilingEvaluation;
    prod: CeilingEvaluation;
    maps: CeilingEvaluation;
    sms: CeilingEvaluation;
  };
}

function parseArgs(args: string[]): CalculatorInputs {
  const inputs: CalculatorInputs = {
    ordersPerDay: 1000,
    activeCouriers: 50,
    operatingHours: 12,
    exchangeRateUsdInr: 94.40, // Configurable planning input [UNVERIFIED: Planning estimate input]
    formatJson: false,
  };

  for (const arg of args) {
    if (arg === '--json') {
      inputs.formatJson = true;
    } else if (arg.startsWith('--ordersPerDay=')) {
      inputs.ordersPerDay = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--activeCouriers=')) {
      inputs.activeCouriers = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--operatingHours=')) {
      inputs.operatingHours = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--usdInrRate=')) {
      inputs.exchangeRateUsdInr = parseFloat(arg.split('=')[1]);
    } else if (arg.startsWith('--ceilingDev=')) {
      inputs.ceilingDev = parseFloat(arg.split('=')[1]);
    } else if (arg.startsWith('--ceilingProd=')) {
      inputs.ceilingProd = parseFloat(arg.split('=')[1]);
    } else if (arg.startsWith('--ceilingMaps=')) {
      inputs.ceilingMaps = parseFloat(arg.split('=')[1]);
    } else if (arg.startsWith('--ceilingSms=')) {
      inputs.ceilingSms = parseFloat(arg.split('=')[1]);
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return inputs;
}

function printHelp(): void {
  console.log(`
AllGo Platform Monthly Cost Calculator CLI (Revision 5.0.0)

Usage:
  node --experimental-transform-types scripts/cost-calculator.ts [options]

Options:
  --ordersPerDay=<n>     Average completed transactions per day (default: 1000)
  --activeCouriers=<n>   Average active delivery couriers/drivers per day (default: 50)
  --operatingHours=<n>   Operating hours per day (default: 12)
  --usdInrRate=<n>       USD to INR exchange rate [UNVERIFIED: Planning estimate input] (default: 94.40)
  --ceilingDev=<n>       Optional budget ceiling for Dev GCP (default: unset)
  --ceilingProd=<n>      Optional budget ceiling for Prod Pilot GCP (default: unset)
  --ceilingMaps=<n>      Optional budget ceiling for Google Maps (default: unset)
  --ceilingSms=<n>       Optional budget ceiling for SMS (default: unset)
  --json                 Output machine-readable JSON format
  --help, -h             Show this help message
`);
}

function evaluateCeiling(cost: number, ceiling?: number): CeilingEvaluation {
  if (ceiling === undefined || isNaN(ceiling) || ceiling <= 0) {
    return { status: 'NOT_SET' };
  }
  const percentage = Math.round((cost / ceiling) * 100);
  const headroomInr = Math.round(ceiling - cost);
  if (percentage >= 100) return { status: 'BREACHED_100', percentage, headroomInr };
  if (percentage >= 80) return { status: 'CRITICAL_80', percentage, headroomInr };
  if (percentage >= 50) return { status: 'WARNING_50', percentage, headroomInr };
  return { status: 'SAFE', percentage, headroomInr };
}

export function calculateMonthlyCosts(inputs: CalculatorInputs): CostProjection {
  const { ordersPerDay, activeCouriers, operatingHours, exchangeRateUsdInr } = inputs;

  // 1. Optional Ceilings Configuration (Empty by default)
  const ceilings: BudgetCeilingsConfig = {
    devCeilingInr: inputs.ceilingDev,
    prodCeilingInr: inputs.ceilingProd,
    mapsCeilingInr: inputs.ceilingMaps,
    smsCeilingInr: inputs.ceilingSms,
    devCeilingConfigured: inputs.ceilingDev !== undefined && inputs.ceilingDev > 0,
    prodCeilingConfigured: inputs.ceilingProd !== undefined && inputs.ceilingProd > 0,
    mapsCeilingConfigured: inputs.ceilingMaps !== undefined && inputs.ceilingMaps > 0,
    smsCeilingConfigured: inputs.ceilingSms !== undefined && inputs.ceilingSms > 0,
  };

  // 2. Dev Environment GCP Cost (with 12h/day overnight scheduler shutdown)
  // Cloud SQL db-custom-1-3840 (360 hrs compute @ $0.07638/hr = $27.50 + $1.70 SSD + $0.80 backup) = $30.00
  // Memorystore Redis Basic M1 1GB (730 hrs @ $0.0490/hr in asia-south1 Mumbai) = $35.77
  // Direct VPC Egress: $0.00 fixed infrastructure fee (zero VM connectors)
  // Cross-zone egress (~20 GB @ $0.01/GiB) = $0.20
  // Cloud Storage (20 GB @ $0.023/GB) = $0.46
  // Secret Manager (15 active versions @ $0.06/version) = $0.90
  const devCloudSqlInr = Math.round(27.50 * exchangeRateUsdInr) + Math.round(1.70 * exchangeRateUsdInr) + Math.round(0.80 * exchangeRateUsdInr); // 2596 + 160 + 76 = 2832
  const devRedisInr = Math.round(35.77 * exchangeRateUsdInr); // 3377
  const devNetworkInr = Math.round(0.20 * exchangeRateUsdInr); // 19
  const devStorageInr = Math.round(0.46 * exchangeRateUsdInr); // 43
  const devSecretsInr = Math.round(0.90 * exchangeRateUsdInr); // 85
  const devGcpMonthlyInr = devCloudSqlInr + devRedisInr + devNetworkInr + devStorageInr + devSecretsInr; // ₹6,356

  // 3. Prod Pilot Environment GCP Cost (24x7 HA Cloud SQL + Standard M2 HA Redis + Direct VPC Egress + min_instances=1)
  // Cloud SQL db-custom-2-7680 HA (730 hrs compute @ $0.31885/hr = $232.76 + $6.80 HA SSD + $2.80 PITR) = $242.36
  const prodSqlComputeInr = Math.round(232.76 * exchangeRateUsdInr); // ₹21,973
  const prodSqlStorageInr = Math.round(6.80 * exchangeRateUsdInr);   // ₹642
  const prodSqlBackupsInr = Math.round(2.80 * exchangeRateUsdInr);   // ₹264

  // Memorystore Redis Standard Tier M2 HA 5GB (730 hrs * 5GB * $0.0540/GB-hr in asia-south1 Mumbai) = $197.10
  const prodRedisInr = Math.round(197.10 * exchangeRateUsdInr);      // ₹18,606

  // Cloud Run baseline: api ($20.00) + dispatch ($15.80) + webhooks ($0.80) = $36.60
  // Dynamic scale component for order volume above 1,000 baseline
  const dynamicComputeUsd = Math.max(0, (ordersPerDay - 1000) * 30 * 0.002);
  const prodCloudRunApiInr = Math.round((20.00 + dynamicComputeUsd * 0.6) * exchangeRateUsdInr);     // ₹1,888 baseline
  const prodCloudRunDispatchInr = Math.round((15.80 + dynamicComputeUsd * 0.4) * exchangeRateUsdInr);// ₹1,492 baseline
  const prodCloudRunWebhooksInr = Math.round(0.80 * exchangeRateUsdInr);                             // ₹76

  // Direct VPC Egress ($0.00 setup fee; $1.00 cross-zone network egress for ~100 GB)
  const prodNetworkInr = Math.round(1.00 * exchangeRateUsdInr);       // ₹94

  // Cloud Storage & Secret Manager
  const prodStorageInr = Math.round(4.80 * exchangeRateUsdInr);       // ₹453
  const prodSecretsInr = Math.round(2.70 * exchangeRateUsdInr);       // ₹255

  // Observability & Operational Buffer
  const prodLoggingInr = Math.round(25.00 * exchangeRateUsdInr);      // ₹2,360
  const prodMonitoringInr = Math.round(10.00 * exchangeRateUsdInr);   // ₹944
  const prodBufferInr = Math.round(40.00 * exchangeRateUsdInr);       // ₹3,776

  const prodGcpMonthlyInr = prodSqlComputeInr + prodSqlStorageInr + prodSqlBackupsInr +
    prodRedisInr + prodCloudRunApiInr + prodCloudRunDispatchInr + prodCloudRunWebhooksInr +
    prodNetworkInr + prodStorageInr + prodSecretsInr + prodLoggingInr + prodMonitoringInr + prodBufferInr; // ₹52,823 baseline

  // 4. Google Maps Cost Analysis (Modernized March 2025 Per-SKU India Pricing)
  // Multi-vertical distribution: 80% Delivery (2.1 calls), 10% Parcel (2.1 calls), 10% Mobility (3.3 calls)
  // Blended average routes calls per transaction: (0.8 * 2.1) + (0.1 * 2.1) + (0.1 * 3.3) = 1.68 + 0.21 + 0.33 = 2.22 calls
  const deliveryOrders = ordersPerDay * 0.8;
  const parcelOrders = ordersPerDay * 0.1;
  const mobilityOrders = ordersPerDay * 0.1;

  const monthlyDeliveryCalls = deliveryOrders * 2.1 * 30; // 50,400 calls
  const monthlyParcelCalls = parcelOrders * 2.1 * 30;     // 6,300 calls
  const monthlyMobilityCalls = mobilityOrders * 3.3 * 30; // 9,900 calls
  const monthlyRoutesCalls = Math.round(monthlyDeliveryCalls + monthlyParcelCalls + monthlyMobilityCalls); // 66,600 calls
  
  const monthlyGeocodingCalls = Math.round(ordersPerDay * 0.33 * 30); // ~10,000 un-cached addresses
  const monthlyPlacesCalls = Math.round(ordersPerDay * 0.50 * 30);   // ~15,000 un-cached checkout searches

  const billableRoutesCalls = Math.max(0, monthlyRoutesCalls - 70000);
  const billableGeocodingCalls = Math.max(0, monthlyGeocodingCalls - 70000);
  const billablePlacesCalls = Math.max(0, monthlyPlacesCalls - 70000);

  // Localized India pricing rates: ~₹125/1k for Routes & Geocoding; ~₹70/1k for Places Autocomplete
  const routesBillableInr = (billableRoutesCalls / 1000) * 125;
  const geocodingBillableInr = (billableGeocodingCalls / 1000) * 125;
  const placesBillableInr = (billablePlacesCalls / 1000) * 70;
  const mapsMonthlyInr = Math.round(routesBillableInr + geocodingBillableInr + placesBillableInr); // ₹0 under 70k free cap

  // Naive Continuous Polling Anti-Pattern Comparison (5s interval across active couriers):
  const secondsPerDay = operatingHours * 3600;
  const pollingCallsPerCourierDay = secondsPerDay / 5;
  const monthlyNaiveCalls = activeCouriers * pollingCallsPerCourierDay * 30;
  const billableNaiveCalls = Math.max(0, monthlyNaiveCalls - 70000);
  const mapsNaiveMonthlyInr = Math.round((billableNaiveCalls / 1000) * 125); // ₹16,11,250 at 50 couriers, 12h

  // Approach A gross value in India before free allowance
  const approachAGrossInr = Math.round(
    (monthlyRoutesCalls / 1000) * 125 +
    (monthlyGeocodingCalls / 1000) * 125 +
    (monthlyPlacesCalls / 1000) * 70
  );
  const mapsDivergenceRatio = Math.round(mapsNaiveMonthlyInr / Math.max(1, approachAGrossInr)); // ~168x gross divergence

  // 5. SMS / OTP Authentication Cost (Approach 2 DLT Primary vs Approach 1 Direct Firebase)
  const monthlyOtps = Math.round(ordersPerDay * 1.1 * 30); // ~33,000 OTPs at 1,000 transactions/day

  // Approach 2: Domestic Indian DLT Gateway + Firebase Custom Token (~₹0.25/SMS)
  const smsMonthlyInr = Math.round(monthlyOtps * 0.25); // ₹8,250 [UNVERIFIED: Planning assumption]

  // Approach 1: Direct Firebase Phone Auth / Identity Platform ($0.07 USD / ~₹6.61 INR per SMS after 300 free/mo)
  const firebaseFreeMonthly = 300; // 10 SMS/day globally
  const firebaseBillableOtps = Math.max(0, monthlyOtps - firebaseFreeMonthly);
  const smsDirectFirebaseMonthlyInr = Math.round((firebaseBillableOtps * 0.07) * exchangeRateUsdInr); // ₹2,16,082

  // Total Production Pilot Monthly (Prod GCP + Maps Approach A + DLT SMS)
  const totalPilotMonthlyInr = prodGcpMonthlyInr + mapsMonthlyInr + smsMonthlyInr; // ₹61,073

  // Combined Spend (Only if Dev and Prod Pilot environments run simultaneously)
  const combinedDevAndProdMonthlyInr = totalPilotMonthlyInr + devGcpMonthlyInr; // ₹67,429

  const anyCeilingsConfigured = (
    ceilings.devCeilingConfigured ||
    ceilings.prodCeilingConfigured ||
    ceilings.mapsCeilingConfigured ||
    ceilings.smsCeilingConfigured
  );

  const evaluation = anyCeilingsConfigured ? {
    dev: evaluateCeiling(devGcpMonthlyInr, inputs.ceilingDev),
    prod: evaluateCeiling(prodGcpMonthlyInr, inputs.ceilingProd),
    maps: evaluateCeiling(mapsMonthlyInr, inputs.ceilingMaps),
    sms: evaluateCeiling(smsMonthlyInr, inputs.ceilingSms),
  } : undefined;

  return {
    inputs,
    exchangeRateUsdInr,
    devGcpMonthlyInr,
    prodGcpMonthlyInr,
    mapsMonthlyInr,
    mapsNaiveMonthlyInr,
    mapsDivergenceRatio,
    smsMonthlyInr,
    smsDirectFirebaseMonthlyInr,
    totalPilotMonthlyInr,
    combinedDevAndProdMonthlyInr,
    ceilings,
    evaluation,
  };
}

function formatInr(val: number): string {
  return '₹' + val.toLocaleString('en-IN');
}

function main(): void {
  const args = process.argv.slice(2);
  const inputs = parseArgs(args);
  const proj = calculateMonthlyCosts(inputs);

  if (inputs.formatJson) {
    console.log(JSON.stringify(proj, null, 2));
    return;
  }

  console.log(`
================================================================================
             AllGo Platform Monthly Operational Cost Estimates                  
================================================================================
Operational Assumptions:
  - Transactions / Day:    ${inputs.ordersPerDay.toLocaleString()} completed transactions
  - Active Couriers / Day: ${inputs.activeCouriers} couriers & drivers
  - Operating Hours / Day: ${inputs.operatingHours} hours/day
  - USD/INR Exchange Rate: ₹${inputs.exchangeRateUsdInr.toFixed(2)} per USD [UNVERIFIED: Planning estimate input; configurable via --usdInrRate]

--------------------------------------------------------------------------------
Estimated Monthly Spend (Google Cloud Mumbai asia-south1):
--------------------------------------------------------------------------------
1. Dev Environment GCP (Separate): ${formatInr(proj.devGcpMonthlyInr)} / mo
   • Cloud SQL & Redis M1:     NO Free Tier (Redis Basic M1 @ $0.049/GiB-hr = ₹3,377)
   • Direct VPC Egress:        $0 Infrastructure Fee (native VPC routing)
   • Cloud Run & Pub/Sub:      Covered by Permanent Free Tier (<2M req, <10 GiB)
   • Scheduled Shutdown:       Overnight 12h/day off saves ~50% compute
   • Ceiling Status:           ${proj.ceilings.devCeilingConfigured ? formatInr(proj.ceilings.devCeilingInr!) : 'Not configured (estimates only)'}

2. Prod Pilot GCP Infra:       ${formatInr(proj.prodGcpMonthlyInr)} / mo
   • Cloud SQL & Redis M2:     NO Free Tier (Redis Standard M2 HA @ $0.054/GiB-hr = ₹18,606)
   • Direct VPC Egress:        $0 Infrastructure Fee ($1.00 cross-zone network egress)
   • Cloud Run:                Idle memory for min_instances=1 billable
   • Ceiling Status:           ${proj.ceilings.prodCeilingConfigured ? formatInr(proj.ceilings.prodCeilingInr!) : 'Not configured (estimates only)'}

3. Google Maps Platform:       ${formatInr(proj.mapsMonthlyInr)} / mo
   • Approach A (Optimized):   ${formatInr(proj.mapsMonthlyInr)} / mo (66,600 multi-vertical calls within 70k free cap)
   • Naive Continuous Polling: ${formatInr(proj.mapsNaiveMonthlyInr)} / mo (12.96M calls)
   • Gross Cost Divergence:    ${proj.mapsDivergenceRatio}x higher cost under naive polling!
   • Ceiling Status:           ${proj.ceilings.mapsCeilingConfigured ? formatInr(proj.ceilings.mapsCeilingInr!) : 'Not configured (estimates only)'}

4. SMS / OTP Authentication:   ${formatInr(proj.smsMonthlyInr)} / mo
   • Approach 2 (DLT Gateway): ${formatInr(proj.smsMonthlyInr)} / mo (~33,000 OTPs @ ₹0.25 DLT rate) [UNVERIFIED]
   • Header:                   [ILLUSTRATIVE / UNAPPROVED: ALGOIN] (Formal DLT registration required)
   • Approach 1 (Direct FB):   ${formatInr(proj.smsDirectFirebaseMonthlyInr)} / mo ($0.07/SMS Identity Platform tariff)
   • Cost Difference:          Direct Firebase is ~26x more expensive than DLT Gateway!
   • Ceiling Status:           ${proj.ceilings.smsCeilingConfigured ? formatInr(proj.ceilings.smsCeilingInr!) : 'Not configured (estimates only)'}

--------------------------------------------------------------------------------
Production Pilot Monthly Total (Prod GCP + Maps + DLT SMS): ${formatInr(proj.totalPilotMonthlyInr)} / mo
Combined Monthly Spend (If Dev and Prod Pilot run simultaneously): ${formatInr(proj.combinedDevAndProdMonthlyInr)} / mo
Budget Ceilings Governance:    Optional config variables (empty by default; owner to set)
================================================================================
`);
}

main();
