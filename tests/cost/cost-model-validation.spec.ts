import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT_DIR = path.resolve(import.meta.dirname, '../../');
const COST_DOC_PATH = path.join(ROOT_DIR, 'docs/cost/monthly-cost-estimate-inr.md');
const CALCULATOR_SCRIPT_PATH = path.join(ROOT_DIR, 'scripts/cost-calculator.ts');

describe('Task 7: Itemized Monthly INR Cost Model & Budget Ceiling Validation', () => {
  describe('File Existence', () => {
    it('should have cost documentation at docs/cost/monthly-cost-estimate-inr.md', () => {
      assert.ok(fs.existsSync(COST_DOC_PATH), 'docs/cost/monthly-cost-estimate-inr.md must exist');
    });

    it('should have executable cost calculator script at scripts/cost-calculator.ts', () => {
      assert.ok(fs.existsSync(CALCULATOR_SCRIPT_PATH), 'scripts/cost-calculator.ts must exist');
    });
  });

  describe('GCP Infrastructure Itemized Costs in asia-south1 (Mumbai)', () => {
    it('should document dev environment line items with overnight scheduler shutdown savings', () => {
      assert.ok(fs.existsSync(COST_DOC_PATH), 'Cost doc must exist to validate dev costs');
      const content = fs.readFileSync(COST_DOC_PATH, 'utf-8');

      // Region & USD/INR baseline
      assert.match(content, /asia-south1|mumbai/i, 'Must specify asia-south1 (Mumbai) pricing');
      assert.match(content, /8[45]/, 'Must document USD to INR exchange rate baseline (~84-85 INR/USD)');

      // Dev line items
      assert.match(content, /Cloud SQL/i, 'Must include Cloud SQL in dev breakdown');
      assert.match(content, /db-f1-micro|db-custom-1-3840/i, 'Must specify dev database tier (db-f1-micro or db-custom-1-3840)');
      assert.match(content, /Memorystore|Redis/i, 'Must include Memorystore Redis in dev breakdown');
      assert.match(content, /Basic/i, 'Must specify Basic tier Redis for dev');
      assert.match(content, /Cloud Run/i, 'Must include Cloud Run services in dev breakdown');
      assert.match(content, /Serverless VPC Access|VPC Connector/i, 'Must include Serverless VPC Access connector');
      assert.match(content, /Cloud Storage/i, 'Must include Cloud Storage');
      assert.match(content, /Secret Manager/i, 'Must include Secret Manager');
      assert.match(content, /Cloud Logging|Monitoring/i, 'Must include Cloud Logging / Monitoring');

      // Overnight shutdown savings
      assert.match(content, /overnight|shutdown|scheduler/i, 'Must detail overnight scheduler shutdown mechanism');
      assert.match(content, /12\s*(?:hours|hrs|\/day)|360\s*h(?:ou)?rs/i, 'Must model 12h/day or ~360 hrs/mo operational window');
      assert.match(content, /50%|half/i, 'Must reflect compute savings from scheduled shutdown (~50% compute reduction)');
    });

    it('should document prod pilot environment line items (HA SQL + PITR, Standard HA Redis, min_instances=1)', () => {
      assert.ok(fs.existsSync(COST_DOC_PATH), 'Cost doc must exist to validate prod costs');
      const content = fs.readFileSync(COST_DOC_PATH, 'utf-8');

      // Prod line items
      assert.match(content, /db-custom-2-7680/i, 'Must specify db-custom-2-7680 for prod pilot Cloud SQL');
      assert.match(content, /High Availability|HA Regional|regional failover/i, 'Must model Cloud SQL High Availability');
      assert.match(content, /PITR|Point-in-Time Recovery/i, 'Must model Point-in-Time Recovery (PITR) backup retention');
      assert.match(content, /Standard\s*(?:Tier|HA)?|5\s*GB/i, 'Must model Memorystore Redis Standard HA tier');
      assert.match(content, /min_instances\s*=\s*1/i, 'Must model Cloud Run min_instances=1 for api and dispatch');
      assert.match(content, /24x7|720\s*h(?:ou)?rs|730\s*h(?:ou)?rs/i, 'Must model 24x7 continuous operation for production');
    });
  });

  describe('Google Maps Platform Routes API Architecture & Mathematical Comparison', () => {
    it('should contrast Approach A (single call cached in Redis) vs continuous polling runaway costs', () => {
      assert.ok(fs.existsSync(COST_DOC_PATH), 'Cost doc must exist to validate maps comparison');
      const content = fs.readFileSync(COST_DOC_PATH, 'utf-8');

      // Routes API pricing
      assert.match(content, /Routes API|ComputeRoutes/i, 'Must reference Routes API / ComputeRoutes');
      assert.match(content, /\$5(?:\.00)?\s*\/\s*1,?000|₹425\s*\/\s*1,?000/i, 'Must document Routes API list price ($5/1k or ~₹425/1k)');

      // Approach A (Optimized)
      assert.match(content, /Approach A|Optimized/i, 'Must identify Approach A / Single-call architecture');
      assert.match(content, /100\s*m(?:eters?)?/i, 'Must mention 100m displacement threshold');
      assert.match(content, /60\s*s(?:econds?)?|cooldown|flapping/i, 'Must mention cooldown / flapping guard for recalculation');
      assert.match(content, /Redis/i, 'Must reference route geometry caching in Redis');

      // Naive Continuous Polling
      assert.match(content, /polling|continuous|naive/i, 'Must contrast with naive continuous GPS polling');
      assert.match(content, /runaway|exponential|divergence/i, 'Must explain the dramatic cost divergence/runaway risk');
    });
  });

  describe('Firebase Phone Auth & SMS Pumping Defense', () => {
    it('should model Indian SMS verification pricing and SMS pumping attack defense', () => {
      assert.ok(fs.existsSync(COST_DOC_PATH), 'Cost doc must exist to validate SMS costs');
      const content = fs.readFileSync(COST_DOC_PATH, 'utf-8');

      // Phone Auth pricing
      assert.match(content, /Firebase Phone Auth|Phone Authentication/i, 'Must model Firebase Phone Authentication');
      assert.match(content, /10,?000/i, 'Must document the 10,000 free verifications / month tier');

      // SMS pumping threat & mitigation
      assert.match(content, /SMS pumping|toll fraud/i, 'Must detail SMS pumping / toll fraud attack vector');
      assert.match(content, /App Check/i, 'Must specify Firebase App Check mitigation');
      assert.match(content, /Play Integrity/i, 'Must specify Play Integrity for Android');
      assert.match(content, /DeviceCheck|App Attest/i, 'Must specify DeviceCheck or App Attest for iOS');
      assert.match(content, /reCAPTCHA Enterprise/i, 'Must specify reCAPTCHA Enterprise for web');
      assert.match(content, /rate limit/i, 'Must specify rate limiting per IP / device / phone number');
    });
  });

  describe('Budget Ceilings & Threshold Alert Escalation Matrix', () => {
    it('should define exact budget ceilings Rs [X], Rs [Y], Rs [Z], and Rs [W]', () => {
      assert.ok(fs.existsSync(COST_DOC_PATH), 'Cost doc must exist to validate budget ceilings');
      const content = fs.readFileSync(COST_DOC_PATH, 'utf-8');

      // Explicit placeholder references matching system spec
      assert.match(content, /Rs\s*\[X\]/i, 'Must explicitly define Dev budget ceiling Rs [X]');
      assert.match(content, /Rs\s*\[Y\]/i, 'Must explicitly define Prod Pilot budget ceiling Rs [Y]');
      assert.match(content, /Rs\s*\[Z\]/i, 'Must explicitly define Google Maps budget ceiling Rs [Z]');
      assert.match(content, /Rs\s*\[W\]/i, 'Must explicitly define SMS/OTP budget ceiling Rs [W]');
    });

    it('should specify threshold alert matrix at 50%, 80%, and 100% with automated actions', () => {
      assert.ok(fs.existsSync(COST_DOC_PATH), 'Cost doc must exist to validate threshold alert matrix');
      const content = fs.readFileSync(COST_DOC_PATH, 'utf-8');

      // Threshold percentages
      assert.match(content, /50%/i, 'Must specify 50% alert threshold');
      assert.match(content, /80%/i, 'Must specify 80% alert threshold');
      assert.match(content, /100%/i, 'Must specify 100% alert threshold');

      // Automated escalation workflows
      assert.match(content, /Pub\/Sub/i, 'Must specify Pub/Sub integration for billing budget alerts');
      assert.match(content, /Slack|email|webhook/i, 'Must specify alert notification channels (Slack, email, or webhook)');
      assert.match(content, /throttl|circuit breaker|disable|quota/i, 'Must specify automated circuit breakers or throttling at 100%');
    });
  });

  describe('CLI Cost Calculator Script (scripts/cost-calculator.ts)', () => {
    it('should execute successfully with --json flag and return valid numeric cost projection', () => {
      assert.ok(fs.existsSync(CALCULATOR_SCRIPT_PATH), 'Calculator script must exist');

      const cmd = 'node --experimental-transform-types scripts/cost-calculator.ts --json';
      const output = execSync(cmd, { cwd: ROOT_DIR, encoding: 'utf-8' });
      
      let parsed: any;
      assert.doesNotThrow(() => {
        parsed = JSON.parse(output.trim());
      }, 'Script output with --json must be valid JSON');

      assert.ok(typeof parsed.devGcpMonthlyInr === 'number' && parsed.devGcpMonthlyInr > 0, 'devGcpMonthlyInr must be a positive number');
      assert.ok(typeof parsed.prodGcpMonthlyInr === 'number' && parsed.prodGcpMonthlyInr > 0, 'prodGcpMonthlyInr must be a positive number');
      assert.ok(typeof parsed.mapsMonthlyInr === 'number' && parsed.mapsMonthlyInr >= 0, 'mapsMonthlyInr must be a valid number');
      assert.ok(typeof parsed.smsMonthlyInr === 'number' && parsed.smsMonthlyInr >= 0, 'smsMonthlyInr must be a valid number');
      assert.ok(parsed.ceilings, 'Must include ceilings object');
      assert.ok(typeof parsed.ceilings.devCeilingInr === 'number', 'ceilings.devCeilingInr must be numeric');
      assert.ok(typeof parsed.ceilings.prodCeilingInr === 'number', 'ceilings.prodCeilingInr must be numeric');
      assert.ok(typeof parsed.ceilings.mapsCeilingInr === 'number', 'ceilings.mapsCeilingInr must be numeric');
      assert.ok(typeof parsed.ceilings.smsCeilingInr === 'number', 'ceilings.smsCeilingInr must be numeric');
      assert.ok(parsed.thresholdStatus, 'Must include thresholdStatus object');
      assert.ok(typeof parsed.exchangeRateUsdInr === 'number', 'exchangeRateUsdInr must be numeric');
    });

    it('should support customized CLI parameters for scaling scenarios', () => {
      assert.ok(fs.existsSync(CALCULATOR_SCRIPT_PATH), 'Calculator script must exist');

      const cmd = 'node --experimental-transform-types scripts/cost-calculator.ts --ordersPerDay=2500 --activeCouriers=100 --operatingHours=16 --json';
      const output = execSync(cmd, { cwd: ROOT_DIR, encoding: 'utf-8' });
      const parsed = JSON.parse(output.trim());

      assert.strictEqual(parsed.inputs.ordersPerDay, 2500);
      assert.strictEqual(parsed.inputs.activeCouriers, 100);
      assert.strictEqual(parsed.inputs.operatingHours, 16);
      assert.ok(parsed.mapsMonthlyInr > 0);
    });

    it('should render a human-readable summary table when executed without --json', () => {
      assert.ok(fs.existsSync(CALCULATOR_SCRIPT_PATH), 'Calculator script must exist');

      const cmd = 'node --experimental-transform-types scripts/cost-calculator.ts';
      const output = execSync(cmd, { cwd: ROOT_DIR, encoding: 'utf-8' });

      assert.match(output, /AllGo Monthly INR Cost Model/i, 'Should print human-readable header');
      assert.match(output, /Dev Environment/i, 'Should include Dev Environment in human output');
      assert.match(output, /Prod Pilot/i, 'Should include Prod Pilot in human output');
      assert.match(output, /Google Maps/i, 'Should include Google Maps in human output');
      assert.match(output, /SMS \/ OTP/i, 'Should include SMS in human output');
      assert.match(output, /₹|INR/i, 'Should format currency with INR or ₹ symbol');
    });
  });
});
