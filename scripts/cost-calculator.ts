#!/usr/bin/env node

/**
 * AllGo Multi-Vertical On-Demand Platform
 * Dynamic Monthly INR Cost Projection & Operational Estimates Calculator
 *
 * Revision: 4.0.0 (Modernized March 2025 Pricing Alignment)
 *
 * Usage:
 *   node --experimental-transform-types scripts/cost-calculator.ts
 *   node --experimental-transform-types scripts/cost-calculator.ts --json
 *   node --experimental-transform-types scripts/cost-calculator.ts --ordersPerDay=2500 --activeCouriers=100 --operatingHours=14 --json
 *   node --experimental-transform-types scripts/cost-calculator.ts --ceilingDev=10000 --ceilingProd=80000 --json
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
    exchangeRateUsdInr: 94.40, // November 2026 FBIL / RBI baseline & Google Finance
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
AllGo Platform Monthly Cost Calculator CLI (Revision 4.0.0)

Usage:
  node --experimental-transform-types scripts/cost-calculator.ts [options]

Options:
  --ordersPerDay=<n>     Average completed orders per day (default: 1000)
  --activeCouriers=<n>   Average active delivery couriers per day (default: 50)
  --operatingHours=<n>   Operating hours per day (default: 12)
  --usdInrRate=<n>       USD to INR exchange rate (default: 94.40)
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
  // Cloud SQL db-custom-1-3840 (360 hrs compute @ $0.0764/hr = $27.50 + $1.70 SSD + $0.80 backup) = $30.00
  // Memorystore Redis Basic 1GB (730 hrs @ $0.024/hr in asia-south1) = $17.52
  // Direct VPC Egress: $0.00 fixed infrastructure fee (zero VM connectors)
  // Cross-zone egress (~20 GB @ $0.01/GiB) = $0.20
  // Cloud Storage (20 GB @ $0.023/GB) = $0.46
  // Secret Manager (15 active versions @ $0.06/version) = $0.90
  const devCloudSqlInr = Math.round(27.50 * exchangeRateUsdInr) + Math.round(1.70 * exchangeRateUsdInr) + Math.round(0.80 * exchangeRateUsdInr); // 2596 + 160 + 76 = 2832
  const devRedisInr = Math.round(17.52 * exchangeRateUsdInr); // 1654
  const devNetworkInr = Math.round(0.20 * exchangeRateUsdInr); // 19
  const devStorageInr = Math.round(0.46 * exchangeRateUsdInr); // 43
  const devSecretsInr = Math.round(0.90 * exchangeRateUsdInr); // 85
  const devGcpMonthlyInr = devCloudSqlInr + devRedisInr + devNetworkInr + devStorageInr + devSecretsInr; // ₹4,633

  // 3. Prod Pilot Environment GCP Cost (24x7 HA Cloud SQL + Standard HA Redis + Direct VPC Egress + min_instances=1)
  // Cloud SQL db-custom-2-7680 HA (730 hrs compute @ $0.3188/hr = $232.76 + $6.80 HA SSD + $2.80 PITR) = $242.36
  const prodSqlComputeInr = Math.round(232.76 * exchangeRateUsdInr); // ₹21,973
  const prodSqlStorageInr = Math.round(6.80 * exchangeRateUsdInr);   // ₹642
  const prodSqlBackupsInr = Math.round(2.80 * exchangeRateUsdInr);   // ₹264

  // Memorystore Redis Standard Tier HA 5GB (730 hrs * 5GB * $0.048/GB-hr in asia-south1) = $175.20
  const prodRedisInr = Math.round(175.20 * exchangeRateUsdInr);      // ₹16,539

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
    prodNetworkInr + prodStorageInr + prodSecretsInr + prodLoggingInr + prodMonitoringInr + prodBufferInr; // ₹50,756 baseline

  // 4. Google Maps Cost Analysis (Modernized March 2025 Per-SKU India Pricing)
  // Per-SKU Free Monthly Allowance in India:
  // - ComputeRoutes Essentials: 70,000 free calls / month
  // - Geocoding API: 70,000 free calls / month
  // - Places Autocomplete: 70,000 free calls / month
  // - Mobile Maps SDK (Android/iOS): Unlimited free map loads
  const routesCallsPerOrder = 2.1; // 2 legs (pickup + dropoff) + 0.1 re-route trigger (100m displacement & 60s cooldown)
  const monthlyRoutesCalls = Math.round(ordersPerDay * routesCallsPerOrder * 30);
  const monthlyGeocodingCalls = Math.round(ordersPerDay * 0.25 * 30); // ~25% un-cached addresses in pilot
  const monthlyPlacesCalls = Math.round(ordersPerDay * 0.375 * 30);   // ~37.5% un-cached search/autocomplete

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
  const monthlyOtps = Math.round(ordersPerDay * 1.1 * 30); // ~33,000 OTPs at 1,000 orders/day

  // Approach 2: Domestic Indian DLT Gateway + Firebase Custom Token (~₹0.25/SMS)
  const smsMonthlyInr = Math.round(monthlyOtps * 0.25); // ₹8,250

  // Approach 1: Direct Firebase Phone Auth / Identity Platform ($0.07 USD / ~₹6.61 INR per SMS after 300 free/mo)
  const firebaseFreeMonthly = 300; // 10 SMS/day globally
  const firebaseBillableOtps = Math.max(0, monthlyOtps - firebaseFreeMonthly);
  const smsDirectFirebaseMonthlyInr = Math.round((firebaseBillableOtps * 0.07) * exchangeRateUsdInr); // ₹2,16,082

  // Total Pilot Monthly (Prod GCP + Maps Approach A + DLT SMS)
  const totalPilotMonthlyInr = prodGcpMonthlyInr + mapsMonthlyInr + smsMonthlyInr; // ₹59,006

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
  - Orders / Day:          ${inputs.ordersPerDay.toLocaleString()} completed orders
  - Active Couriers / Day: ${inputs.activeCouriers} couriers
  - Operating Hours / Day: ${inputs.operatingHours} hours/day
  - USD/INR Exchange Rate: ₹${inputs.exchangeRateUsdInr.toFixed(2)} per USD (FBIL/RBI Nov 2026)

--------------------------------------------------------------------------------
Estimated Monthly Spend (Google Cloud Mumbai asia-south1):
--------------------------------------------------------------------------------
1. Dev Environment GCP:        ${formatInr(proj.devGcpMonthlyInr)} / mo
   • Cloud SQL & Redis:        NO Free Tier (hourly billable compute/storage)
   • Direct VPC Egress:        $0 Infrastructure Fee (native VPC routing)
   • Cloud Run & Pub/Sub:      Covered by Permanent Free Tier
   • Scheduled Shutdown:       Overnight 12h/day off saves ~50% compute
   • Ceiling Status:           ${proj.ceilings.devCeilingConfigured ? formatInr(proj.ceilings.devCeilingInr!) : 'Not configured (estimates only)'}

2. Prod Pilot GCP Infra:       ${formatInr(proj.prodGcpMonthlyInr)} / mo
   • Cloud SQL & Redis:        NO Free Tier (HA Regional replication billable 24x7)
   • Direct VPC Egress:        $0 Infrastructure Fee ($1.00 cross-zone network egress)
   • Cloud Run:                Idle memory for min_instances=1 billable
   • Ceiling Status:           ${proj.ceilings.prodCeilingConfigured ? formatInr(proj.ceilings.prodCeilingInr!) : 'Not configured (estimates only)'}

3. Google Maps Platform:       ${formatInr(proj.mapsMonthlyInr)} / mo
   • Approach A (Optimized):   ${formatInr(proj.mapsMonthlyInr)} / mo (63,000 calls within 70k free cap)
   • Naive Continuous Polling: ${formatInr(proj.mapsNaiveMonthlyInr)} / mo (12.96M calls)
   • Gross Cost Divergence:    ${proj.mapsDivergenceRatio}x higher cost under naive polling!
   • Ceiling Status:           ${proj.ceilings.mapsCeilingConfigured ? formatInr(proj.ceilings.mapsCeilingInr!) : 'Not configured (estimates only)'}

4. SMS / OTP Authentication:   ${formatInr(proj.smsMonthlyInr)} / mo
   • Approach 2 (DLT Gateway): ${formatInr(proj.smsMonthlyInr)} / mo (~33,000 OTPs @ ₹0.25 DLT rate)
   • Approach 1 (Direct FB):   ${formatInr(proj.smsDirectFirebaseMonthlyInr)} / mo ($0.07/SMS Identity Platform tariff)
   • Cost Difference:          Direct Firebase is ~26x more expensive than DLT Gateway!
   • Ceiling Status:           ${proj.ceilings.smsCeilingConfigured ? formatInr(proj.ceilings.smsCeilingInr!) : 'Not configured (estimates only)'}

--------------------------------------------------------------------------------
Total Estimated Pilot Spend:   ${formatInr(proj.totalPilotMonthlyInr)} / mo
Budget Ceilings Governance:    Optional config variables (empty by default; owner to set)
================================================================================
`);
}

main();
