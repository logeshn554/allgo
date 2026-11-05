#!/usr/bin/env node

/**
 * AllGo Multi-Vertical On-Demand Platform
 * Dynamic Monthly INR Cost Projection & Operational Estimates Calculator
 *
 * Usage:
 *   node --experimental-transform-types scripts/cost-calculator.ts
 *   node --experimental-transform-types scripts/cost-calculator.ts --json
 *   node --experimental-transform-types scripts/cost-calculator.ts --ordersPerDay=2500 --activeCouriers=100 --operatingHours=14 --json
 *   node --experimental-transform-types scripts/cost-calculator.ts --ceilingDev=10000 --ceilingProd=80000 --json
 */

interface CalculatorInputs {
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

interface BudgetCeilingsConfig {
  devCeilingInr?: number;
  prodCeilingInr?: number;
  mapsCeilingInr?: number;
  smsCeilingInr?: number;
  devCeilingConfigured: boolean;
  prodCeilingConfigured: boolean;
  mapsCeilingConfigured: boolean;
  smsCeilingConfigured: boolean;
}

interface CeilingEvaluation {
  status: 'NOT_SET' | 'SAFE' | 'WARNING_50' | 'CRITICAL_80' | 'BREACHED_100';
  percentage?: number;
  headroomInr?: number;
}

interface CostProjection {
  inputs: CalculatorInputs;
  exchangeRateUsdInr: number;
  devGcpMonthlyInr: number;
  prodGcpMonthlyInr: number;
  mapsMonthlyInr: number;
  mapsNaiveMonthlyInr: number;
  mapsDivergenceRatio: number;
  smsMonthlyInr: number;
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
    exchangeRateUsdInr: 86,
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
AllGo Platform Monthly Cost Calculator CLI

Usage:
  node --experimental-transform-types scripts/cost-calculator.ts [options]

Options:
  --ordersPerDay=<n>     Average completed orders per day (default: 1000)
  --activeCouriers=<n>   Average active delivery couriers per day (default: 50)
  --operatingHours=<n>   Operating hours per day (default: 12)
  --usdInrRate=<n>       USD to INR exchange rate (default: 86)
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
  // Redis Basic 1GB (730 hrs @ $0.024/hr in asia-south1) = $17.52
  // VPC Connector (360 hrs @ 2 * $0.0084/hr) = $6.05
  // Cloud Storage + Secret Manager = $0.46 + $0.90 = $1.36
  const devGcpUsd = 30.00 + 17.52 + 6.05 + 1.36; // $54.93
  const devGcpMonthlyInr = Math.round(devGcpUsd * exchangeRateUsdInr); // ₹4,724

  // 3. Prod Pilot Environment GCP Cost (24x7 HA Cloud SQL + Standard HA Redis + min_instances=1)
  // Cloud SQL db-custom-2-7680 HA (730 hrs compute @ $0.3188/hr = $232.76 + $6.80 HA SSD + $2.80 PITR) = $242.36
  // Redis Standard Tier HA 5GB (730 hrs * 5GB * $0.048/GB-hr in asia-south1) = $175.20
  // Cloud Run baseline: api ($20.00) + dispatch ($15.80) + webhooks ($0.80) = $36.60
  // Dynamic scale component based on order volume above baseline
  const dynamicComputeUsd = Math.max(0, (ordersPerDay - 1000) * 30 * 0.002);
  const cloudRunUsd = 36.60 + dynamicComputeUsd;
  const vpcAccessUsd = 12.26;
  const storageAndSecretsUsd = 4.80 + 2.70;
  const observabilityUsd = 25.00 + 10.00;
  const operationalBufferUsd = 40.00;

  const prodGcpUsd = 242.36 + 175.20 + cloudRunUsd + vpcAccessUsd + storageAndSecretsUsd + observabilityUsd + operationalBufferUsd;
  const prodGcpMonthlyInr = Math.round(prodGcpUsd * exchangeRateUsdInr); // ₹47,207 at 1,000 orders/day

  // 4. Google Maps Cost Analysis (Approach A vs Naive Polling)
  // Approach A (AllGo Optimized):
  // 2 legs per order (pickup + dropoff) + 0.1 re-route trigger (100m displacement + 60s cooldown)
  const routesCallsPerOrder = 2.1;
  const monthlyRoutesCalls = Math.round(ordersPerDay * routesCallsPerOrder * 30);
  const routesGrossUsd = (monthlyRoutesCalls / 1000) * 5.00;
  
