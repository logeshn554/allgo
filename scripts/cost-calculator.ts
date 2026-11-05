#!/usr/bin/env node

/**
 * AllGo Multi-Vertical On-Demand Platform
 * Dynamic Monthly INR Cost Projection & Budget Ceiling Sensitivity Calculator
 *
 * Usage:
 *   node --experimental-transform-types scripts/cost-calculator.ts
 *   node --experimental-transform-types scripts/cost-calculator.ts --json
 *   node --experimental-transform-types scripts/cost-calculator.ts --ordersPerDay=2500 --activeCouriers=100 --operatingHours=14 --json
 */

interface CalculatorInputs {
  ordersPerDay: number;
  activeCouriers: number;
  operatingHours: number;
  exchangeRateUsdInr: number;
  formatJson: boolean;
}

interface BudgetCeilings {
  devCeilingInr: number;
  prodCeilingInr: number;
  mapsCeilingInr: number;
  smsCeilingInr: number;
  totalPilotCeilingInr: number;
}

interface ThresholdStatus {
  devStatus: 'SAFE' | 'WARNING_50' | 'CRITICAL_80' | 'BREACHED_100';
  prodStatus: 'SAFE' | 'WARNING_50' | 'CRITICAL_80' | 'BREACHED_100';
  mapsStatus: 'SAFE' | 'WARNING_50' | 'CRITICAL_80' | 'BREACHED_100';
  smsStatus: 'SAFE' | 'WARNING_50' | 'CRITICAL_80' | 'BREACHED_100';
  devPct: number;
  prodPct: number;
  mapsPct: number;
  smsPct: number;
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
  ceilings: BudgetCeilings;
  thresholdStatus: ThresholdStatus;
  withinBudget: boolean;
}

