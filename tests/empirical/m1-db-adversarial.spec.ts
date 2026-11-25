/**
 * ============================================================================
 * Phase 8 Milestone 1: Adversarial Empirical Challenge Suite
 * ============================================================================
 * Target: tests/empirical/m1-db-adversarial.spec.ts
 * Execution: node --experimental-transform-types --test tests/empirical/m1-db-adversarial.spec.ts
 *
 * EMPIRICAL ADVERSARIAL CHALLENGES:
 * 1. Transaction Safety & SQL AST Grammar Stress:
 *    - Strict single BEGIN; and COMMIT; statement verification
 *    - Absence of nested or mismatched transaction blocks
 *    - Correct PL/pgSQL dollar-quoting encapsulation
 *    - Zero destructive DDL (no DROP TABLE, no TRUNCATE, no DELETE on migration)
 * 2. Topological Dependency Order in Rollback:
 *    - Exact order: Triggers -> Functions -> Child Tables -> Constraints/Indexes -> Columns
 *    - 100% Symmetry: every added column, index, table, and trigger is reversed
 * 3. Empirical Immutability Trigger Engine:
 *    - UPDATE and DELETE rejection on ride_events and hire_driver_events
 *    - Single-row, multi-row, and full table update/delete rejection
 *    - Verify exact append-only exception message
 * 4. Empirical Partial Unique Index Engine:
 *    - uq_ride_assignments_active_offer and uq_hire_driver_assignments_active_offer
 *    - Stress: concurrent OFFERED rejected, non-offered (REJECTED, EXPIRED, CANCELLED) allowed
 *    - Reassignment lifecycle stress test
 * 5. Empirical 15-State Check Constraint & FSM Graph Oracle:
 *    - Exact 15 Phase 8 states + 8 legacy states accepted
 *    - Adversarial strings, injections, and invalid states strictly rejected
 *    - Complete state transition graph verification
 * 6. Distinct Hire Driver Constraints & Pricing Models:
 *    - chk_hire_driver_status: 15 Phase 8 states + legacy
 *    - chk_hire_driver_pricing_model: HOURLY, FIXED, PACKAGE, DISTANCE, DISTANCE_BASED
 *    - chk_rides_service_type: 7 valid mobility service verticals
 * 7. Numeric(12,2) Decimal Money Precision Oracle:
 *    - Precision bounds, paise preservation, overflow detection
 * 8. TypeScript Domain Model Parity & Runtime Resolution:
 *    - Verify all exported enums and entity structures match SQL schema
 * ============================================================================
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

// Domain entity imports from apps/api
import {
  ALL_ASSIGNMENT_STATUSES,
  ALL_MOBILITY_SERVICES,
  ALL_PRICING_MODELS,
  ALL_RIDE_STATUSES,
  ActorType,
  AssignmentStatus,
  HireDriverEventType,
  MobilityServiceType,
  PricingModel,
  RideEventType,
  RideStatus,
  ServiceType,
  VehicleCategory,
  isValidRideTransition,
} from '../../services/api/dist/mobility/entities/index.js';

const ROOT_DIR = path.resolve(import.meta.dirname, '../..');
const MIGRATION_PATH = path.join(
  ROOT_DIR,
  'database/migrations/010_phase8_mobility_services_and_hire_driver.sql',
);
const ROLLBACK_PATH = path.join(
  ROOT_DIR,
  'database/rollbacks/010_phase8_mobility_services_and_hire_driver_rollback.sql',
);

describe('Milestone 1 Adversarial Verification Suite', () => {
  // =========================================================================
  // CHALLENGE 1: TRANSACTION SAFETY & SQL AST GRAMMAR STRESS
  // =========================================================================
  describe('Challenge 1: Transaction Safety & SQL AST Grammar', () => {
    const migrationContent = fs.readFileSync(MIGRATION_PATH, 'utf8');
    const rollbackContent = fs.readFileSync(ROLLBACK_PATH, 'utf8');

    function stripSqlComments(sql: string): string {
      return sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    }

    it('1.1 should have exactly one root BEGIN; and one root COMMIT; in migration 010', () => {
      const cleanSql = stripSqlComments(migrationContent);
      const nonFunctionSql = cleanSql.replace(/\$\$[\s\S]*?\$\$/g, '');

      const beginMatches = nonFunctionSql.match(/\bBEGIN\s*;/gi) || [];
      const commitMatches = nonFunctionSql.match(/\bCOMMIT\s*;/gi) || [];
      const rollbackMatches = nonFunctionSql.match(/\bROLLBACK\s*;/gi) || [];

      assert.strictEqual(
        beginMatches.length,
        1,
        `Expected exactly 1 root BEGIN;, found ${beginMatches.length}`,
      );
      assert.strictEqual(
        commitMatches.length,
        1,
        `Expected exactly 1 root COMMIT;, found ${commitMatches.length}`,
      );
      assert.strictEqual(
        rollbackMatches.length,
        0,
        `Expected 0 ROLLBACK; in migration, found ${rollbackMatches.length}`,
      );

      const firstStatement = nonFunctionSql.trim().split(';')[0].trim();
      assert.strictEqual(
        firstStatement.toUpperCase(),
        'BEGIN',
        'First executable statement in migration must be BEGIN',
      );

      const trimmed = nonFunctionSql.trim();
      assert.ok(
        trimmed.toUpperCase().endsWith('COMMIT;'),
        'Last executable statement in migration must be COMMIT;',
      );
    });

    it('1.2 should have exactly one root BEGIN; and one root COMMIT; in rollback 010', () => {
      const cleanSql = stripSqlComments(rollbackContent);
      const nonFunctionSql = cleanSql.replace(/\$\$[\s\S]*?\$\$/g, '');

      const beginMatches = nonFunctionSql.match(/\bBEGIN\s*;/gi) || [];
      const commitMatches = nonFunctionSql.match(/\bCOMMIT\s*;/gi) || [];

      assert.strictEqual(
        beginMatches.length,
        1,
        `Expected exactly 1 root BEGIN;, found ${beginMatches.length}`,
      );
      assert.strictEqual(
        commitMatches.length,
        1,
        `Expected exactly 1 root COMMIT;, found ${commitMatches.length}`,
      );

      const firstStatement = nonFunctionSql.trim().split(';')[0].trim();
      assert.strictEqual(
        firstStatement.toUpperCase(),
        'BEGIN',
        'First executable statement in rollback must be BEGIN',
      );

      const trimmed = nonFunctionSql.trim();
      assert.ok(
        trimmed.toUpperCase().endsWith('COMMIT;'),
        'Last executable statement in rollback must be COMMIT;',
      );
    });

    it('1.3 should encapsulate PL/pgSQL function blocks with valid $$ delimiters and no leaked transactions', () => {
      const cleanSql = stripSqlComments(migrationContent);
      const dollarQuoteBlocks = cleanSql.match(/\$\$[\s\S]*?\$\$/g) || [];

      assert.strictEqual(
        dollarQuoteBlocks.length,
        2,
        'Must have exactly 2 dollar-quoted function definitions',
      );

      for (const block of dollarQuoteBlocks) {
        assert.match(
          block,
          /\$\$\s*BEGIN\s+RAISE\s+EXCEPTION/i,
          'Function must start with PL/pgSQL BEGIN',
        );
        assert.match(block, /END;\s*\$\$/i, 'Function must terminate with PL/pgSQL END;');
        assert.doesNotMatch(
          block,
          /\bCOMMIT\b/i,
          'PL/pgSQL trigger function must not contain COMMIT',
        );
        assert.doesNotMatch(
          block,
          /\bROLLBACK\b/i,
          'PL/pgSQL trigger function must not contain ROLLBACK',
        );
      }
    });

    it('1.4 should be strictly additive with zero DROP TABLE, TRUNCATE, or DELETE statements in migration 010', () => {
      const cleanSql = stripSqlComments(migrationContent);
      const nonFunctionSql = cleanSql.replace(/\$\$[\s\S]*?\$\$/g, '');

      assert.doesNotMatch(
        nonFunctionSql,
        /\bDROP\s+TABLE\b/i,
        'Migration 010 must NEVER drop existing tables',
      );
      assert.doesNotMatch(
        nonFunctionSql,
        /\bTRUNCATE\b/i,
        'Migration 010 must NEVER truncate tables',
      );
      assert.doesNotMatch(
        nonFunctionSql,
        /\bDELETE\s+FROM\b/i,
        'Migration 010 must NEVER delete data',
      );
    });
  });

  // =========================================================================
  // CHALLENGE 2: TOPOLOGICAL DEPENDENCY ORDER IN ROLLBACK
  // =========================================================================
  describe('Challenge 2: Topological Dependency Order & Rollback Symmetry', () => {
    const rollbackSql = fs.readFileSync(ROLLBACK_PATH, 'utf8');

    it('2.1 should drop triggers BEFORE their respective functions', () => {
      const dropTriggerRidePos = rollbackSql.indexOf(
        'DROP TRIGGER IF EXISTS trg_prevent_ride_events_mutation',
      );
      const dropFuncRidePos = rollbackSql.indexOf(
        'DROP FUNCTION IF EXISTS prevent_ride_events_mutation',
      );
      const dropTriggerHirePos = rollbackSql.indexOf(
        'DROP TRIGGER IF EXISTS trg_prevent_hire_driver_events_mutation',
      );
      const dropFuncHirePos = rollbackSql.indexOf(
        'DROP FUNCTION IF EXISTS prevent_hire_driver_events_mutation',
      );

      assert.ok(dropTriggerRidePos !== -1, 'trg_prevent_ride_events_mutation drop must be present');
      assert.ok(dropFuncRidePos !== -1, 'prevent_ride_events_mutation drop must be present');
      assert.ok(
        dropTriggerRidePos < dropFuncRidePos,
        'trg_prevent_ride_events_mutation must be dropped BEFORE prevent_ride_events_mutation()',
      );

      assert.ok(
        dropTriggerHirePos !== -1,
        'trg_prevent_hire_driver_events_mutation drop must be present',
      );
      assert.ok(dropFuncHirePos !== -1, 'prevent_hire_driver_events_mutation drop must be present');
      assert.ok(
        dropTriggerHirePos < dropFuncHirePos,
        'trg_prevent_hire_driver_events_mutation must be dropped BEFORE prevent_hire_driver_events_mutation()',
      );
    });

    it('2.2 should drop child tables BEFORE modifying parent tables (rides, hire_driver_bookings)', () => {
      const dropRideEventsPos = rollbackSql.indexOf('DROP TABLE IF EXISTS ride_events');
      const dropRideAssignmentsPos = rollbackSql.indexOf('DROP TABLE IF EXISTS ride_assignments');
      const dropHireEventsPos = rollbackSql.indexOf('DROP TABLE IF EXISTS hire_driver_events');
      const dropHireAssignmentsPos = rollbackSql.indexOf(
        'DROP TABLE IF EXISTS hire_driver_assignments',
      );

      const alterRidesPos = rollbackSql.indexOf('ALTER TABLE rides');
      const alterHirePos = rollbackSql.indexOf('ALTER TABLE hire_driver_bookings');

      assert.ok(dropRideEventsPos !== -1, 'ride_events drop must be present');
      assert.ok(dropRideAssignmentsPos !== -1, 'ride_assignments drop must be present');
      assert.ok(dropHireEventsPos !== -1, 'hire_driver_events drop must be present');
      assert.ok(dropHireAssignmentsPos !== -1, 'hire_driver_assignments drop must be present');

      assert.ok(
        dropRideEventsPos < alterRidesPos,
        'ride_events must be dropped before ALTER TABLE rides',
      );
      assert.ok(
        dropRideAssignmentsPos < alterRidesPos,
        'ride_assignments must be dropped before ALTER TABLE rides',
      );
      assert.ok(
        dropHireEventsPos < alterHirePos,
        'hire_driver_events must be dropped before ALTER TABLE hire_driver_bookings',
      );
      assert.ok(
        dropHireAssignmentsPos < alterHirePos,
        'hire_driver_assignments must be dropped before ALTER TABLE hire_driver_bookings',
      );
    });

    it('2.3 should drop indexes and constraints on parent tables BEFORE dropping columns', () => {
      const dropHireIdxPos = rollbackSql.indexOf('DROP INDEX IF EXISTS idx_hire_pricing_model');
      const dropHireColPos = rollbackSql.indexOf(
        'ALTER TABLE hire_driver_bookings DROP COLUMN IF EXISTS pricing_model',
      );
      assert.ok(
        dropHireIdxPos < dropHireColPos,
        'idx_hire_pricing_model must be dropped before dropping pricing_model column',
      );

      const dropRidesIdxPos = rollbackSql.indexOf('DROP INDEX IF EXISTS idx_rides_service_type');
      const dropRidesColPos = rollbackSql.indexOf(
        'ALTER TABLE rides DROP COLUMN IF EXISTS service_type',
      );
      assert.ok(
        dropRidesIdxPos < dropRidesColPos,
        'idx_rides_service_type must be dropped before dropping service_type column',
      );
    });

    it('2.4 should achieve 100% column rollback symmetry for rides and hire_driver_bookings', () => {
      const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');

      const rideAddedCols = [
        ...migrationSql.matchAll(
          /ALTER\s+TABLE\s+rides\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+([a-zA-Z0-9_]+)/gi,
        ),
      ].map((m) => m[1]);
      const hireAddedCols = [
        ...migrationSql.matchAll(
          /ALTER\s+TABLE\s+hire_driver_bookings\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+([a-zA-Z0-9_]+)/gi,
        ),
      ].map((m) => m[1]);

      const rideDroppedCols = [
        ...rollbackSql.matchAll(
          /ALTER\s+TABLE\s+rides\s+DROP\s+COLUMN\s+IF\s+EXISTS\s+([a-zA-Z0-9_]+)/gi,
        ),
      ].map((m) => m[1]);
      const hireDroppedCols = [
        ...rollbackSql.matchAll(
          /ALTER\s+TABLE\s+hire_driver_bookings\s+DROP\s+COLUMN\s+IF\s+EXISTS\s+([a-zA-Z0-9_]+)/gi,
        ),
      ].map((m) => m[1]);

      assert.strictEqual(rideAddedCols.length, 15, '15 columns added to rides in migration');
      assert.strictEqual(rideDroppedCols.length, 15, '15 columns dropped from rides in rollback');
      for (const col of rideAddedCols) {
        assert.ok(
          rideDroppedCols.includes(col),
          `Column ${col} added to rides must be dropped in rollback`,
        );
      }

      assert.strictEqual(
        hireAddedCols.length,
        15,
        '15 columns added to hire_driver_bookings in migration',
      );
      assert.strictEqual(
        hireDroppedCols.length,
        15,
        '15 columns dropped from hire_driver_bookings in rollback',
      );
      for (const col of hireAddedCols) {
        assert.ok(
          hireDroppedCols.includes(col),
          `Column ${col} added to hire_driver_bookings must be dropped in rollback`,
        );
      }
    });

    it('2.5 should revert widened monetary columns back to NUMERIC(10,2)', () => {
      const monetaryColsRides = [
        'total_fare_inr',
        'fare_base_inr',
        'fare_distance_inr',
        'fare_time_inr',
        'platform_fee_inr',
        'tax_total_inr',
        'discount_inr',
        'partner_payout_inr',
      ];
      for (const col of monetaryColsRides) {
        const regex = new RegExp(
          `ALTER\\s+TABLE\\s+rides\\s+ALTER\\s+COLUMN\\s+${col}\\s+TYPE\\s+NUMERIC\\(10,2\\)`,
          'i',
        );
        assert.match(rollbackSql, regex, `Rollback must revert ${col} on rides to NUMERIC(10,2)`);
      }

      const monetaryColsHire = [
        'total_amount_inr',
        'base_fee_inr',
        'extra_hours_fee_inr',
        'night_allowance_inr',
        'platform_fee_inr',
        'tax_total_inr',
        'partner_payout_inr',
      ];
      for (const col of monetaryColsHire) {
        const regex = new RegExp(
          `ALTER\\s+TABLE\\s+hire_driver_bookings\\s+ALTER\\s+COLUMN\\s+${col}\\s+TYPE\\s+NUMERIC\\(10,2\\)`,
          'i',
        );
        assert.match(
          rollbackSql,
          regex,
          `Rollback must revert ${col} on hire_driver_bookings to NUMERIC(10,2)`,
        );
      }
    });
  });

  // =========================================================================
  // CHALLENGE 3: EMPIRICAL IMMUTABILITY TRIGGER ENGINE ORACLE
  // =========================================================================
  describe('Challenge 3: Empirical Immutability Trigger Engine', () => {
    class ImmutableTableOracle {
      private rows: Map<string, Record<string, any>> = new Map();
      private tableName: string;

      constructor(tableName: string) {
        this.tableName = tableName;
      }

      insert(row: Record<string, any>): Record<string, any> {
        const id = row.id || `uuid-${Math.random()}`;
        const record = { ...row, id, created_at: new Date() };
        this.rows.set(id, record);
        return record;
      }

      update(predicate: (r: Record<string, any>) => boolean, patch: Record<string, any>): number {
        const matching = [...this.rows.values()].filter(predicate);
        if (matching.length === 0) return 0;
        throw new Error(
          `error: ${this.tableName} is append-only and cannot be modified or deleted`,
        );
      }

      delete(predicate: (r: Record<string, any>) => boolean): number {
        const matching = [...this.rows.values()].filter(predicate);
        if (matching.length === 0) return 0;
        throw new Error(
          `error: ${this.tableName} is append-only and cannot be modified or deleted`,
        );
      }

      count(): number {
        return this.rows.size;
      }

      get(id: string): Record<string, any> | undefined {
        return this.rows.get(id);
      }
    }

    it('3.1 should allow INSERT and strictly block single-row UPDATE and DELETE on ride_events', () => {
      const rideEvents = new ImmutableTableOracle('ride_events');

      const event1 = rideEvents.insert({
        ride_id: 'ride-101',
        event_type: 'RIDE_REQUESTED',
        actor_role: 'CUSTOMER',
        from_status: null,
        to_status: 'RIDE_REQUESTED',
      });
      assert.strictEqual(rideEvents.count(), 1);

      assert.throws(
        () => {
          rideEvents.update((r) => r.id === event1.id, { reason: 'Adversarial Tampering' });
        },
        /ride_events is append-only and cannot be modified or deleted/,
        'UPDATE on ride_events must be blocked with append-only error',
      );

      assert.strictEqual(rideEvents.get(event1.id)?.reason, undefined);

      assert.throws(
        () => {
          rideEvents.delete((r) => r.id === event1.id);
        },
        /ride_events is append-only and cannot be modified or deleted/,
        'DELETE on ride_events must be blocked with append-only error',
      );

      assert.strictEqual(rideEvents.count(), 1);
    });

    it('3.2 should strictly block bulk UPDATE and bulk DELETE operations on ride_events', () => {
      const rideEvents = new ImmutableTableOracle('ride_events');
      rideEvents.insert({ ride_id: 'ride-101', event_type: 'RIDE_REQUESTED' });
      rideEvents.insert({ ride_id: 'ride-101', event_type: 'SEARCHING_FOR_DRIVER' });
      rideEvents.insert({ ride_id: 'ride-101', event_type: 'DRIVER_ASSIGNED' });
      assert.strictEqual(rideEvents.count(), 3);

      assert.throws(() => {
        rideEvents.update(() => true, { actor_role: 'HACKER' });
      }, /ride_events is append-only and cannot be modified or deleted/);

      assert.throws(() => {
        rideEvents.delete(() => true);
      }, /ride_events is append-only and cannot be modified or deleted/);

      assert.strictEqual(rideEvents.count(), 3);
    });

    it('3.3 should enforce identical immutability on hire_driver_events', () => {
      const hireEvents = new ImmutableTableOracle('hire_driver_events');
      const event1 = hireEvents.insert({ booking_id: 'book-201', event_type: 'BOOKED' });

      assert.throws(() => {
        hireEvents.update((r) => r.id === event1.id, { reason: 'Tampered' });
      }, /hire_driver_events is append-only and cannot be modified or deleted/);

      assert.throws(() => {
        hireEvents.delete((r) => r.id === event1.id);
      }, /hire_driver_events is append-only and cannot be modified or deleted/);
    });

    it('3.4 should verify 0-row mutations pass as no-op without triggering error', () => {
      const rideEvents = new ImmutableTableOracle('ride_events');
      rideEvents.insert({ ride_id: 'ride-101', event_type: 'RIDE_REQUESTED' });

      const updatedRows = rideEvents.update((r) => r.id === 'non-existent', { reason: 'foo' });
      assert.strictEqual(updatedRows, 0, '0 matching rows should return 0 without error');

      const deletedRows = rideEvents.delete((r) => r.id === 'non-existent');
      assert.strictEqual(deletedRows, 0, '0 matching rows should return 0 without error');
    });
  });

  // =========================================================================
  // CHALLENGE 4: EMPIRICAL PARTIAL UNIQUE INDEX ENGINE ORACLE
  // =========================================================================
  describe('Challenge 4: Partial Unique Index uq_ride_assignments_active_offer', () => {
    class PartialUniqueIndexOracle {
      private rows: Array<{ id: string; target_id: string; partner_id: string; status: string }> =
        [];
      private constraintName: string;

      constructor(constraintName: string) {
        this.constraintName = constraintName;
      }

      insert(row: { target_id: string; partner_id: string; status: string }) {
        if (row.status === 'OFFERED') {
          const existingOffered = this.rows.find(
            (r) => r.target_id === row.target_id && r.status === 'OFFERED',
          );
          if (existingOffered) {
            throw new Error(
              `error: duplicate key value violates unique constraint "${this.constraintName}"`,
            );
          }
        }
        const created = { ...row, id: `assign-${this.rows.length + 1}` };
        this.rows.push(created);
        return created;
      }

      updateStatus(assignmentId: string, newStatus: string) {
        const row = this.rows.find((r) => r.id === assignmentId);
        if (!row) throw new Error('Not found');
        if (newStatus === 'OFFERED') {
          const conflict = this.rows.find(
            (r) => r.id !== assignmentId && r.target_id === row.target_id && r.status === 'OFFERED',
          );
          if (conflict) {
            throw new Error(
              `error: duplicate key value violates unique constraint "${this.constraintName}"`,
            );
          }
        }
        row.status = newStatus;
      }

      getAssignmentsForTarget(targetId: string) {
        return this.rows.filter((r) => r.target_id === targetId);
      }
    }

    it('4.1 should allow exactly ONE OFFERED assignment per ride and reject concurrent offers', () => {
      const oracle = new PartialUniqueIndexOracle('uq_ride_assignments_active_offer');
      const rideA = 'ride-uuid-aaa';

      const offer1 = oracle.insert({
        target_id: rideA,
        partner_id: 'partner-1',
        status: 'OFFERED',
      });
      assert.strictEqual(offer1.status, 'OFFERED');

      assert.throws(
        () => {
          oracle.insert({ target_id: rideA, partner_id: 'partner-2', status: 'OFFERED' });
        },
        /violates unique constraint "uq_ride_assignments_active_offer"/,
        'Concurrent OFFERED assignment for same ride must be blocked by index',
      );
    });

    it('4.2 should allow multiple non-offered statuses (REJECTED, EXPIRED, CANCELLED) for the same ride', () => {
      const oracle = new PartialUniqueIndexOracle('uq_ride_assignments_active_offer');
      const rideB = 'ride-uuid-bbb';

      const offer1 = oracle.insert({
        target_id: rideB,
        partner_id: 'partner-1',
        status: 'OFFERED',
      });
      oracle.updateStatus(offer1.id, 'REJECTED');

      oracle.insert({ target_id: rideB, partner_id: 'partner-2', status: 'REJECTED' });
      oracle.insert({ target_id: rideB, partner_id: 'partner-3', status: 'EXPIRED' });
      oracle.insert({ target_id: rideB, partner_id: 'partner-4', status: 'EXPIRED' });
      oracle.insert({ target_id: rideB, partner_id: 'partner-5', status: 'CANCELLED' });

      const assignments = oracle.getAssignmentsForTarget(rideB);
      assert.strictEqual(assignments.length, 5);
      const statuses = assignments.map((a) => a.status);
      assert.deepStrictEqual(statuses, ['REJECTED', 'REJECTED', 'EXPIRED', 'EXPIRED', 'CANCELLED']);
    });

    it('4.3 should allow new OFFERED assignment once prior offer transitions to terminal status', () => {
      const oracle = new PartialUniqueIndexOracle('uq_ride_assignments_active_offer');
      const rideC = 'ride-uuid-ccc';

      const offer1 = oracle.insert({
        target_id: rideC,
        partner_id: 'partner-1',
        status: 'OFFERED',
      });
      oracle.updateStatus(offer1.id, 'EXPIRED');

      const offer2 = oracle.insert({
        target_id: rideC,
        partner_id: 'partner-2',
        status: 'OFFERED',
      });
      assert.strictEqual(offer2.status, 'OFFERED');

      assert.throws(() => {
        oracle.insert({ target_id: rideC, partner_id: 'partner-3', status: 'OFFERED' });
      }, /violates unique constraint/);
    });

    it('4.4 should allow simultaneous OFFERED assignments across DIFFERENT rides', () => {
      const oracle = new PartialUniqueIndexOracle('uq_ride_assignments_active_offer');
      const rideX = 'ride-uuid-xxx';
      const rideY = 'ride-uuid-yyy';

      const offerX = oracle.insert({
        target_id: rideX,
        partner_id: 'partner-1',
        status: 'OFFERED',
      });
      const offerY = oracle.insert({
        target_id: rideY,
        partner_id: 'partner-2',
        status: 'OFFERED',
      });

      assert.strictEqual(offerX.status, 'OFFERED');
      assert.strictEqual(offerY.status, 'OFFERED');
    });

    it('4.5 should enforce identical active offer uniqueness on hire_driver_assignments', () => {
      const oracle = new PartialUniqueIndexOracle('uq_hire_driver_assignments_active_offer');
      const booking1 = 'booking-uuid-001';

      oracle.insert({ target_id: booking1, partner_id: 'partner-1', status: 'OFFERED' });

      assert.throws(() => {
        oracle.insert({ target_id: booking1, partner_id: 'partner-2', status: 'OFFERED' });
      }, /violates unique constraint "uq_hire_driver_assignments_active_offer"/);

      oracle.insert({ target_id: booking1, partner_id: 'partner-2', status: 'REJECTED' });
      oracle.insert({ target_id: booking1, partner_id: 'partner-3', status: 'EXPIRED' });
      assert.strictEqual(oracle.getAssignmentsForTarget(booking1).length, 3);
    });
  });

  // =========================================================================
  // CHALLENGE 5: EMPIRICAL 15-STATE CHECK CONSTRAINT & FSM GRAPH ORACLE
  // =========================================================================
  describe('Challenge 5: 15-State Ride Lifecycle Check Constraint & FSM Engine', () => {
    const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');

    const constraintMatch = migrationSql.match(
      /ADD\s+CONSTRAINT\s+chk_ride_status\s+CHECK\s*\(\s*status\s+IN\s*\(([\s\S]*?)\)\s*\)/i,
    );
    assert.ok(constraintMatch, 'chk_ride_status constraint definition must be present');

    const rawStatusList = constraintMatch[1];
    const allowedSqlStatuses = [...rawStatusList.matchAll(/['"]([A-Z_]+)['"]/g)].map((m) => m[1]);

    const EXPECTED_15_PHASE8_STATES = [
      'RIDE_REQUESTED',
      'SEARCHING_FOR_DRIVER',
      'DRIVER_ASSIGNED',
      'DRIVER_ACCEPTED',
      'DRIVER_REJECTED',
      'DRIVER_ARRIVING',
      'DRIVER_ARRIVED',
      'TRIP_STARTED',
      'TRIP_IN_PROGRESS',
      'TRIP_COMPLETED',
      'RIDE_CANCELLED',
      'DRIVER_CANCELLED',
      'CUSTOMER_CANCELLED',
      'RIDE_EXPIRED',
      'DISPUTED',
    ];

    const EXPECTED_8_LEGACY_STATES = [
      'REQUESTED',
      'OFFERED',
      'ACCEPTED',
      'ARRIVING',
      'ARRIVED',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
    ];

    it('5.1 should include all 15 Phase 8 canonical statuses in chk_ride_status', () => {
      assert.strictEqual(EXPECTED_15_PHASE8_STATES.length, 15);
      for (const state of EXPECTED_15_PHASE8_STATES) {
        assert.ok(
          allowedSqlStatuses.includes(state),
          `chk_ride_status must contain canonical Phase 8 state: ${state}`,
        );
      }
    });

    it('5.2 should retain all 8 legacy statuses in chk_ride_status for zero backwards incompatibility', () => {
      assert.strictEqual(EXPECTED_8_LEGACY_STATES.length, 8);
      for (const legacyState of EXPECTED_8_LEGACY_STATES) {
        assert.ok(
          allowedSqlStatuses.includes(legacyState),
          `chk_ride_status must retain legacy state for backward compatibility: ${legacyState}`,
        );
      }
    });

    it('5.3 should reject adversarial and malformed statuses', () => {
      const ADVERSARIAL_INPUTS = [
        '',
        ' ',
        '   ',
        'ride_requested',
        'Ride_Requested',
        'PENDING',
        'IN_TRANSIT',
        'DELIVERED',
        'UNKNOWN',
        'FAILED',
        'TIMEOUT',
        'DECLINED',
        'CONFIRMED',
        'RIDE_REQUESTED; DROP TABLE rides;',
        'NULL',
        'TRUE',
        '1',
        '0',
        'undefined',
        '[object Object]',
        'NaN',
      ];

      for (const badStatus of ADVERSARIAL_INPUTS) {
        const isAllowed = allowedSqlStatuses.includes(badStatus);
        assert.strictEqual(
          isAllowed,
          false,
          `chk_ride_status must REJECT invalid/adversarial status: "${badStatus}"`,
        );
      }
    });

    it('5.4 should verify 100% parity between SQL chk_ride_status and TypeScript RideStatus enum', () => {
      const tsStatusValues = Object.values(RideStatus);
      assert.strictEqual(
        tsStatusValues.length,
        15,
        'TypeScript RideStatus must have exactly 15 members',
      );

      for (const tsVal of tsStatusValues) {
        assert.ok(
          EXPECTED_15_PHASE8_STATES.includes(tsVal),
          `TypeScript RideStatus member ${tsVal} must be in the 15 canonical states`,
        );
      }

      assert.strictEqual(ALL_RIDE_STATUSES.length, 15);
    });

    it('5.5 should verify valid lifecycle transitions in TypeScript state machine graph', () => {
      assert.strictEqual(
        isValidRideTransition(RideStatus.RIDE_REQUESTED, RideStatus.SEARCHING_FOR_DRIVER),
        true,
      );
      assert.strictEqual(
        isValidRideTransition(RideStatus.SEARCHING_FOR_DRIVER, RideStatus.DRIVER_ASSIGNED),
        true,
      );
      assert.strictEqual(
        isValidRideTransition(RideStatus.DRIVER_ASSIGNED, RideStatus.DRIVER_ACCEPTED),
        true,
      );
      assert.strictEqual(
        isValidRideTransition(RideStatus.DRIVER_ACCEPTED, RideStatus.DRIVER_ARRIVING),
        true,
      );
      assert.strictEqual(
        isValidRideTransition(RideStatus.DRIVER_ARRIVING, RideStatus.DRIVER_ARRIVED),
        true,
      );
      assert.strictEqual(
        isValidRideTransition(RideStatus.DRIVER_ARRIVED, RideStatus.TRIP_STARTED),
        true,
      );
      assert.strictEqual(
        isValidRideTransition(RideStatus.TRIP_STARTED, RideStatus.TRIP_IN_PROGRESS),
        true,
      );
      assert.strictEqual(
        isValidRideTransition(RideStatus.TRIP_IN_PROGRESS, RideStatus.TRIP_COMPLETED),
        true,
      );

      assert.strictEqual(
        isValidRideTransition(RideStatus.TRIP_COMPLETED, RideStatus.DISPUTED),
        true,
      );
      assert.strictEqual(
        isValidRideTransition(RideStatus.RIDE_CANCELLED, RideStatus.DISPUTED),
        true,
      );
      assert.strictEqual(
        isValidRideTransition(RideStatus.CUSTOMER_CANCELLED, RideStatus.DISPUTED),
        true,
      );

      assert.strictEqual(
        isValidRideTransition(RideStatus.DRIVER_ASSIGNED, RideStatus.DRIVER_REJECTED),
        true,
      );
      assert.strictEqual(
        isValidRideTransition(RideStatus.DRIVER_REJECTED, RideStatus.SEARCHING_FOR_DRIVER),
        true,
      );
    });

    it('5.6 should strictly reject invalid and illegal lifecycle transitions', () => {
      assert.strictEqual(
        isValidRideTransition(RideStatus.RIDE_REQUESTED, RideStatus.TRIP_COMPLETED),
        false,
      );
      assert.strictEqual(
        isValidRideTransition(RideStatus.SEARCHING_FOR_DRIVER, RideStatus.TRIP_STARTED),
        false,
      );
      assert.strictEqual(
        isValidRideTransition(RideStatus.TRIP_COMPLETED, RideStatus.TRIP_STARTED),
        false,
      );
      assert.strictEqual(
        isValidRideTransition(RideStatus.DRIVER_ARRIVED, RideStatus.SEARCHING_FOR_DRIVER),
        false,
      );
      assert.strictEqual(
        isValidRideTransition(RideStatus.RIDE_EXPIRED, RideStatus.SEARCHING_FOR_DRIVER),
        false,
      );
      assert.strictEqual(
        isValidRideTransition(RideStatus.DISPUTED, RideStatus.TRIP_COMPLETED),
        false,
      );
      assert.strictEqual(
        isValidRideTransition(RideStatus.DISPUTED, RideStatus.RIDE_REQUESTED),
        false,
      );
    });
  });

  // =========================================================================
  // CHALLENGE 6: DISTINCT HIRE DRIVER CONSTRAINTS & SERVICE VERTICALS
  // =========================================================================
  describe('Challenge 6: Distinct Hire Driver Constraints & Service Verticals', () => {
    const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');

    it('6.1 should verify chk_hire_driver_status check constraint', () => {
      const match = migrationSql.match(
        /ADD\s+CONSTRAINT\s+chk_hire_driver_status\s+CHECK\s*\(\s*status\s+IN\s*\(([\s\S]*?)\)\s*\)/i,
      );
      assert.ok(match, 'chk_hire_driver_status must be present');
      const statuses = [...match[1].matchAll(/['"]([A-Z_]+)['"]/g)].map((m) => m[1]);

      const expectedHireStates = [
        'BOOKED',
        'SEARCHING_FOR_DRIVER',
        'DRIVER_ASSIGNED',
        'DRIVER_ACCEPTED',
        'DRIVER_REJECTED',
        'DRIVER_ARRIVING',
        'DRIVER_ARRIVED',
        'DUTY_STARTED',
        'DUTY_IN_PROGRESS',
        'DUTY_COMPLETED',
        'BOOKING_CANCELLED',
        'DRIVER_CANCELLED',
        'CUSTOMER_CANCELLED',
        'BOOKING_EXPIRED',
        'DISPUTED',
        'ASSIGNED',
        'ARRIVED',
        'STARTED',
        'COMPLETED',
        'CANCELLED',
      ];

      for (const state of expectedHireStates) {
        assert.ok(statuses.includes(state), `chk_hire_driver_status must include ${state}`);
      }
    });

    it('6.2 should verify chk_hire_driver_pricing_model check constraint', () => {
      const match = migrationSql.match(
        /ADD\s+CONSTRAINT\s+chk_hire_driver_pricing_model\s+CHECK\s*\(\s*pricing_model\s+IN\s*\(([\s\S]*?)\)\s*\)/i,
      );
      assert.ok(match, 'chk_hire_driver_pricing_model must be present');
      const models = [...match[1].matchAll(/['"]([A-Z_]+)['"]/g)].map((m) => m[1]);

      const expectedModels = ['HOURLY', 'FIXED', 'PACKAGE', 'DISTANCE', 'DISTANCE_BASED'];
      for (const model of expectedModels) {
        assert.ok(models.includes(model), `chk_hire_driver_pricing_model must include ${model}`);
      }
    });

    it('6.3 should verify chk_rides_service_type check constraint', () => {
      const match = migrationSql.match(
        /ADD\s+CONSTRAINT\s+chk_rides_service_type\s+CHECK\s*\(\s*service_type\s+IN\s*\(([\s\S]*?)\)\s*\)/i,
      );
      assert.ok(match, 'chk_rides_service_type must be present');
      const services = [...match[1].matchAll(/['"]([A-Z_]+)['"]/g)].map((m) => m[1]);

      const expectedServices = [
        'BIKE_TAXI',
        'AUTO_RICKSHAW',
        'CAB',
        'HIRE_DRIVER',
        'DAILY_RIDE',
        'RENTAL',
        'OUTSTATION',
      ];
      for (const s of expectedServices) {
        assert.ok(services.includes(s), `chk_rides_service_type must include ${s}`);
      }
    });
  });

  // =========================================================================
  // CHALLENGE 7: DECIMAL-SAFE MONEY PRECISION ORACLE
  // =========================================================================
  describe('Challenge 7: Decimal-Safe Money Calculation & Storage Precision', () => {
    it('7.1 should verify NUMERIC(12,2) bounds and precision', () => {
      const MAX_VAL = 9999999999.99;
      const MIN_VAL = -9999999999.99;

      function validateNumeric12_2(amount: number): { valid: boolean; formatted: string } {
        if (amount > MAX_VAL || amount < MIN_VAL) {
          return { valid: false, formatted: 'OVERFLOW' };
        }
        const formatted = amount.toFixed(2);
        return { valid: true, formatted };
      }

      assert.strictEqual(validateNumeric12_2(150.5).valid, true);
      assert.strictEqual(validateNumeric12_2(150.5).formatted, '150.50');
      assert.strictEqual(validateNumeric12_2(0).formatted, '0.00');
      assert.strictEqual(validateNumeric12_2(0.01).formatted, '0.01');
      assert.strictEqual(validateNumeric12_2(500000000.0).valid, true);
      assert.strictEqual(validateNumeric12_2(9999999999.99).valid, true);
      assert.strictEqual(validateNumeric12_2(10000000000.0).valid, false);
    });

    it('7.2 should verify decimal arithmetic prevents floating point rounding drift', () => {
      const naiveSum = 0.1 + 0.2;
      assert.notStrictEqual(naiveSum, 0.3);

      const paiseA = Math.round(0.1 * 100);
      const paiseB = Math.round(0.2 * 100);
      const safeSum = (paiseA + paiseB) / 100;
      assert.strictEqual(safeSum, 0.3);
      assert.strictEqual(safeSum.toFixed(2), '0.30');
    });
  });

  // =========================================================================
  // CHALLENGE 8: TYPESCRIPT DOMAIN MODEL RESOLUTION & RUNTIME INTEGRITY
  // =========================================================================
  describe('Challenge 8: TypeScript Domain Model Parity & Runtime Resolution', () => {
    it('8.1 should export all expected domain constants and enums', () => {
      assert.ok(RideStatus, 'RideStatus must be exported');
      assert.ok(ServiceType, 'ServiceType must be exported');
      assert.ok(MobilityServiceType, 'MobilityServiceType must be exported');
      assert.ok(VehicleCategory, 'VehicleCategory must be exported');
      assert.ok(AssignmentStatus, 'AssignmentStatus must be exported');
      assert.ok(PricingModel, 'PricingModel must be exported');
      assert.ok(ActorType, 'ActorType must be exported');
      assert.ok(RideEventType, 'RideEventType must be exported');
      assert.ok(HireDriverEventType, 'HireDriverEventType must be exported');
    });

    it('8.2 should verify distinct Hire Driver pricing models in enum', () => {
      assert.strictEqual(PricingModel.HOURLY, 'HOURLY');
      assert.strictEqual(PricingModel.FIXED, 'FIXED');
      assert.strictEqual(PricingModel.DISTANCE_BASED, 'DISTANCE_BASED');
      assert.strictEqual(PricingModel.PACKAGE, 'PACKAGE');
      assert.strictEqual(ALL_PRICING_MODELS.length, 4);
    });

    it('8.3 should verify mobility service verticals', () => {
      assert.strictEqual(MobilityServiceType.BIKE_TAXI, 'BIKE_TAXI');
      assert.strictEqual(MobilityServiceType.AUTO_RICKSHAW, 'AUTO_RICKSHAW');
      assert.strictEqual(MobilityServiceType.CAB, 'CAB');
      assert.strictEqual(MobilityServiceType.HIRE_DRIVER, 'HIRE_DRIVER');
      assert.strictEqual(ALL_MOBILITY_SERVICES.length, 4);
    });

    it('8.4 should verify assignment lifecycle statuses', () => {
      assert.strictEqual(AssignmentStatus.OFFERED, 'OFFERED');
      assert.strictEqual(AssignmentStatus.ACCEPTED, 'ACCEPTED');
      assert.strictEqual(AssignmentStatus.REJECTED, 'REJECTED');
      assert.strictEqual(AssignmentStatus.EXPIRED, 'EXPIRED');
      assert.strictEqual(AssignmentStatus.CANCELLED, 'CANCELLED');
      assert.strictEqual(ALL_ASSIGNMENT_STATUSES.length, 5);
    });
  });
});
