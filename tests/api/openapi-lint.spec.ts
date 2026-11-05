import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT_DIR = path.resolve(import.meta.dirname, '../../');
const OPENAPI_FILE = path.join(ROOT_DIR, 'docs/api/openapi.yaml');
const WEBSOCKET_DOC_FILE = path.join(ROOT_DIR, 'docs/api/websocket-events.md');

function getOpenApiContent(): string {
  assert.ok(fs.existsSync(OPENAPI_FILE), `docs/api/openapi.yaml must exist at ${OPENAPI_FILE}`);
  return fs.readFileSync(OPENAPI_FILE, 'utf-8');
}

function getWsDocContent(): string {
  assert.ok(fs.existsSync(WEBSOCKET_DOC_FILE), `docs/api/websocket-events.md must exist at ${WEBSOCKET_DOC_FILE}`);
  return fs.readFileSync(WEBSOCKET_DOC_FILE, 'utf-8');
}

/**
 * Validates basic YAML formatting rules without third-party dependencies:
 * - Checks for forbidden tab characters in indentation
 * - Checks for balanced brackets and braces outside strings/comments
 */
function validateYamlFormatting(content: string, filePath: string): void {
  const lines = content.split(/\r?\n/);
  let bracketDepth = 0;
  let braceDepth = 0;
  let inDoubleQuote = false;
  let inSingleQuote = false;
  let escaped = false;

  lines.forEach((line, lineIndex) => {
    // Check forbidden tabs in indentation
    const leadingSpacesMatch = line.match(/^[\t ]+/);
    if (leadingSpacesMatch && leadingSpacesMatch[0].includes('\t')) {
      assert.fail(`File ${filePath} contains forbidden tab character in indentation at line ${lineIndex + 1}`);
    }

    // Scan characters outside quotes and comments
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];

      if (inDoubleQuote) {
        if (escaped) {
          escaped = false;
        } else if (ch === '\\') {
          escaped = true;
        } else if (ch === '"') {
          inDoubleQuote = false;
        }
        continue;
      }

      if (inSingleQuote) {
        if (ch === "'") {
          if (i + 1 < line.length && line[i + 1] === "'") {
            i++;
          } else {
            inSingleQuote = false;
          }
        }
        continue;
      }

      if (ch === '#') {
        break;
      }

      if (ch === '"') {
        inDoubleQuote = true;
        continue;
      }

      if (ch === "'") {
        inSingleQuote = true;
        continue;
      }

      if (ch === '[') bracketDepth++;
      else if (ch === ']') bracketDepth--;
      else if (ch === '{') braceDepth++;
      else if (ch === '}') braceDepth--;
    }
  });

  assert.strictEqual(bracketDepth, 0, `Unbalanced brackets '[]' in ${filePath}`);
  assert.strictEqual(braceDepth, 0, `Unbalanced braces '{}' in ${filePath}`);
}

/**
 * Helper to extract top-level YAML blocks
 */
function extractTopLevelSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = content.split(/\r?\n/);
  let currentKey: string | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const topKeyMatch = line.match(/^([a-zA-Z0-9_-]+):(?:\s*(.*))?$/);
    if (topKeyMatch && !line.startsWith(' ') && !line.startsWith('\t')) {
      if (currentKey) {
        sections[currentKey] = currentContent.join('\n');
      }
      currentKey = topKeyMatch[1];
      currentContent = [line];
    } else if (currentKey) {
      currentContent.push(line);
    }
  }

  if (currentKey) {
    sections[currentKey] = currentContent.join('\n');
  }

  return sections;
}