  // Geocoding & Places autocomplete support (only new un-cached addresses: ~25% in pilot)
  const placesAndGeocodingUsd = 45.00 * (ordersPerDay / 1000);
  const mapsTotalGrossUsd = routesGrossUsd + placesAndGeocodingUsd;
  
  // Apply Google Maps $200 recurring monthly free credit
  const mapsNetUsd = Math.max(0, mapsTotalGrossUsd - 200.00);
  const mapsMonthlyInr = Math.round(mapsNetUsd * exchangeRateUsdInr); // ₹13,760 at 1,000 orders/day

  // Naive Continuous Polling Comparison:
  const secondsPerDay = operatingHours * 3600;
  const pollingCallsPerCourierDay = secondsPerDay / 5;
  const monthlyNaiveCalls = activeCouriers * pollingCallsPerCourierDay * 30;
  const mapsNaiveGrossUsd = (monthlyNaiveCalls / 1000) * 5.00;
  const mapsNaiveNetUsd = Math.max(0, mapsNaiveGrossUsd - 200.00);
  const mapsNaiveMonthlyInr = Math.round(mapsNaiveNetUsd * exchangeRateUsdInr);
  const mapsDivergenceRatio = mapsMonthlyInr > 0 
    ? Math.round(mapsNaiveMonthlyInr / mapsMonthlyInr) 
    : Math.round(mapsNaiveGrossUsd / Math.max(1, mapsTotalGrossUsd));

  // 5. SMS / OTP Authentication Cost
  const monthlyOtps = Math.round(ordersPerDay * 1.1 * 30);
  const billableOtps = Math.max(0, monthlyOtps - 10000);
  const smsMonthlyInr = Math.round(billableOtps * 0.30); // ₹6,900 at 1,000 orders/day

  // Total Pilot Monthly (Prod GCP + Maps + SMS)
  const totalPilotMonthlyInr = prodGcpMonthlyInr + mapsMonthlyInr + smsMonthlyInr;

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
  - USD/INR Exchange Rate: ₹${inputs.exchangeRateUsdInr.toFixed(2)} per USD

--------------------------------------------------------------------------------
Estimated Monthly Spend (Google Cloud Mumbai asia-south1):
--------------------------------------------------------------------------------
1. Dev Environment GCP:        ${formatInr(proj.devGcpMonthlyInr)} / mo
   • Cloud SQL & Redis:        NO Free Tier (hourly billable compute/storage)
   • Cloud Run & Pub/Sub:      Covered by Free Tier
   • Scheduled Shutdown:       Overnight 12h/day off saves ~50% compute
   • Ceiling Status:           ${proj.ceilings.devCeilingConfigured ? formatInr(proj.ceilings.devCeilingInr!) : 'Not configured (estimates only)'}

2. Prod Pilot GCP Infra:       ${formatInr(proj.prodGcpMonthlyInr)} / mo
   • Cloud SQL & Redis:        NO Free Tier (HA Regional replication billable 24x7)
   • Cloud Run:                Idle memory for min_instances=1 billable
   • Ceiling Status:           ${proj.ceilings.prodCeilingConfigured ? formatInr(proj.ceilings.prodCeilingInr!) : 'Not configured (estimates only)'}

3. Google Maps Platform:       ${formatInr(proj.mapsMonthlyInr)} / mo
   • Approach A (Cached):      ${formatInr(proj.mapsMonthlyInr)} / mo (after $200 recurring monthly credit)
   • Naive Polling Anti-Pattern: ${formatInr(proj.mapsNaiveMonthlyInr)} / mo
   • Divergence Factor:        ${proj.mapsDivergenceRatio}x higher cost under naive polling!
   • Ceiling Status:           ${proj.ceilings.mapsCeilingConfigured ? formatInr(proj.ceilings.mapsCeilingInr!) : 'Not configured (estimates only)'}

4. SMS / OTP Authentication:   ${formatInr(proj.smsMonthlyInr)} / mo
   • First 10,000 / month:     FREE on Blaze Plan
   • Subsequent Volume:        ~23,000 paid verifications @ ₹0.30 DLT rate
   • Ceiling Status:           ${proj.ceilings.smsCeilingConfigured ? formatInr(proj.ceilings.smsCeilingInr!) : 'Not configured (estimates only)'}

--------------------------------------------------------------------------------
Total Estimated Pilot Spend:   ${formatInr(proj.totalPilotMonthlyInr)} / mo
Budget Ceilings Governance:    Optional config variables (empty by default; owner to set)
================================================================================
`);
}

main();
