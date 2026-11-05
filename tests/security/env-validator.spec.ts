import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT_DIR = path.resolve(import.meta.dirname, '../../');
const DOCS_SECURITY_FILE = path.join(ROOT_DIR, 'docs/security/secrets-inventory.md');
const GITIGNORE_FILE = path.join(ROOT_DIR, '.gitignore');

const ENV_EXAMPLE_FILES = [
  'apps/api/.env.example',
  'apps/dispatch/.env.example',
  'apps/webhooks/.env.example',
  'apps/admin/.env.example',
];

/**
 * Helper to extract variable keys from a .env file content
 */
function parseEnvKeys(content: string): string[] {
  const keys: string[] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const match = trimmed.match(/^([A-Z0-9_]+)\s*=/);
    if (match) {
      keys.push(match[1]);
    }
  }
  return keys;
}

describe('Task 6: Secrets Management, Environment Variables & IAM Inventory Validation', () => {
  describe('File Existence', () => {
    it('should have secrets inventory documentation at docs/security/secrets-inventory.md', () => {
      assert.ok(
        fs.existsSync(DOCS_SECURITY_FILE),
        'docs/security/secrets-inventory.md must exist'
      );
    });

    for (const relativePath of ENV_EXAMPLE_FILES) {
      it(`should have environment template at ${relativePath}`, () => {
        const fullPath = path.join(ROOT_DIR, relativePath);
        assert.ok(fs.existsSync(fullPath), `${relativePath} must exist`);
      });
    }
  });

  describe('.gitignore Credential Leak Prevention', () => {
    it('should prevent committing real environment files and credentials in .gitignore', () => {
      assert.ok(fs.existsSync(GITIGNORE_FILE), '.gitignore must exist');
      const gitignore = fs.readFileSync(GITIGNORE_FILE, 'utf-8');

      // Check required exclusion patterns
      assert.match(gitignore, /^\.env$/m, '.gitignore must ignore .env');
      assert.match(gitignore, /\.env\..*\.local|\.env\*?\.local/m, '.gitignore must ignore .env.*.local');
      assert.match(gitignore, /\*\.pem/m, '.gitignore must ignore *.pem');
      assert.match(gitignore, /\*\.key/m, '.gitignore must ignore *.key');
      assert.match(gitignore, /\*service-account\*\.json/m, '.gitignore must ignore *service-account*.json');
    });
  });

  describe('No Real Secrets in .env.example Files', () => {
    for (const relativePath of ENV_EXAMPLE_FILES) {
      it(`${relativePath} must contain only safe placeholders and no real secrets`, () => {
        const fullPath = path.join(ROOT_DIR, relativePath);
        if (!fs.existsSync(fullPath)) {
          assert.fail(`Missing file ${relativePath}`);
        }
        const content = fs.readFileSync(fullPath, 'utf-8');

        // Check for private keys with real base64 content
        assert.doesNotMatch(
          content,
          /-----BEGIN (?:RSA )?PRIVATE KEY-----\s+[A-Za-z0-9+/]{40,}/,
          `${relativePath} must not contain a real private key payload`
        );

        // Check for live Razorpay keys
        assert.doesNotMatch(
          content,
          /rzp_live_[A-Za-z0-9]+/,
          `${relativePath} must not contain live Razorpay API keys`
        );

        // Check for real Google API keys (typically AIzaSy...)
        assert.doesNotMatch(
          content,
          /AIzaSy[A-Za-z0-9_-]{33}/,
          `${relativePath} must not contain real Google API keys`
        );

        // Check for real live passwords or tokens
        assert.doesNotMatch(
          content,
          /ghp_[A-Za-z0-9]{36}/,
          `${relativePath} must not contain GitHub personal access tokens`
        );
      });
    }
  });

  describe('100% Documentation Coverage for All .env.example Variables', () => {
    it('every variable defined in any .env.example must be documented in docs/security/secrets-inventory.md', () => {
      if (!fs.existsSync(DOCS_SECURITY_FILE)) {
        assert.fail('docs/security/secrets-inventory.md does not exist');
      }
      const inventoryContent = fs.readFileSync(DOCS_SECURITY_FILE, 'utf-8');

      const allKeys = new Set<string>();
      for (const relativePath of ENV_EXAMPLE_FILES) {
        const fullPath = path.join(ROOT_DIR, relativePath);
        if (!fs.existsSync(fullPath)) {
          assert.fail(`Missing file ${relativePath}`);
        }
        const content = fs.readFileSync(fullPath, 'utf-8');
        const keys = parseEnvKeys(content);
        for (const key of keys) {
          allKeys.add(key);
        }
      }

      assert.ok(allKeys.size > 0, 'Should have extracted at least one variable key');

      for (const key of allKeys) {
        const regex = new RegExp(`\\b${key}\\b`);
        assert.ok(
          regex.test(inventoryContent),
          `Environment variable ${key} found in .env.example must be explicitly documented in docs/security/secrets-inventory.md`
        );
      }
    });
  });

  describe('Secrets Inventory Catalog & Sensitivity Coverage', () => {
    it('must catalog all required Google Secret Manager identifiers with classifications', () => {
      if (!fs.existsSync(DOCS_SECURITY_FILE)) {
        assert.fail('docs/security/secrets-inventory.md does not exist');
      }
      const content = fs.readFileSync(DOCS_SECURITY_FILE, 'utf-8');

      const requiredSecrets = [
        'FIREBASE_SERVICE_ACCOUNT_KEY',
        'RAZORPAY_KEY_ID',
        'RAZORPAY_KEY_SECRET',
        'RAZORPAY_WEBHOOK_SECRET',
        'GOOGLE_MAPS_SERVER_API_KEY',
        'GOOGLE_MAPS_CLIENT_ANDROID_KEY',
        'GOOGLE_MAPS_CLIENT_IOS_KEY',
        'DATABASE_URL',
        'REDIS_URL',
        'JWT_PRIVATE_KEY',
        'JWT_PUBLIC_KEY',
      ];

      for (const secret of requiredSecrets) {
        assert.match(
          content,
          new RegExp(`\\b${secret}\\b`),
          `Secrets inventory must include ${secret}`
        );
      }

      // Sensitivity classifications
      assert.match(content, /\bCRITICAL\b/, 'Must classify sensitivity (CRITICAL)');
      assert.match(content, /\bHIGH\b/, 'Must classify sensitivity (HIGH)');
      assert.match(content, /\bMEDIUM\b/, 'Must classify sensitivity (MEDIUM)');

      // Consuming service accounts
      assert.match(content, /\bsa-api\b/, 'Must map to sa-api');
      assert.match(content, /\bsa-dispatch\b/, 'Must map to sa-dispatch');
      assert.match(content, /\bsa-webhooks\b/, 'Must map to sa-webhooks');
      assert.match(content, /\bsa-worker\b/, 'Must map to sa-worker');
    });
  });

  describe('Step-by-Step Provider Acquisition Guides', () => {
    it('must document step-by-step acquisition procedures for all external third-party providers', () => {
      if (!fs.existsSync(DOCS_SECURITY_FILE)) {
        assert.fail('docs/security/secrets-inventory.md does not exist');
      }
      const content = fs.readFileSync(DOCS_SECURITY_FILE, 'utf-8');

      // Firebase Console acquisition
      assert.match(content, /Firebase Console/i, 'Must cover Firebase Console acquisition');
      assert.match(content, /Service accounts/i, 'Must guide Firebase Service Account generation');

      // Razorpay Dashboard acquisition
      assert.match(content, /Razorpay Dashboard/i, 'Must cover Razorpay Dashboard acquisition');
      assert.match(content, /Route/i, 'Must mention Razorpay Route split settlement');
      assert.match(content, /RazorpayX/i, 'Must mention RazorpayX');
      assert.match(content, /Webhook/i, 'Must mention Razorpay Webhook secret configuration');

      // Google Maps Platform acquisition & API key restrictions
      assert.match(content, /Google Maps Platform|Google Cloud Console/i, 'Must cover Google Maps Platform acquisition');
      assert.match(content, /SHA-1/i, 'Must document Android SHA-1 fingerprint restriction');
      assert.match(content, /Bundle ID|bundle identifier/i, 'Must document iOS Bundle ID restriction');
      assert.match(content, /Routes API/i, 'Must document server-side Routes API restrictions');

      // Cloud SQL & Redis
      assert.match(content, /Cloud SQL/i, 'Must document Cloud SQL credentials acquisition');
      assert.match(content, /Memorystore|Redis/i, 'Must document Memorystore Redis connection acquisition');
    });
  });

  describe('Zero-Downtime Secret Rotation Procedures', () => {
    it('must specify zero-downtime rotation workflows for JWT, Razorpay webhooks, and database passwords', () => {
      if (!fs.existsSync(DOCS_SECURITY_FILE)) {
        assert.fail('docs/security/secrets-inventory.md does not exist');
      }
      const content = fs.readFileSync(DOCS_SECURITY_FILE, 'utf-8');

      // JWT dual-key verification
      assert.match(content, /JWT/i, 'Must cover JWT rotation');
      assert.match(content, /dual[- ]key|grace period|two keys/i, 'Must specify dual-key verification window for JWT');

      // Razorpay webhook secret rotation
      assert.match(content, /webhook/i, 'Must cover webhook secret rotation');
      assert.match(content, /dual webhook|rotation window|overlap/i, 'Must specify zero-downtime rotation window for webhooks');

      // Cloud SQL dual user rotation
      assert.match(content, /dual user|secondary user|two users/i, 'Must specify dual-user database password rotation');
    });
  });

  describe('IAM Principle of Least Privilege & Environment Management', () => {
    it('must document IAM bindings (roles/secretmanager.secretAccessor) and Cloud Run vs Local env management', () => {
      if (!fs.existsSync(DOCS_SECURITY_FILE)) {
        assert.fail('docs/security/secrets-inventory.md does not exist');
      }
      const content = fs.readFileSync(DOCS_SECURITY_FILE, 'utf-8');

      // IAM least privilege role
      assert.match(content, /roles\/secretmanager\.secretAccessor/, 'Must specify roles/secretmanager.secretAccessor role');

      // Cloud Run secret mounting
      assert.match(content, /--set-secrets|Secret Manager/i, 'Must specify Cloud Run Secret Manager mounting');

      // Local development vs Cloud Run
      assert.match(content, /local/i, 'Must contrast local environment with production');
      assert.match(content, /\.env/i, 'Must document .env handling for local dev');
    });
  });
});
