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
      assert.match(content, /\[UNVERIFIED/i, 'Must flag unverified items explicitly');
    });

    it('should accurately differentiate between free-tier covered vs billable components', () => {
      assert.ok(fs.existsSync(COST_DOC_PATH));
      const content = fs.readFileSync(COST_DOC_PATH, 'utf-8');

      // Cloud SQL has NO free tier
      assert.match(content, /Cloud SQL[\s\S]*?NO\s*Free\s*Tier/i, 'Cloud SQL must be explicitly marked as having NO free tier');
      
      // Memorystore Redis has NO free tier
      assert.match(content, /Memorystore[\s\S]*?NO\s*Free\s*Tier/i, 'Memorystore Redis must be explicitly marked as having NO free tier');
      
      // Firebase Phone Auth has 10,000 free verifications
      assert.match(content, /Firebase[\s\S]*?10,?000[\s\S]*?FREE/i, 'Firebase Phone Auth must document 10,000 free verifications / month on Blaze');
      
      // Google Maps $200 recurring credit
      assert.match(content, /\$200(?:\.00)?[\s\S]*?credit/i, 'Google Maps must document $200 recurring monthly credit');
    });
  });

  describe('Budget Ceilings Governance (Optional Configuration Variables)', () => {
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
      assert.match(content, /8[56]/, 'Must document USD to INR exchange rate baseline (~85-86 INR/USD)');
      assert.match(content, /Cloud SQL/i, 'Must include Cloud SQL in dev breakdown');
      assert.match(content, /db-custom-1-3840/i, 'Must specify dev database tier');
      assert.match(content, /Memorystore|Redis/i, 'Must include Memorystore Redis in dev breakdown');
      assert.match(content, /Serverless VPC Access|VPC Connector/i, 'Must include Serverless VPC Access connector');
      assert.match(content, /overnight|shutdown|scheduler/i, 'Must detail overnight scheduler shutdown mechanism');
      assert.match(content, /50%|half/i, 'Must reflect compute savings from scheduled shutdown (~50% compute reduction)');
    });

    it('should document prod pilot environment line items (HA SQL + PITR, Standard HA Redis, min_instances=1)', () => {
      assert.ok(fs.existsSync(COST_DOC_PATH));
      const content = fs.readFileSync(COST_DOC_PATH, 'utf-8');

      assert.match(content, /db-custom-2-7680/i, 'Must specify db-custom-2-7680 for prod pilot Cloud SQL');
      assert.match(content, /High Availability|HA Regional|regional failover/i, 'Must model Cloud SQL High Availability');
      assert.match(content, /PITR|Point-in-Time Recovery/i, 'Must model Point-in-Time Recovery (PITR) backup retention');
      assert.match(content, /Standard\s*(?:Tier|HA)?|5\s*GB/i, 'Must model Memorystore Redis Standard HA tier');
      assert.match(content, /min_instances\s*=\s*1/i, 'Must model Cloud Run min_instances=1 for api and dispatch');
    });
  });

  describe('Google Maps Platform Routes API Architecture & Mathematical Comparison', () => {
    it('should contrast Approach A (single call cached in Redis) vs continuous polling runaway costs', () => {
      assert.ok(fs.existsSync(COST_DOC_PATH));
      const content = fs.readFileSync(COST_DOC_PATH, 'utf-8');

      assert.match(content, /Routes API|ComputeRoutes/i, 'Must reference Routes API / ComputeRoutes');
      assert.match(content, /Approach A|Optimized/i, 'Must identify Approach A / Single-call architecture');
      assert.match(content, /100\s*m(?:eters?)?/i, 'Must mention 100m displacement threshold');
      assert.match(content, /60\s*s(?:econds?)?|cooldown|flapping/i, 'Must mention cooldown / flapping guard');
      assert.match(content, /polling|continuous|naive/i, 'Must contrast with naive continuous GPS polling');
      assert.match(content, /runaway|divergence/i, 'Must explain the dramatic cost divergence/runaway risk');
    });
  });

  describe('Firebase Phone Auth & SMS Pumping Defense', () => {
    it('should model Indian SMS verification pricing and SMS pumping attack defense', () => {
      assert.ok(fs.existsSync(COST_DOC_PATH));
      const content = fs.readFileSync(COST_DOC_PATH, 'utf-8');

      assert.match(content, /SMS pumping|toll fraud/i, 'Must detail SMS pumping / toll fraud attack vector');
      assert.match(content, /App Check/i, 'Must specify Firebase App Check mitigation');
      assert.match(content, /Play Integrity/i, 'Must specify Play Integrity for Android');
      assert.match(content, /DeviceCheck|App Attest/i, 'Must specify DeviceCheck or App Attest for iOS');
      assert.match(content, /reCAPTCHA Enterprise/i, 'Must specify reCAPTCHA Enterprise for web');
      assert.match(content, /rate limit/i, 'Must specify rate limiting per IP / device / phone number');
    });
  });

  describe('CLI Cost Calculator Script (scripts/cost-calculator.ts)', () => {
    it('should execute successfully with --json flag and return valid numeric cost estimates', () => {
      assert.ok(fs.existsSync(CALCULATOR_SCRIPT_PATH));

      const cmd = 'node --experimental-transform-types scripts/cost-calculator.ts --json';
      const output = execSync(cmd, { cwd: ROOT_DIR, encoding: 'utf-8' });
      
      let parsed: any;
      assert.doesNotThrow(() => {
        parsed = JSON.parse(output.trim());
      }, 'Script output with --json must be valid JSON');

      assert.ok(typeof parsed.devGcpMonthlyInr === 'number' && parsed.devGcpMonthlyInr > 0, 'devGcpMonthlyInr must be positive');
      assert.ok(typeof parsed.prodGcpMonthlyInr === 'number' && parsed.prodGcpMonthlyInr > 0, 'prodGcpMonthlyInr must be positive');
      assert.ok(typeof parsed.mapsMonthlyInr === 'number' && parsed.mapsMonthlyInr >= 0, 'mapsMonthlyInr must be valid');
      assert.ok(typeof parsed.smsMonthlyInr === 'number' && parsed.smsMonthlyInr >= 0, 'smsMonthlyInr must be valid');
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
      assert.match(output, /Dev Environment/i, 'Should include Dev Environment');
      assert.match(output, /Prod Pilot/i, 'Should include Prod Pilot');
      assert.match(output, /Google Maps/i, 'Should include Google Maps');
      assert.match(output, /SMS \/ OTP/i, 'Should include SMS');
      assert.match(output, /₹|INR/i, 'Should format currency with INR or ₹ symbol');
    });
  });
});