function parseArgs(args: string[]): CalculatorInputs {
  const inputs: CalculatorInputs = {
    ordersPerDay: 1000,
    activeCouriers: 50,
    operatingHours: 12,
    exchangeRateUsdInr: 85,
    formatJson: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--json') {
      inputs.formatJson = true;
    } else if (arg.startsWith('--ordersPerDay=')) {
      inputs.ordersPerDay = Math.max(0, parseInt(arg.split('=')[1], 10) || 1000);
    } else if (arg === '--ordersPerDay' && args[i + 1]) {
      inputs.ordersPerDay = Math.max(0, parseInt(args[++i], 10) || 1000);
    } else if (arg.startsWith('--activeCouriers=')) {
      inputs.activeCouriers = Math.max(0, parseInt(arg.split('=')[1], 10) || 50);
    } else if (arg === '--activeCouriers' && args[i + 1]) {
      inputs.activeCouriers = Math.max(0, parseInt(args[++i], 10) || 50);
    } else if (arg.startsWith('--operatingHours=')) {
      inputs.operatingHours = Math.min(24, Math.max(1, parseInt(arg.split('=')[1], 10) || 12));
    } else if (arg === '--operatingHours' && args[i + 1]) {
      inputs.operatingHours = Math.min(24, Math.max(1, parseInt(args[++i], 10) || 12));
    } else if (arg.startsWith('--usdInrRate=')) {
      inputs.exchangeRateUsdInr = parseFloat(arg.split('=')[1]) || 85;
    } else if (arg === '--usdInrRate' && args[i + 1]) {
      inputs.exchangeRateUsdInr = parseFloat(args[++i]) || 85;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return inputs;
}

function printHelp(): void {
  console.log(`
AllGo Monthly INR Cost Model & Budget Sensitivity Calculator

Usage:
  node --experimental-transform-types scripts/cost-calculator.ts [options]

Options:
  --ordersPerDay=<n>     Average completed orders per day (default: 1000)
  --activeCouriers=<n>   Average active delivery couriers per day (default: 50)
  --operatingHours=<n>   Operating hours per day (default: 12)
  --usdInrRate=<n>       USD to INR exchange rate (default: 85)
  --json                 Output machine-readable JSON format
  --help, -h             Show this help message
`);
}

function determineStatus(pct: number): 'SAFE' | 'WARNING_50' | 'CRITICAL_80' | 'BREACHED_100' {
  if (pct >= 100) return 'BREACHED_100';
  if (pct >= 80) return 'CRITICAL_80';
  if (pct >= 50) return 'WARNING_50';
  return 'SAFE';
}

export function calculateMonthlyCosts(inputs: CalculatorInputs): CostProjection {
  const { ordersPerDay, activeCouriers, operatingHours, exchangeRateUsdInr } = inputs;

  // 1. Budget Ceilings (Fixed contractual/board boundaries)
  const ceilings: BudgetCeilings = {
    devCeilingInr: 10000,    // Rs [X]
    prodCeilingInr: 100000,  // Rs [Y]
    mapsCeilingInr: 25000,   // Rs [Z]
    smsCeilingInr: 10000,    // Rs [W]
    totalPilotCeilingInr: 145000,
  };

  // 2. Dev Environment GCP Cost (with 12h/day overnight scheduler shutdown)
  // Cloud SQL db-custom-1-3840 (360 hrs compute @ $0.0937/hr = $33.73 + $1.70 SSD + $1.00 backup) = $36.43
  // Redis Basic 1GB (730 hrs @ $0.021/hr) = $15.33
  // VPC Connector (360 hrs @ $0.0097/hr) = $3.50
  // Cloud Storage + Secret Manager = $1.20
  const devGcpUsd = 36.43 + 15.33 + 3.50 + 1.20; // $56.46
  const devGcpMonthlyInr = Math.round(devGcpUsd * exchangeRateUsdInr); // ~₹4,799

  // 3. Prod Pilot Environment GCP Cost (24x7 HA Cloud SQL + Standard HA Redis + min_instances=1)
  // Cloud SQL db-custom-2-7680 HA (730 hrs compute @ $0.2601/hr = $189.87 + $6.80 HA SSD + $3.50 PITR) = $200.17
  // Redis Standard Tier HA 5GB (730 hrs * 5GB * $0.049/GB-hr) = $178.85
  // Cloud Run baseline: api ($32.40) + dispatch ($26.80) + webhooks ($2.50) = $61.70
  // Dynamic scale component based on order volume above baseline
  const dynamicComputeUsd = Math.max(0, (ordersPerDay - 1000) * 30 * 0.003);
  const cloudRunUsd = 61.70 + dynamicComputeUsd;
  const vpcAccessUsd = 12.26;
  const storageAndSecretsUsd = 8.00;
  const observabilityUsd = 45.00 + (ordersPerDay > 2500 ? 25.00 : 0);
  const operationalBufferUsd = 52.20;

  const prodGcpUsd = 200.17 + 178.85 + cloudRunUsd + vpcAccessUsd + storageAndSecretsUsd + observabilityUsd + operationalBufferUsd;
  const prodGcpMonthlyInr = Math.round(prodGcpUsd * exchangeRateUsdInr); // ~₹47,445 at 1,000 orders/day

  // 4. Google Maps Cost Analysis (Approach A vs Naive Polling)
  // Approach A (AllGo Optimized):
  // 2 legs per order (pickup + dropoff) + 0.1 re-route trigger (100m displacement + 60s cooldown)
  const routesCallsPerOrder = 2.1;
  const monthlyRoutesCalls = Math.round(ordersPerDay * routesCallsPerOrder * 30);
  const routesGrossUsd = (monthlyRoutesCalls / 1000) * 5.00;
  
  // Geocoding & Places autocomplete support (only new un-cached addresses: ~25% in pilot)
  const placesAndGeocodingUsd = ((ordersPerDay * 0.25 * 30 * 1.5) / 1000) * 2.83 + ((ordersPerDay * 0.25 * 30) / 1000) * 5.00;
  const mapsTotalGrossUsd = routesGrossUsd + placesAndGeocodingUsd;
  
  // Apply Google Maps $200 recurring monthly free credit
  const mapsNetUsd = Math.max(0, mapsTotalGrossUsd - 200.00);
  const mapsMonthlyInr = Math.round(mapsNetUsd * exchangeRateUsdInr);

  // Naive Continuous Polling Comparison:
  // Every active courier polled every 5 seconds for operatingHours per day
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
  // Estimated OTP volume: 1.0 OTP per completed customer order (signups, logins, verification) + 2 per courier shift
  const dailyOtps = (ordersPerDay * 1.0) + (activeCouriers * 2);
  const monthlyOtps = dailyOtps * 30;
  const freeTierOtps = 10000; // Firebase Blaze 10k free phone auth / month
  const billableOtps = Math.max(0, monthlyOtps - freeTierOtps);
  const ratePerSmsInr = 0.30; // TRAI DLT route per transactional SMS
  const smsMonthlyInr = Math.round(billableOtps * ratePerSmsInr);

  // 6. Total Pilot Monthly Spend
  const totalPilotMonthlyInr = prodGcpMonthlyInr + mapsMonthlyInr + smsMonthlyInr;

  // 7. Threshold Status Computation
  const devPct = Math.round((devGcpMonthlyInr / ceilings.devCeilingInr) * 100);
  const prodPct = Math.round((prodGcpMonthlyInr / ceilings.prodCeilingInr) * 100);
  const mapsPct = Math.round((mapsMonthlyInr / ceilings.mapsCeilingInr) * 100);
  const smsPct = Math.round((smsMonthlyInr / ceilings.smsCeilingInr) * 100);

  const thresholdStatus: ThresholdStatus = {
    devStatus: determineStatus(devPct),
    prodStatus: determineStatus(prodPct),
    mapsStatus: determineStatus(mapsPct),
    smsStatus: determineStatus(smsPct),
    devPct,
    prodPct,
    mapsPct,
    smsPct,
  };

  const withinBudget =
    devGcpMonthlyInr <= ceilings.devCeilingInr &&
    prodGcpMonthlyInr <= ceilings.prodCeilingInr &&
    mapsMonthlyInr <= ceilings.mapsCeilingInr &&
    smsMonthlyInr <= ceilings.smsCeilingInr;

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
    thresholdStatus,
    withinBudget,
  };
}

