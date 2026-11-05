import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT_DIR = path.resolve(import.meta.dirname, '../../');
const COST_DOC_PATH = path.join(ROOT_DIR, 'docs/cost/monthly-cost-estimate-inr.md');
const CALCULATOR_SCRIPT_PATH = path.join(ROOT_DIR, 'scripts/cost-calculator.ts');

describe('Task 7: Itemized Monthly INR Cost Model & Operational Estimates Validation', () => {
  describe('File Existence', () => {
    it('should have cost documentation at docs/cost/monthly-cost-estimate-inr.md', () => {
      assert.ok(fs.existsSync(COST_DOC_PATH), 'docs/cost/monthly-cost-estimate-inr.md must exist');
    });

    it('should have executable cost calculator script at scripts/cost-calculator.ts', () => {
      assert.ok(fs.existsSync(CALCULATOR_SCRIPT_PATH), 'scripts/cost-calculator.ts must exist');
    });
  });

  describe('Official Documentation Links & Free-Tier Claims Verification', () => {
    it('should include official Google Cloud, Google Maps, and Firebase pricing links', () => {
      assert.ok(fs.existsSync(COST_DOC_PATH));
      const content = fs.readFileSync(COST_DOC_PATH, 'utf-8');

      assert.match(content, /cloud\.google\.com\/sql\/pricing/i, 'Must link to Cloud SQL pricing page');
      assert.match(content, /cloud\.google\.com\/memorystore\/docs\/redis\/pricing/i, 'Must link to Redis pricing page');
      assert.match(content, /cloud\.google\.com\/run\/pricing/i, 'Must link to Cloud Run pricing page');
      assert.match(content, /developers\.google\.com\/maps\/billing-credits/i, 'Must link to Google Maps billing credits');
      assert.match(content, /firebase\.google\.com\/pricing/i, 'Must link to Firebase pricing page');
      assert.match(content, /cloud\.google\.com\/run\/docs\/configuring\/vpc-direct-vpc/i, 'Must link to Direct VPC egress doc');
      assert.match(content, /\[UNVERIFIED/i, 'Must flag unverified items explicitly');
    });

    it('should accurately differentiate between free-tier covered vs billable components', () => {
      assert.ok(fs.existsSync(COST_DOC_PATH));
      const content = fs.readFileSync(COST_DOC_PATH, 'utf-8');

      // Cloud SQL has NO free tier
      assert.match(content, /Cloud SQL[\s\S]*?NO\s*Free\s*Tier/i, 'Cloud SQL must be explicitly marked as having NO free tier');
      
      // Memorystore Redis has NO free tier
      assert.match(content, /Memorystore[\s\S]*?NO\s*Free\s*Tier/i, 'Memorystore Redis must be explicitly marked as having NO free tier');

      // Direct VPC Egress has $0 infrastructure fee
      assert.match(content, /Direct VPC Egress[\s\S]*?\$0\s*Infrastructure\s*Fee/i, 'Direct VPC Egress must be marked as $0 infrastructure fee');

      // Firebase Phone Auth: No 10,000 free tier; 10 SMS/day (~300/mo) globally
      assert.match(content, /Firebase Phone Auth[\s\S]*?NO\s*10,?000\s*Free\s*Tier/i, 'Firebase Phone Auth must state NO 10,000 free tier');
      assert.match(content, /10\s*SMS\/day/i, 'Must document 10 SMS/day global free allowance');
      assert.match(content, /\$0\.07/i, 'Must document $0.07 USD per SMS Identity Platform tariff for India');

      // Google Maps per-SKU 70,000 free monthly caps under India pricing
      assert.match(content, /70,?000\s*free\s*(?:Compute\s*)?Routes/i, 'Google Maps must document 70,000 free Routes calls under India pricing');
      assert.match(content, /70,?000\s*free\s*Geocoding/i, 'Google Maps must document 70,000 free Geocoding calls');
      assert.match(content, /70,?000\s*free\s*Places/i, 'Google Maps must document 70,000 free Places Autocomplete calls');
      assert.match(content, /unlimited\s*free\s*mobile\s*map\s*loads/i, 'Maps SDK for Android/iOS must document unlimited free mobile map loads');
    });
  });

  describe('Exchange Rate & Budget Ceilings Governance', () => {
    it('should document verified USD/INR exchange rate with date and source', () => {
      assert.ok(fs.existsSync(COST_DOC_PATH));
      const content = fs.readFileSync(COST_DOC_PATH, 'utf-8');

      assert.match(content, /94\.40/i, 'Must use verified exchange rate 1 USD = ₹94.40 INR');
      assert.match(content, /FBIL|Reserve Bank of India/i, 'Must record source (FBIL / Reserve Bank of India)');
      assert.match(content, /November 2026/i, 'Must record baseline date (November 2026)');
    });

    it('should treat budget ceilings as optional config variables empty by default without placeholders', () => {
      assert.ok(fs.existsSync(COST_DOC_PATH));
      const content = fs.readFileSync(COST_DOC_PATH, 'utf-8');

      // No [X], [Y], [Z], [W] placeholders
      assert.doesNotMatch(content, /Rs\s*\[[XYZW]\]/i, 'Must not contain [X], [Y], [Z], or [W] placeholders');

      // Documents optional config variables
      assert.match(content, /optional\s*(?:config(?:uration)?)?\s*variable/i, 'Must document ceilings as optional config variables');
      assert.match(content, /empty|unset\s*by\s*default/i, 'Must specify ceilings are empty or unset by default');
      assert.match(content, /estimates?\s*only/i, 'Must indicate document provides estimates only until values are set');
    });
  });

  describe('GCP Infrastructure Itemized Costs in asia-south1 (Mumbai)', () => {
    it('should document dev environment line items with overnight scheduler shutdown savings', () => {
      assert.ok(fs.existsSync(COST_DOC_PATH));
      const content = fs.readFileSync(COST_DOC_PATH, 'utf-8');

      assert.match(content, /asia-south1|mumbai/i, 'Must specify asia-south1 (Mumbai) pricing');
      assert.match(content, /Cloud SQL/i, 'Must include Cloud SQL in dev breakdown');
      assert.match(content, /db-custom-1-3840/i, 'Must specify dev database tier');
      assert.match(content, /Memorystore|Redis/i, 'Must include Memorystore Redis in dev breakdown');
      assert.match(content, /Direct VPC Egress/i, 'Must document Direct VPC Egress in dev breakdown');
      assert.match(content, /overnight|shutdown|scheduler/i, 'Must detail overnight scheduler shutdown mechanism');
      assert.match(content, /50%|half/i, 'Must reflect compute savings from scheduled shutdown (~50% compute reduction)');
      assert.match(content, /₹4,633/i, 'Must calculate dev monthly spend as ₹4,633 / month');
    });

    it('should document prod pilot environment line items (HA SQL + PITR, Standard HA Redis, min_instances=1)', () => {
      assert.ok(fs.existsSync(COST_DOC_PATH));
      const content = fs.readFileSync(COST_DOC_PATH, 'utf-8');

      assert.match(content, /db-custom-2-7680/i, 'Must specify db-custom-2-7680 for prod pilot Cloud SQL');
      assert.match(content, /High Availability|HA Regional|regional failover/i, 'Must model Cloud SQL High Availability');
      assert.match(content, /PITR|Point-in-Time Recovery/i, 'Must model Point-in-Time Recovery (PITR) backup retention');
      assert.match(content, /Standard\s*(?:Tier|HA)?|5\s*GB/i, 'Must model Memorystore Redis Standard HA tier');
      assert.match(content, /min_instances\s*=\s*1/i, 'Must model Cloud Run min_instances=1 for api and dispatch');
      assert.match(content, /Direct VPC Egress/i, 'Must model Direct VPC Egress ($0 setup fee)');
      assert.match(content, /Cross-Zone Network Egress/i, 'Must model Cross-Zone Network Egress');
      assert.match(content, /₹50,756/i, 'Must calculate prod pilot GCP spend as ₹50,756 / month');
    });
  });

  describe('Google Maps Platform Modernized India Pricing & Usage Model', () => {
    it('should contrast Approach A (inside free cap) vs continuous polling runaway costs', () => {
      assert.ok(fs.existsSync(COST_DOC_PATH));
      const content = fs.readFileSync(COST_DOC_PATH, 'utf-8');

      assert.match(content, /Routes API|ComputeRoutes/i, 'Must reference Routes API / ComputeRoutes');
      assert.match(content, /Approach A|Optimized/i, 'Must identify Approach A / Single-call architecture');
      assert.match(content, /100\s*m(?:eters?)?/i, 'Must mention 100m displacement threshold');
      assert.match(content, /60\s*s(?:econds?)?|cooldown|flapping/i, 'Must mention cooldown / flapping guard');
      assert.match(content, /63,?000\s*(?:requests|calls)/i, 'Must document 63,000 monthly calls for 1,000 orders/day');
      assert.match(content, /₹0(?:\.00)?\s*\/\s*month/i, 'Must document ₹0.00 / month under 70,000 free cap');
      assert.match(content, /polling|continuous|naive/i, 'Must contrast with naive continuous GPS polling');
      assert.match(content, /12,?960,?000/i, 'Must calculate 12.96M calls for naive polling');
      assert.match(content, /16,?11,?250|16\.1\s*Lakhs/i, 'Must document ~₹16.1 Lakhs runaway cost for naive polling');
    });
  });

  describe('Firebase Phone Auth vs Domestic DLT SMS & Toll Fraud Defense', () => {
    it('should contrast direct Firebase against Indian DLT SMS and detail toll fraud mitigation', () => {
      assert.ok(fs.existsSync(COST_DOC_PATH));
      const content = fs.readFileSync(COST_DOC_PATH, 'utf-8');

      // Cost comparison
      assert.match(content, /2,16,082/i, 'Must document ~₹2.16 Lakhs for direct Firebase phone authentication');
      assert.match(content, /8,250/i, 'Must document ₹8,250 for domestic DLT SMS + Custom Token');
      assert.match(content, /26x/i, 'Must highlight ~26x cost divergence between approaches');

      // Toll fraud defense
      assert.match(content, /SMS pumping|toll fraud/i, 'Must detail SMS pumping / toll fraud attack vector');
      assert.match(content, /App Check/i, 'Must specify Firebase App Check mitigation');
      assert.match(content, /Play Integrity/i, 'Must specify Play Integrity for Android');
      assert.match(content, /DeviceCheck|App Attest/i, 'Must specify DeviceCheck or App Attest for iOS');
      assert.match(content, /reCAPTCHA Enterprise/i, 'Must specify reCAPTCHA Enterprise for web');
      assert.match(content, /\+91/i, 'Must specify +91 Indian country code restriction');
      assert.match(content, /rate limit/i, 'Must specify rate limiting per IP / device / phone number');
    });
  });

  describe('CLI Cost Calculator Script (scripts/cost-calculator.ts)', () => {
    it('should execute successfully with --json flag and return exact Revision 4.0.0 cost estimates', () => {
      assert.ok(fs.existsSync(CALCULATOR_SCRIPT_PATH));

      const cmd = 'node --experimental-transform-types scripts/cost-calculator.ts --json';
      const output = execSync(cmd, { cwd: ROOT_DIR, encoding: 'utf-8' });
      
      let parsed: any;
      assert.doesNotThrow(() => {
        parsed = JSON.parse(output.trim());
      }, 'Script output with --json must be valid JSON');

      assert.strictEqual(parsed.exchangeRateUsdInr, 94.40, 'Default exchange rate must be 94.40');
      assert.strictEqual(parsed.devGcpMonthlyInr, 4633, 'devGcpMonthlyInr must match doc: ₹4,633');
      assert.strictEqual(parsed.prodGcpMonthlyInr, 50756, 'prodGcpMonthlyInr must match doc: ₹50,756');
      assert.strictEqual(parsed.mapsMonthlyInr, 0, 'mapsMonthlyInr must match doc: ₹0 (inside 70k free cap)');
      assert.strictEqual(parsed.smsMonthlyInr, 8250, 'smsMonthlyInr must match doc: ₹8,250 (DLT route)');
      assert.strictEqual(parsed.smsDirectFirebaseMonthlyInr, 216082, 'smsDirectFirebaseMonthlyInr must match doc: ₹2,16,082');
      assert.strictEqual(parsed.totalPilotMonthlyInr, 59006, 'totalPilotMonthlyInr must match doc: ₹59,006');

      assert.ok(parsed.ceilings, 'Must include ceilings object');
      assert.strictEqual(parsed.ceilings.devCeilingConfigured, false, 'devCeilingConfigured must be false by default');
      assert.strictEqual(parsed.ceilings.prodCeilingConfigured, false, 'prodCeilingConfigured must be false by default');
      assert.strictEqual(parsed.evaluation, undefined, 'evaluation must be undefined when no ceilings configured');
    });

    it('should support customized CLI parameters and optional ceiling evaluations', () => {
      assert.ok(fs.existsSync(CALCULATOR_SCRIPT_PATH));

      const cmd = 'node --experimental-transform-types scripts/cost-calculator.ts --ordersPerDay=2500 --activeCouriers=100 --operatingHours=16 --ceilingDev=10000 --json';
      const output = execSync(cmd, { cwd: ROOT_DIR, encoding: 'utf-8' });
      const parsed = JSON.parse(output.trim());

      assert.strictEqual(parsed.inputs.ordersPerDay, 2500);
      assert.strictEqual(parsed.inputs.activeCouriers, 100);
      assert.strictEqual(parsed.inputs.operatingHours, 16);
      assert.strictEqual(parsed.ceilings.devCeilingConfigured, true);
      assert.ok(parsed.evaluation && parsed.evaluation.dev);
      assert.ok(parsed.evaluation.dev.status === 'SAFE' || parsed.evaluation.dev.status === 'WARNING_50');
    });

    it('should render a human-readable summary table when executed without --json', () => {
      assert.ok(fs.existsSync(CALCULATOR_SCRIPT_PATH));

      const cmd = 'node --experimental-transform-types scripts/cost-calculator.ts';
      const output = execSync(cmd, { cwd: ROOT_DIR, encoding: 'utf-8' });

      assert.match(output, /AllGo Platform Monthly Operational Cost Estimates/i, 'Should print human-readable header');
      assert.match(output, /Dev Environment GCP/i, 'Should include Dev Environment GCP');
      assert.match(output, /Prod Pilot GCP Infra/i, 'Should include Prod Pilot GCP Infra');
      assert.match(output, /Google Maps Platform/i, 'Should include Google Maps Platform');
      assert.match(output, /SMS \/ OTP Authentication/i, 'Should include SMS / OTP Authentication');
      assert.match(output, /₹|INR/i, 'Should format currency with INR or ₹ symbol');
    });
  });
});
