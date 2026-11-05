import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT_DIR = path.resolve(import.meta.dirname, '../../');
const DOCS_DIR = path.join(ROOT_DIR, 'docs/architecture');

describe('System Architecture & Flow Specification Documentation Validation', () => {
  describe('File Existence', () => {
    const requiredDocs = [
      'system-architecture.md',
      'fulfillment-engine.md',
      'partner-continuity.md',
    ];

    for (const doc of requiredDocs) {
      it(`should have documentation file: docs/architecture/${doc}`, () => {
        const filePath = path.join(DOCS_DIR, doc);
        assert.ok(fs.existsSync(filePath), `docs/architecture/${doc} must exist`);
      });
    }
  });

  describe('docs/architecture/system-architecture.md Content & Diagrams', () => {
    it('should contain microservices layout, Direct VPC egress, and real-time Socket.IO/Redis flow', () => {
      const filePath = path.join(DOCS_DIR, 'system-architecture.md');
      assert.ok(fs.existsSync(filePath), 'system-architecture.md must exist');
      const content = fs.readFileSync(filePath, 'utf-8');

      // Microservices & infrastructure topics
      assert.match(content, /Cloud Run/i, 'Must reference Cloud Run microservices layout');
      assert.match(content, /api/i, 'Must reference api service');
      assert.match(content, /dispatch/i, 'Must reference dispatch service');
      assert.match(content, /webhooks/i, 'Must reference webhooks service');
      assert.match(content, /Direct VPC Egress/i, 'Must reference Direct VPC Egress');
      assert.match(content, /Redis GEO/i, 'Must reference Redis GEO');
      assert.match(content, /Socket\.IO/i, 'Must reference Socket.IO');
      assert.match(content, /PostGIS/i, 'Must reference PostGIS batch persistence');

      // Required Mermaid diagram: Real-time Socket.IO/Redis data flow
      assert.match(content, /```mermaid/, 'Must contain at least one mermaid code block');
      assert.match(
        content,
        /```mermaid[\s\S]*?(?:sequenceDiagram|flowchart|graph)[\s\S]*?(?:Redis|Socket\.IO|GEO)[\s\S]*?```/,
        'Must contain a mermaid diagram detailing Socket.IO / Redis real-time data flow'
      );
    });
  });

  describe('docs/architecture/fulfillment-engine.md Content & Diagrams', () => {
    it('should contain checkout_session sequence and Mode A vs Mode B state machines', () => {
      const filePath = path.join(DOCS_DIR, 'fulfillment-engine.md');
      assert.ok(fs.existsSync(filePath), 'fulfillment-engine.md must exist');
      const content = fs.readFileSync(filePath, 'utf-8');

      // Core architectural rules
      assert.match(content, /FulfillmentStrategyEngine/i, 'Must specify FulfillmentStrategyEngine interface');
      assert.match(content, /Mode A/i, 'Must specify Mode A');
      assert.match(content, /Mode B/i, 'Must specify Mode B');
      assert.match(content, /1\.5\s*km/i, 'Must specify proximity gating (1.5 km)');
      assert.match(content, /JIT|Just-in-Time/i, 'Must specify JIT dispatch');
      assert.match(content, /unbatch/i, 'Must specify dynamic unbatching fallback on delay');
      assert.match(content, /perishab/i, 'Must specify perishability pickup sequencing (grocery last)');
      assert.match(content, /refund/i, 'Must specify merchant rejection/cancellation refund handling');

      // Required Mermaid diagrams:
      // 1. checkout_session sequence
      assert.match(
        content,
        /```mermaid[\s\S]*?sequenceDiagram[\s\S]*?checkout_session[\s\S]*?```/,
        'Must contain mermaid sequenceDiagram for checkout_session decomposition'
      );

      // 2. Mode A vs Mode B lifecycle / state machines
      assert.match(
        content,
        /```mermaid[\s\S]*?(?:stateDiagram|flowchart|graph)[\s\S]*?(?:Mode A|SEPARATE)[\s\S]*?```/i,
        'Must contain mermaid diagram for Mode A and Mode B fulfillment states'
      );
    });
  });

  describe('docs/architecture/partner-continuity.md Content & Diagrams', () => {
    it('should contain Section 5B partner feed, mode switcher, and mutual exclusion guard', () => {
      const filePath = path.join(DOCS_DIR, 'partner-continuity.md');
      assert.ok(fs.existsSync(filePath), 'partner-continuity.md must exist');
      const content = fs.readFileSync(filePath, 'utf-8');

      // Section 5B requirements
      assert.match(content, /unified/i, 'Must describe unified partner feed');
      assert.match(content, /mode switcher/i, 'Must specify partner mode switcher');
      assert.match(content, /mutual exclusion/i, 'Must specify strict safety mutual exclusion');
      assert.match(content, /cross-sell/i, 'Must specify post-delivery customer cross-sells');
      assert.match(content, /deadhead|chaining/i, 'Must specify proximity next-job chaining');

      // Required Mermaid diagram: Partner mutual exclusion guard
      assert.match(
        content,
        /```mermaid[\s\S]*?(?:stateDiagram|flowchart|graph)[\s\S]*?mutual exclusion[\s\S]*?```/i,
        'Must contain mermaid diagram for partner mutual exclusion safety guard'
      );
    });
  });
});