function formatInr(val: number): string {
  return `₹${val.toLocaleString('en-IN')}`;
}

function printHumanReport(proj: CostProjection): void {
  const { inputs, ceilings, thresholdStatus } = proj;

  console.log(`
================================================================================
           AllGo Monthly INR Cost Model & Budget Ceiling Analysis
================================================================================
Inputs:
  - Daily Orders:           ${inputs.ordersPerDay.toLocaleString()}
  - Active Couriers:        ${inputs.activeCouriers.toLocaleString()}
  - Operating Hours/Day:    ${inputs.operatingHours} hrs
  - USD to INR Rate:        ₹${inputs.exchangeRateUsdInr} / USD
--------------------------------------------------------------------------------
1. Dev Environment (GCP asia-south1, 12h/day Overnight Shutdown):
   - Monthly Estimate:      ${formatInr(proj.devGcpMonthlyInr)}
   - Budget Ceiling Rs [X]: ${formatInr(ceilings.devCeilingInr)}
   - Utilization / Status:  ${thresholdStatus.devPct}% (${thresholdStatus.devStatus})

2. Prod Pilot Infrastructure (GCP asia-south1, 24x7 HA SQL + Redis):
   - Monthly Estimate:      ${formatInr(proj.prodGcpMonthlyInr)}
   - Budget Ceiling Rs [Y]: ${formatInr(ceilings.prodCeilingInr)}
   - Utilization / Status:  ${thresholdStatus.prodPct}% (${thresholdStatus.prodStatus})

3. Google Maps Platform (Routes API + Places + Geocoding):
   - Approach A (Cached):   ${formatInr(proj.mapsMonthlyInr)} (Net after $200 free credit)
   - Naive GPS Polling:     ${formatInr(proj.mapsNaiveMonthlyInr)} (RUNAWAY ANTI-PATTERN)
   - Architectural Savings: ${proj.mapsDivergenceRatio}x cost reduction via Redis polyline caching
   - Budget Ceiling Rs [Z]: ${formatInr(ceilings.mapsCeilingInr)}
   - Utilization / Status:  ${thresholdStatus.mapsPct}% (${thresholdStatus.mapsStatus})

4. SMS / OTP Authentication (Firebase Phone Auth + TRAI DLT SMS):
   - Monthly Estimate:      ${formatInr(proj.smsMonthlyInr)} (First 10,000 verifications free)
   - Budget Ceiling Rs [W]: ${formatInr(ceilings.smsCeilingInr)}
   - Utilization / Status:  ${thresholdStatus.smsPct}% (${thresholdStatus.smsStatus})
--------------------------------------------------------------------------------
Overall Pilot Production Summary:
   - Total Monthly Pilot:   ${formatInr(proj.totalPilotMonthlyInr)}
   - Total Ceiling [Y+Z+W]: ${formatInr(ceilings.prodCeilingInr + ceilings.mapsCeilingInr + ceilings.smsCeilingInr)}
   - Overall Financial Fit: ${proj.withinBudget ? 'PASSED (Within All Ceilings)' : 'ALERT: Ceiling Breached'}
================================================================================
`);
}

function main(): void {
  const inputs = parseArgs(process.argv.slice(2));
  const projection = calculateMonthlyCosts(inputs);

  if (inputs.formatJson) {
    console.log(JSON.stringify(projection, null, 2));
  } else {
    printHumanReport(projection);
  }
}

main();
