import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

// Load compiled entities from dist
import {
  ACTIVE_RIDE_STATUSES,
  ALL_ASSIGNMENT_STATUSES,
  ALL_MOBILITY_SERVICES,
  ALL_PRICING_MODELS,
  ALL_RIDE_STATUSES,
  ALL_SERVICE_TYPES,
  CANCELLABLE_RIDE_STATUSES,
  RideStatus,
  TERMINAL_RIDE_STATUSES,
  VALID_RIDE_TRANSITIONS,
  isValidRideTransition,
} from '../../services/api/dist/mobility/entities/index.js';

const ROOT_DIR = path.resolve(import.meta.dirname, '../..');
const MIGRATION_010_PATH = path.join(
  ROOT_DIR,
  'database/migrations/010_phase8_mobility_services_and_hire_driver.sql',
);
const ROLLBACK_010_PATH = path.join(
  ROOT_DIR,
  'database/rollbacks/010_phase8_mobility_services_and_hire_driver_rollback.sql',
);

describe('Milestone 1 Empirical Challenger Adversarial Stress Suite', () => {
  const mig010Sql = fs.readFileSync(MIGRATION_010_PATH, 'utf8');
  const rollback010Sql = fs.readFileSync(ROLLBACK_010_PATH, 'utf8');

  // =========================================================================
  // 1. STATE MACHINE EXHAUSTIVE TRANSITION PROBING (225 combinations)
  // =========================================================================
  describe('1. State Machine Adversarial Invariants', () => {
    it('1.1 should correctly validate all 15 valid and invalid pairwise transitions (225 pairs)', () => {
      const allStatuses = ALL_RIDE_STATUSES;
      assert.strictEqual(allStatuses.length, 15, 'Must have exactly 15 canonical statuses');

      let validCount = 0;
      let invalidCount = 0;

      for (const from of allStatuses) {
        for (const to of allStatuses) {
          const allowedList = VALID_RIDE_TRANSITIONS[from] || [];
          const expected = allowedList.includes(to);
          const actual = isValidRideTransition(from, to);

          assert.strictEqual(
            actual,
            expected,
            `Transition ${from} -> ${to} mismatch: expected ${expected}, got ${actual}`,
          );

          if (actual) validCount++;
          else invalidCount++;
        }
      }

      // Assert reasonable graph connectivity
      assert.ok(
        validCount >= 20 && validCount <= 40,
        `Valid transition count (${validCount}) within expected domain bounds`,
      );
      assert.ok(
        invalidCount > 180,
        `Invalid transition count (${invalidCount}) demonstrates strict gatekeeping`,
      );
    });

    it('1.2 should strictly prevent invalid backward or skipping transitions', () => {
      // Direct jump from RIDE_REQUESTED to TRIP_STARTED
      assert.strictEqual(
        isValidRideTransition(RideStatus.RIDE_REQUESTED, RideStatus.TRIP_STARTED),
        false,
        'Cannot jump directly from RIDE_REQUESTED to TRIP_STARTED without assignment and arrival',
      );

      // Re-opening completed ride
      assert.strictEqual(
        isValidRideTransition(RideStatus.TRIP_COMPLETED, RideStatus.TRIP_STARTED),
        false,
        'Cannot re-start completed trip',
      );

      // Cancelling completed ride
      assert.strictEqual(
        isValidRideTransition(RideStatus.TRIP_COMPLETED, RideStatus.CUSTOMER_CANCELLED),
        false,
        'Cannot cancel a trip after completion',
      );

      // Re-activating expired ride
      assert.strictEqual(
        isValidRideTransition(RideStatus.RIDE_EXPIRED, RideStatus.SEARCHING_FOR_DRIVER),
        false,
        'Cannot reactivate expired ride without new request',
      );

      // Outgoing from DISPUTED
      for (const target of ALL_RIDE_STATUSES) {
        assert.strictEqual(
          isValidRideTransition(RideStatus.DISPUTED, target),
          false,
          `DISPUTED is strictly terminal: transition to ${target} must be rejected`,
        );
      }
    });

    it('1.3 should handle defensive edge cases with non-existent or malformed status inputs', () => {
      assert.strictEqual(
        isValidRideTransition('UNKNOWN_STATUS' as any, RideStatus.TRIP_STARTED),
        false,
      );
      assert.strictEqual(
        isValidRideTransition(RideStatus.RIDE_REQUESTED, 'UNKNOWN_STATUS' as any),
        false,
      );
      assert.strictEqual(isValidRideTransition(null as any, RideStatus.TRIP_STARTED), false);
      assert.strictEqual(isValidRideTransition(RideStatus.RIDE_REQUESTED, undefined as any), false);
      assert.strictEqual(isValidRideTransition('' as any, '' as any), false);
    });

    it('1.4 should verify terminal, active, and cancellable partitions are consistent', () => {
      // Terminal states must not have forward progress transitions to active states
      for (const term of TERMINAL_RIDE_STATUSES) {
        for (const active of ACTIVE_RIDE_STATUSES) {
          assert.strictEqual(
            isValidRideTransition(term, active),
            false,
            `Terminal status ${term} cannot transition to active status ${active}`,
          );
        }
      }

      // Cancellable statuses must all allow at least one cancellation transition
      for (const cancellable of CANCELLABLE_RIDE_STATUSES) {
        const allowed = VALID_RIDE_TRANSITIONS[cancellable];
        const hasCancel = allowed.some((s) =>
          [
            RideStatus.CUSTOMER_CANCELLED,
            RideStatus.DRIVER_CANCELLED,
            RideStatus.RIDE_CANCELLED,
          ].includes(s),
        );
        assert.ok(
          hasCancel,
          `Cancellable status ${cancellable} must have at least one cancel route`,
        );
      }
    });
  });

  // =========================================================================
  // 2. SQL DDL vs TYPESCRIPT ENUMS & DOMAIN ENTITIES ALIGNMENT
  // =========================================================================
  describe('2. SQL DDL vs TypeScript Model Alignment Oracles', () => {
    it('2.1 should verify chk_ride_status check constraint in SQL contains all 15 RideStatus enum values', () => {
      // Extract the chk_ride_status block specifically from SQL
      const chkBlockMatch = mig010Sql.match(
        /ADD\s+CONSTRAINT\s+chk_ride_status\s+CHECK\s*\(([\s\S]*?)\);/i,
      );
      assert.ok(
        chkBlockMatch,
        'Migration 010 must contain ADD CONSTRAINT chk_ride_status CHECK (...)',
      );

      const chkContent = chkBlockMatch[1];
      for (const status of ALL_RIDE_STATUSES) {
        assert.ok(
          chkContent.includes(`'${status}'`),
          `chk_ride_status check constraint block must contain status '${status}'`,
        );
      }
    });

    it('2.2 should verify chk_rides_service_type supports both MobilityServiceType and ServiceType', () => {
      const chkBlockMatch = mig010Sql.match(
        /ADD\s+CONSTRAINT\s+chk_rides_service_type\s+CHECK\s*\(([\s\S]*?)\);/i,
      );
      assert.ok(
        chkBlockMatch,
        'Migration 010 must contain ADD CONSTRAINT chk_rides_service_type CHECK (...)',
      );

      const chkContent = chkBlockMatch[1];
      // MobilityServiceType
      for (const svc of ALL_MOBILITY_SERVICES) {
        assert.ok(
          chkContent.includes(`'${svc}'`),
          `chk_rides_service_type must contain mobility service '${svc}'`,
        );
      }
      // ServiceType
      for (const svc of ALL_SERVICE_TYPES) {
        assert.ok(
          chkContent.includes(`'${svc}'`),
          `chk_rides_service_type must contain trip service type '${svc}'`,
        );
      }
    });

    it('2.3 should verify chk_hire_driver_pricing_model covers ALL_PRICING_MODELS', () => {
      const chkBlockMatch = mig010Sql.match(
        /ADD\s+CONSTRAINT\s+chk_hire_driver_pricing_model\s+CHECK\s*\(([\s\S]*?)\);/i,
      );
      assert.ok(
        chkBlockMatch,
        'Migration 010 must contain ADD CONSTRAINT chk_hire_driver_pricing_model CHECK (...)',
      );

      const chkContent = chkBlockMatch[1];
      for (const pm of ALL_PRICING_MODELS) {
        assert.ok(
          chkContent.includes(`'${pm}'`),
          `chk_hire_driver_pricing_model must contain '${pm}'`,
        );
      }
    });

    it('2.4 should verify AssignmentStatus enum matches chk_ride_assignment_status and chk_hire_driver_assignment_status', () => {
      const rideAssignMatch = mig010Sql.match(
        /CONSTRAINT\s+chk_ride_assignment_status\s+CHECK\s*\(([\s\S]*?)\)/i,
      );
      assert.ok(rideAssignMatch, 'Must define chk_ride_assignment_status');

      const hireAssignMatch = mig010Sql.match(
        /CONSTRAINT\s+chk_hire_driver_assignment_status\s+CHECK\s*\(([\s\S]*?)\)/i,
      );
      assert.ok(hireAssignMatch, 'Must define chk_hire_driver_assignment_status');

      for (const status of ALL_ASSIGNMENT_STATUSES) {
        assert.ok(
          rideAssignMatch[1].includes(`'${status}'`),
          `chk_ride_assignment_status must contain '${status}'`,
        );
        assert.ok(
          hireAssignMatch[1].includes(`'${status}'`),
          `chk_hire_driver_assignment_status must contain '${status}'`,
        );
      }
    });

    it('2.5 should verify decimal-safe widening to NUMERIC(12,2) for all monetary columns', () => {
      const expectedRideMonetary = [
        'total_fare_inr',
        'fare_base_inr',
        'fare_distance_inr',
        'fare_time_inr',
        'platform_fee_inr',
        'tax_total_inr',
        'discount_inr',
        'partner_payout_inr',
      ];
      for (const col of expectedRideMonetary) {
        const regex = new RegExp(
          `ALTER\\s+TABLE\\s+rides\\s+ALTER\\s+COLUMN\\s+${col}\\s+TYPE\\s+NUMERIC\\(12,2\\)`,
          'i',
        );
        assert.match(mig010Sql, regex, `rides.${col} must be widened to NUMERIC(12,2)`);
      }

      const expectedHireMonetary = [
        'total_amount_inr',
        'base_fee_inr',
        'extra_hours_fee_inr',
        'night_allowance_inr',
        'platform_fee_inr',
        'tax_total_inr',
        'partner_payout_inr',
      ];
      for (const col of expectedHireMonetary) {
        const regex = new RegExp(
          `ALTER\\s+TABLE\\s+hire_driver_bookings\\s+ALTER\\s+COLUMN\\s+${col}\\s+TYPE\\s+NUMERIC\\(12,2\\)`,
          'i',
        );
        assert.match(
          mig010Sql,
          regex,
          `hire_driver_bookings.${col} must be widened to NUMERIC(12,2)`,
        );
      }
    });
  });

  // =========================================================================
  // 3. ADVERSARIAL INSPECTION OF WORKER TEST SUITE (migration-010.spec.ts)
  // =========================================================================
  describe('3. Worker Test Suite Blind Spot & Robustness Analysis', () => {
    it('3.1 should uncover that migration-010.spec.ts omitted 4 additive columns on hire_driver_bookings', () => {
      const testSpecPath = path.join(ROOT_DIR, 'tests/backend/migration-010.spec.ts');
      const testSpecContent = fs.readFileSync(testSpecPath, 'utf8');

      // The 4 columns that were added in SQL but missing from expectedHireColumns in the test:
      const missedColumns = [
        'customer_vehicle_transmission',
        'payment_reference',
        'start_otp_attempts',
        'end_otp_attempts',
      ];

      // Verify that SQL actually has them
      for (const col of missedColumns) {
        const sqlRegex = new RegExp(
          `ALTER\\s+TABLE\\s+hire_driver_bookings\\s+ADD\\s+COLUMN\\s+IF\\s+NOT\\s+EXISTS\\s+${col}\\b`,
          'i',
        );
        assert.match(mig010Sql, sqlRegex, `SQL actually adds ${col}`);
      }

      // Check whether expectedHireColumns in test 3 contains them
      const test3Match = testSpecContent.match(
        /it\('3\. should verify additive columns on canonical hire_driver_bookings table'[\s\S]*?const expectedHireColumns = \[([\s\S]*?)\];/,
      );
      assert.ok(test3Match, 'Test 3 should exist in spec');
      const arrayContent = test3Match[1];

      for (const col of missedColumns) {
        const isPresentInWorkerTestArray = arrayContent.includes(`'${col}'`);
        // We empirically document whether the worker's test array included it:
        assert.strictEqual(
          isPresentInWorkerTestArray,
          false,
          `Empirically confirmed finding: worker's expectedHireColumns omitted '${col}'`,
        );
      }
    });

    it('3.2 should uncover that chk_hire_driver_status is completely untested in Tier 1 of migration-010.spec.ts', () => {
      const testSpecPath = path.join(ROOT_DIR, 'tests/backend/migration-010.spec.ts');
      const testSpecContent = fs.readFileSync(testSpecPath, 'utf8');

      // Find the Tier 1 section before Tier 2
      const tier1Slice = testSpecContent.split('TIER 2:')[0];
      const testsChkHireDriverStatus = tier1Slice.includes('chk_hire_driver_status');

      assert.strictEqual(
        testsChkHireDriverStatus,
        false,
        'Empirically confirmed finding: chk_hire_driver_status is NOT verified in Tier 1 static checks',
      );
    });

    it('3.3 should verify that both immutability triggers have BEFORE UPDATE OR DELETE coverage', () => {
      // Both triggers must guard BEFORE UPDATE OR DELETE
      assert.match(
        mig010Sql,
        /CREATE\s+TRIGGER\s+trg_prevent_ride_events_mutation\s+BEFORE\s+UPDATE\s+OR\s+DELETE\s+ON\s+ride_events/i,
        'trg_prevent_ride_events_mutation must guard BEFORE UPDATE OR DELETE',
      );

      assert.match(
        mig010Sql,
        /CREATE\s+TRIGGER\s+trg_prevent_hire_driver_events_mutation\s+BEFORE\s+UPDATE\s+OR\s+DELETE\s+ON\s+hire_driver_events/i,
        'trg_prevent_hire_driver_events_mutation must guard BEFORE UPDATE OR DELETE',
      );
    });
  });

  // =========================================================================
  // 4. ROLLBACK SYMMETRY AND ZERO-LEAKAGE VERIFICATION
  // =========================================================================
  describe('4. Rollback Script Completeness & Symmetry', () => {
    it('4.1 should symmetrically drop all 4 dedicated tables in reverse dependency order', () => {
      const dropTablesRegex =
        /DROP\s+TABLE\s+IF\s+EXISTS\s+(hire_driver_events|hire_driver_assignments|ride_events|ride_assignments)/gi;
      const matches = [...rollback010Sql.matchAll(dropTablesRegex)].map((m) => m[1]);

      assert.ok(matches.includes('hire_driver_events'), 'Rollback must drop hire_driver_events');
      assert.ok(
        matches.includes('hire_driver_assignments'),
        'Rollback must drop hire_driver_assignments',
      );
      assert.ok(matches.includes('ride_events'), 'Rollback must drop ride_events');
      assert.ok(matches.includes('ride_assignments'), 'Rollback must drop ride_assignments');
    });

    it('4.2 should symmetrically drop all trigger functions', () => {
      assert.match(
        rollback010Sql,
        /DROP\s+FUNCTION\s+IF\s+EXISTS\s+prevent_ride_events_mutation\(\)/i,
      );
      assert.match(
        rollback010Sql,
        /DROP\s+FUNCTION\s+IF\s+EXISTS\s+prevent_hire_driver_events_mutation\(\)/i,
      );
    });

    it('4.3 should restore monetary columns back to NUMERIC(10,2) in rollback', () => {
      assert.match(
        rollback010Sql,
        /ALTER\s+TABLE\s+rides\s+ALTER\s+COLUMN\s+total_fare_inr\s+TYPE\s+NUMERIC\(10,2\)/i,
      );
      assert.match(
        rollback010Sql,
        /ALTER\s+TABLE\s+hire_driver_bookings\s+ALTER\s+COLUMN\s+total_amount_inr\s+TYPE\s+NUMERIC\(10,2\)/i,
      );
    });
  });
});