describe('OpenAPI 3.1 & WebSocket Event Specifications Validation', () => {
  describe('File Existence', () => {
    it('should have OpenAPI specification at docs/api/openapi.yaml', () => {
      assert.ok(fs.existsSync(OPENAPI_FILE), 'docs/api/openapi.yaml must exist');
      const stats = fs.statSync(OPENAPI_FILE);
      assert.ok(stats.size > 500, 'openapi.yaml must be non-trivial in size');
    });

    it('should have WebSocket event specification at docs/api/websocket-events.md', () => {
      assert.ok(fs.existsSync(WEBSOCKET_DOC_FILE), 'docs/api/websocket-events.md must exist');
      const stats = fs.statSync(WEBSOCKET_DOC_FILE);
      assert.ok(stats.size > 500, 'websocket-events.md must be non-trivial in size');
    });
  });

  describe('OpenAPI 3.1 YAML Structure & Syntax', () => {
    it('should pass strict YAML formatting checks without illegal tabs or unbalanced brackets', () => {
      const content = getOpenApiContent();
      validateYamlFormatting(content, OPENAPI_FILE);
    });

    it('should be valid OpenAPI 3.1.0 document with required root fields', () => {
      const content = getOpenApiContent();
      const sections = extractTopLevelSections(content);

      // Verify OpenAPI 3.1.0
      assert.match(content, /^openapi:\s*['"]?3\.1\.\d+['"]?/m, 'Must specify openapi version 3.1.x');

      // Verify required top-level sections
      assert.ok('info' in sections, 'Must define info block');
      assert.ok('servers' in sections, 'Must define servers block');
      assert.ok('paths' in sections, 'Must define paths block');
      assert.ok('components' in sections, 'Must define components block');

      // Verify service server URLs cover api, dispatch, and webhooks microservices
      assert.match(sections.servers, /api/i, 'Servers must define api service endpoint');
      assert.match(sections.servers, /dispatch/i, 'Servers must define dispatch service endpoint');
      assert.match(sections.servers, /webhooks/i, 'Servers must define webhooks service endpoint');
    });
  });

  describe('REST Endpoints Specification Coverage', () => {
    it('should specify POST /v1/auth/session for Firebase authentication exchange', () => {
      const openapiContent = getOpenApiContent();
      assert.match(openapiContent, /['"]?\/v1\/auth\/session['"]?:/, 'Must define /v1/auth/session path');
      assert.match(openapiContent, /firebase_token/i, 'Session exchange must accept firebase_token');
      assert.match(openapiContent, /access_token/i, 'Session exchange must return access_token');
      assert.match(openapiContent, /refresh_token/i, 'Session exchange must return refresh_token');
    });

    it('should specify GET /v1/zones/serviceable for active service zones', () => {
      const openapiContent = getOpenApiContent();
      assert.match(openapiContent, /['"]?\/v1\/zones\/serviceable['"]?:/, 'Must define /v1/zones/serviceable path');
      assert.match(openapiContent, /polygon|coordinates|latitude|longitude/i, 'Zone definition must include spatial coordinates');
    });

    it('should specify GET /v1/merchants/{id}/catalog with Accept-Language header support', () => {
      const openapiContent = getOpenApiContent();
      assert.match(openapiContent, /['"]?\/v1\/merchants\/\{id\}\/catalog['"]?:/, 'Must define /v1/merchants/{id}/catalog path');
      assert.match(openapiContent, /Accept-Language/i, 'Catalog endpoint must specify Accept-Language header');
      assert.match(openapiContent, /ta/i, 'Catalog endpoint must document Tamil (ta) language support');
      assert.match(openapiContent, /en/i, 'Catalog endpoint must document English (en) language support');
    });

    it('should specify Section 5A POST /v1/checkout/quote with 10m TTL and fulfillment options', () => {
      const openapiContent = getOpenApiContent();
      assert.match(openapiContent, /['"]?\/v1\/checkout\/quote['"]?:/, 'Must define /v1/checkout/quote path');
      assert.match(openapiContent, /ttl|expires_at/i, 'Quote must specify TTL or expiration timestamp');
      assert.match(openapiContent, /SEPARATE/i, 'Quote must support Mode A (SEPARATE) fulfillment');
      assert.match(openapiContent, /DELIVER_TOGETHER/i, 'Quote must support Mode B (DELIVER_TOGETHER) fulfillment');
      assert.match(openapiContent, /platform_fee/i, 'Quote breakdown must include platform fee');
      assert.match(openapiContent, /packaging_fee/i, 'Quote breakdown must include packaging fee');
    });

    it('should specify Section 5A POST /v1/checkout/pay with Idempotency-Key and Razorpay payment order', () => {
      const openapiContent = getOpenApiContent();
      assert.match(openapiContent, /['"]?\/v1\/checkout\/pay['"]?:/, 'Must define /v1/checkout/pay path');
      assert.match(openapiContent, /Idempotency-Key/i, 'Checkout pay must require Idempotency-Key header');
      assert.match(openapiContent, /razorpay_order_id/i, 'Checkout pay response must return razorpay_order_id');
      assert.match(openapiContent, /order_group_id/i, 'Checkout pay response must return order_group_id');
    });

    it('should specify Section 5A GET /v1/orders/{orderGroupId} with sub-orders and delivery legs', () => {
      const openapiContent = getOpenApiContent();
      assert.match(openapiContent, /['"]?\/v1\/orders\/\{orderGroupId\}['"]?:/, 'Must define /v1/orders/{orderGroupId} path');
      assert.match(openapiContent, /sub_orders/i, 'Order group response must contain sub_orders');
      assert.match(openapiContent, /delivery_legs/i, 'Order group response must contain delivery_legs');
    });

    it('should specify Section 5A POST /v1/orders/{orderGroupId}/sub-orders/{subOrderId}/cancel for partial cancellation', () => {
      const openapiContent = getOpenApiContent();
      assert.match(
        openapiContent,
        /['"]?\/v1\/orders\/\{orderGroupId\}\/sub-orders\/\{subOrderId\}\/cancel['"]?:/,
        'Must define partial sub-order cancel path'
      );
      assert.match(openapiContent, /ORIGINAL_METHOD/i, 'Cancel must support refund to ORIGINAL_METHOD');
      assert.match(openapiContent, /WALLET/i, 'Cancel must support refund to WALLET');
    });

    it('should specify Section 5B PUT /v1/partner/mode with active job mutual exclusion', () => {
      const openapiContent = getOpenApiContent();
      assert.match(openapiContent, /['"]?\/v1\/partner\/mode['"]?:/, 'Must define /v1/partner/mode path');
      assert.match(openapiContent, /DELIVERIES_ONLY/i, 'Partner mode must include DELIVERIES_ONLY');
      assert.match(openapiContent, /RIDES_ONLY/i, 'Partner mode must include RIDES_ONLY');
      assert.match(openapiContent, /ALL_JOBS/i, 'Partner mode must include ALL_JOBS');
      assert.match(openapiContent, /409|conflict|active.*lock/i, 'Must specify 409 Conflict when switching mode with active conflicting job');
    });

    it('should specify Section 5B GET /v1/partner/jobs/feed for unified job-type-agnostic feed', () => {
      const openapiContent = getOpenApiContent();
      assert.match(openapiContent, /['"]?\/v1\/partner\/jobs\/feed['"]?:/, 'Must define /v1/partner/jobs/feed path');
      assert.match(openapiContent, /delivery_leg/i, 'Feed must handle delivery_leg job type');
      assert.match(openapiContent, /parcel/i, 'Feed must handle parcel job type');
      assert.match(openapiContent, /ride/i, 'Feed must handle ride job type');
      assert.match(openapiContent, /hire_booking/i, 'Feed must handle hire_booking job type');
    });

    it('should specify Section 5B POST /v1/partner/jobs/{id}/accept with 20s timeout constraint', () => {
      const openapiContent = getOpenApiContent();
      assert.match(openapiContent, /['"]?\/v1\/partner\/jobs\/\{id\}\/accept['"]?:/, 'Must define /v1/partner/jobs/{id}/accept path');
      assert.match(openapiContent, /20|timeout|expired/i, 'Job accept must document 20s acceptance timeout window');
    });

    it('should specify Section 5B POST /v1/partner/jobs/{id}/step for lifecycle step execution', () => {
      const openapiContent = getOpenApiContent();
      assert.match(openapiContent, /['"]?\/v1\/partner\/jobs\/\{id\}\/step['"]?:/, 'Must define /v1/partner/jobs/{id}/step path');
      assert.match(openapiContent, /otp|photo|proof|ARRIVED|PICKED_UP|DELIVERED/i, 'Job step must support verification proofs like OTP, photo, or status steps');
    });

    it('should specify Webhooks POST /v1/webhooks/razorpay with signature verification and idempotency', () => {
      const openapiContent = getOpenApiContent();
      assert.match(openapiContent, /['"]?\/v1\/webhooks\/razorpay['"]?:/, 'Must define /v1/webhooks/razorpay path');
      assert.match(openapiContent, /X-Razorpay-Signature/i, 'Razorpay webhook must require X-Razorpay-Signature header');
      assert.match(openapiContent, /payment\.captured/i, 'Razorpay webhook must document payment.captured event');
    });
  });

  describe('OpenAPI 3.1 Schema Completeness', () => {
    it('should define key Section 5A and 5B domain schemas', () => {
      const openapiContent = getOpenApiContent();
      const requiredSchemas = [
        'CheckoutQuoteRequest',
        'CheckoutQuoteResponse',
        'CheckoutPayRequest',
        'CheckoutPayResponse',
        'OrderGroup',
        'SubOrder',
        'DeliveryLeg',
        'FulfillmentMode',
        'PartnerJob',
        'PartnerMode',
        'ErrorResponse',
      ];

      for (const schema of requiredSchemas) {
        assert.match(openapiContent, new RegExp(`${schema}:`), `openapi.yaml must define schema ${schema}`);
      }
    });
  });

  describe('WebSocket Event Specifications (docs/api/websocket-events.md)', () => {
    it('should specify Socket.IO namespaces /tracking and /dispatch', () => {
      const wsDocContent = getWsDocContent();
      assert.match(wsDocContent, /\/tracking/, 'Must document /tracking namespace');
      assert.match(wsDocContent, /\/dispatch/, 'Must document /dispatch namespace');
    });

    it('should document Zero location writes to Firestore architecture invariant', () => {
      const wsDocContent = getWsDocContent();
      assert.match(
        wsDocContent,
        /zero\s+location\s+writes\s+to\s+firestore/i,
        'Must emphasize Zero location writes to Firestore invariant'
      );
      assert.match(wsDocContent, /Redis\s+GEO/i, 'Must reference Redis GEO indexing');
      assert.match(wsDocContent, /PostGIS/i, 'Must reference PostGIS batch persistence');
    });

    it('should specify all required real-time Socket.IO events with payloads and directions', () => {
      const wsDocContent = getWsDocContent();
      const requiredEvents = [
        'location:ping',
        'partner:location',
        'order:status_updated',
        'job:offer',
        'job:offer_timeout',
        'job:accepted',
        'route:deviation_detected',
      ];

      for (const eventName of requiredEvents) {
        assert.match(
          wsDocContent,
          new RegExp(`\`?${eventName.replace(':', '\\:')}\`?`),
          `websocket-events.md must document event ${eventName}`
        );
      }
    });

    it('should specify rate limits, adaptive ping cadence, and route deviation thresholds', () => {
      const wsDocContent = getWsDocContent();
      assert.match(wsDocContent, /3[-–\s]+5\s*s/i, 'Must specify 3-5s active partner GPS ping interval');
      assert.match(wsDocContent, /15[-–\s]+30\s*s/i, 'Must specify 15-30s idle partner GPS ping interval');
      assert.match(wsDocContent, /20\s*s/i, 'Must specify 20s job offer acceptance timeout');
      assert.match(wsDocContent, /100\s*m/i, 'Must specify 100m route deviation threshold');
      assert.match(wsDocContent, /60\s*s/i, 'Must specify 60s route deviation cooldown');
    });
  });
});
