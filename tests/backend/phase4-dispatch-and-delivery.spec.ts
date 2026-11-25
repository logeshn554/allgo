import assert from 'node:assert';
import { after, before, describe, it } from 'node:test';
import { ConfigService } from '../../services/api/dist/config/config.service.js';
import { DatabaseService } from '../../services/api/dist/database/database.service.js';
import { DeliveryJobService } from '../../services/api/dist/delivery/delivery-job.service.js';
import type { DeliveryGateway } from '../../services/api/dist/delivery/delivery.gateway.js';
import { DispatchEngineService } from '../../services/api/dist/delivery/dispatch-engine.service.js';
import { PartnerAvailabilityService } from '../../services/api/dist/delivery/partner-availability.service.js';
import { RedisService } from '../../services/api/dist/redis/redis.service.js';

describe('Phase 4: Dispatch Engine, Delivery Assignment, Tracking & Operations Suite', () => {
  let config: ConfigService;
  let db: DatabaseService;
  let redis: RedisService;
  let gateway: DeliveryGateway;
  let partnerAvailabilityService: PartnerAvailabilityService;
  let dispatchEngineService: DispatchEngineService;
  let deliveryJobService: DeliveryJobService;

  // Test User IDs
  const merchantOwnerId = '44444444-4444-4444-4444-000000000001';
  const partnerUserId1 = '44444444-4444-4444-4444-000000000002';
  const partnerUserId2 = '44444444-4444-4444-4444-000000000003';
  const customerUserId = '44444444-4444-4444-4444-000000000004';
  const adminUserId = '44444444-4444-4444-4444-000000000099';

  let testMerchantId: string;
  let testOutletId: string;
  let testPartnerId1: string;
  let testPartnerId2: string;
  let testJobId: string;
  let testHandoverOtp: string;
  let testDeliveryPin: string;

  let isLiveAvailable = false;
  before(async () => {
    config = new ConfigService();
    db = new DatabaseService(config);
    redis = new RedisService(config);
    await db.onModuleInit();
    await redis.onModuleInit();
    try {
      await db.query('SELECT 1;');
      isLiveAvailable = true;
    } catch {
      isLiveAvailable = false;
    }
    if (!isLiveAvailable) {
      return;
    }

    // Mock Gateway for test isolation
    gateway = {
      emitJobOffer: () => {},
      emitJobStatusChanged: () => {},
      emitPartnerLocationUpdate: () => {},
      emitDispatchException: () => {},
    } as any;

    partnerAvailabilityService = new PartnerAvailabilityService(db, redis, gateway);
    dispatchEngineService = new DispatchEngineService(
      db,
      redis,
      gateway,
      partnerAvailabilityService,
    );
    deliveryJobService = new DeliveryJobService(db, gateway, dispatchEngineService);

    // Clean prior runs if any
    try {
      await db.query(
        `DELETE FROM delivery_jobs WHERE outlet_id IN (SELECT id FROM outlets WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id = '${merchantOwnerId}'));`,
      );
      await db.query(
        `DELETE FROM outlets WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id = '${merchantOwnerId}');`,
      );
      await db.query(`DELETE FROM merchants WHERE owner_id = '${merchantOwnerId}';`);
      await db.query(
        `DELETE FROM partner_location_history WHERE partner_id IN (SELECT id FROM partners WHERE user_id IN ('${partnerUserId1}', '${partnerUserId2}'));`,
      );
      await db.query(
        `DELETE FROM partner_availability_sessions WHERE partner_id IN (SELECT id FROM partners WHERE user_id IN ('${partnerUserId1}', '${partnerUserId2}'));`,
      );
      await db.query(
        `DELETE FROM partner_service_applications WHERE partner_id IN (SELECT id FROM partners WHERE user_id IN ('${partnerUserId1}', '${partnerUserId2}'));`,
      );
      await db.query(
        `DELETE FROM vehicles WHERE partner_id IN (SELECT id FROM partners WHERE user_id IN ('${partnerUserId1}', '${partnerUserId2}'));`,
      );
      await db.query(
        `DELETE FROM partner_documents WHERE partner_id IN (SELECT id FROM partners WHERE user_id IN ('${partnerUserId1}', '${partnerUserId2}'));`,
      );
      await db.query(
        `DELETE FROM partners WHERE user_id IN ('${partnerUserId1}', '${partnerUserId2}');`,
      );
    } catch {}

    // Setup Test Fixtures
    // 1. Ensure test users exist
    await db.query(`
      INSERT INTO users (id, phone, full_name, status, firebase_uid, created_at, updated_at)
      VALUES
        ('${merchantOwnerId}', '+919999000001', 'Test Merchant', 'ACTIVE', 'fb-p4-merch', NOW(), NOW()),
        ('${partnerUserId1}', '+919999000002', 'Ravi Courier', 'ACTIVE', 'fb-p4-part1', NOW(), NOW()),
        ('${partnerUserId2}', '+919999000003', 'Suresh Express', 'ACTIVE', 'fb-p4-part2', NOW(), NOW()),
        ('${customerUserId}', '+919999000004', 'Anand Customer', 'ACTIVE', 'fb-p4-cust', NOW(), NOW()),
        ('${adminUserId}', '+919999000099', 'Admin Ops', 'ACTIVE', 'fb-p4-admin', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE';
    `);

    // 2. Ensure test merchant & outlet exist
    const mRes = await db.query(`
      INSERT INTO merchants (owner_id, business_name, merchant_type, pan_number, status)
      VALUES ('${merchantOwnerId}', 'Phase 4 Test Kitchen', 'RESTAURANT', 'AAAAA1111A', 'APPROVED')
      RETURNING id;
    `);
    testMerchantId = mRes.rows[0].id;

    const oRes = await db.query(`
      INSERT INTO outlets (merchant_id, zone_id, outlet_name, address_line1, postal_code, phone, location, outlet_status)
      VALUES (
        '${testMerchantId}',
        '30000000-0000-0000-0000-000000000004',
        'Phase 4 Express Store',
        'Anna Nagar 2nd Ave, Chennai',
        '600040',
        '+919999000001',
        ST_SetSRID(ST_MakePoint(80.2173, 13.0850), 4326),
        'ACTIVE'
      ) RETURNING id;
    `);
    testOutletId = oRes.rows[0].id;

    // 3. Ensure test partners exist, are APPROVED with verified KYC, vehicle, and approved delivery service
    const p1Res = await db.query(`
      INSERT INTO partners (user_id, status)
      VALUES ('${partnerUserId1}', 'APPROVED')
      RETURNING id;
    `);
    testPartnerId1 = p1Res.rows[0].id;

    await db.query(`
      INSERT INTO partner_documents (partner_id, document_type, document_number, file_url, verification_status)
      VALUES ('${testPartnerId1}', 'DRIVING_LICENSE', 'DL-TN01-2020-0001', 'https://storage.local/dl1.pdf', 'VERIFIED');
    `);
    await db.query(`
      INSERT INTO vehicles (partner_id, vehicle_type, registration_number, make_model)
      VALUES ('${testPartnerId1}', 'MOTORCYCLE', 'TN01AB1234', 'Hero Splendor Plus')
      ON CONFLICT (registration_number) DO NOTHING;
    `);
    await db.query(`
      INSERT INTO partner_service_applications (partner_id, service_type, status)
      VALUES ('${testPartnerId1}', 'FOOD_DELIVERY', 'APPROVED');
    `);

    const p2Res = await db.query(`
      INSERT INTO partners (user_id, status)
      VALUES ('${partnerUserId2}', 'APPROVED')
      RETURNING id;
    `);
    testPartnerId2 = p2Res.rows[0].id;

    await db.query(`
      INSERT INTO partner_documents (partner_id, document_type, document_number, file_url, verification_status)
      VALUES ('${testPartnerId2}', 'DRIVING_LICENSE', 'DL-TN01-2020-0002', 'https://storage.local/dl2.pdf', 'VERIFIED');
    `);
    await db.query(`
      INSERT INTO vehicles (partner_id, vehicle_type, registration_number, make_model)
      VALUES ('${testPartnerId2}', 'MOTORCYCLE', 'TN01CD5678', 'Honda Activa')
      ON CONFLICT (registration_number) DO NOTHING;
    `);
    await db.query(`
      INSERT INTO partner_service_applications (partner_id, service_type, status)
      VALUES ('${testPartnerId2}', 'FOOD_DELIVERY', 'APPROVED');
    `);
  });

  after(async () => {
    if (!isLiveAvailable) {
      return;
    }
    // Teardown test data
    try {
      if (testJobId) {
        await db.query(
          `DELETE FROM partner_earnings_entries WHERE delivery_job_id = '${testJobId}';`,
        );
        await db.query(
          `DELETE FROM delivery_status_events WHERE delivery_job_id = '${testJobId}';`,
        );
        await db.query(`DELETE FROM dispatch_attempts WHERE delivery_job_id = '${testJobId}';`);
        await db.query(`DELETE FROM delivery_proofs WHERE delivery_job_id = '${testJobId}';`);
        await db.query(
          `DELETE FROM delivery_cancellation_records WHERE delivery_job_id = '${testJobId}';`,
        );
        await db.query(
          `DELETE FROM delivery_exception_records WHERE delivery_job_id = '${testJobId}';`,
        );
        await db.query(`DELETE FROM delivery_jobs WHERE id = '${testJobId}';`);
      }
      if (testPartnerId1 && testPartnerId2) {
        await db.query(
          `DELETE FROM partner_location_history WHERE partner_id IN ('${testPartnerId1}', '${testPartnerId2}');`,
        );
        await db.query(
          `DELETE FROM partner_availability_sessions WHERE partner_id IN ('${testPartnerId1}', '${testPartnerId2}');`,
        );
        await db.query(
          `DELETE FROM partner_service_applications WHERE partner_id IN ('${testPartnerId1}', '${testPartnerId2}');`,
        );
        await db.query(
          `DELETE FROM vehicles WHERE partner_id IN ('${testPartnerId1}', '${testPartnerId2}');`,
        );
        await db.query(
          `DELETE FROM partner_documents WHERE partner_id IN ('${testPartnerId1}', '${testPartnerId2}');`,
        );
        await db.query(
          `DELETE FROM partners WHERE id IN ('${testPartnerId1}', '${testPartnerId2}');`,
        );
      }
      await db.query(
        `DELETE FROM partners WHERE user_id IN ('${partnerUserId1}', '${partnerUserId2}');`,
      );
      if (testOutletId) {
        await db.query(
          `DELETE FROM partner_earnings_entries WHERE delivery_job_id IN (SELECT id FROM delivery_jobs WHERE outlet_id = '${testOutletId}');`,
        );
        await db.query(
          `DELETE FROM delivery_status_events WHERE delivery_job_id IN (SELECT id FROM delivery_jobs WHERE outlet_id = '${testOutletId}');`,
        );
        await db.query(
          `DELETE FROM dispatch_attempts WHERE delivery_job_id IN (SELECT id FROM delivery_jobs WHERE outlet_id = '${testOutletId}');`,
        );
        await db.query(
          `DELETE FROM delivery_proofs WHERE delivery_job_id IN (SELECT id FROM delivery_jobs WHERE outlet_id = '${testOutletId}');`,
        );
        await db.query(
          `DELETE FROM delivery_cancellation_records WHERE delivery_job_id IN (SELECT id FROM delivery_jobs WHERE outlet_id = '${testOutletId}');`,
        );
        await db.query(
          `DELETE FROM delivery_exception_records WHERE delivery_job_id IN (SELECT id FROM delivery_jobs WHERE outlet_id = '${testOutletId}');`,
        );
        await db.query(`DELETE FROM delivery_jobs WHERE outlet_id = '${testOutletId}';`);
        await db.query(`DELETE FROM outlets WHERE id = '${testOutletId}';`);
      }
      if (testMerchantId) {
        await db.query(`DELETE FROM merchants WHERE id = '${testMerchantId}';`);
      }
      await db.query(`DELETE FROM merchants WHERE owner_id = '${merchantOwnerId}';`);
      await db.query(
        `DELETE FROM users WHERE id IN ('${merchantOwnerId}', '${partnerUserId1}', '${partnerUserId2}', '${customerUserId}', '${adminUserId}');`,
      );
    } catch {}
    await db.onModuleDestroy();
    await redis.onModuleDestroy();
  });

  it('1. Delivery Job Intake API creates job with generated PIN and OTP', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    try {
      const job = await deliveryJobService.createDeliveryJob({
        outletId: testOutletId,
        customerId: customerUserId,
        customerName: 'Anand Kumar',
        pickupAddress: 'Anna Nagar 2nd Ave, Chennai',
        pickupLocation: { latitude: 13.085, longitude: 80.2173 },
        pickupContactPhone: '+919999000001',
        dropoffAddress: 'Kilpauk Main Road, Chennai',
        dropoffLocation: { latitude: 13.082, longitude: 80.235 },
        dropoffContactPhone: '+919999000004',
        verticalType: 'FOOD',
        estimatedPrepTimeMinutes: 15,
        courierFeeInr: 65.0,
        surgeFeeInr: 10.0,
        itemsSnapshot: [{ itemId: 'item-1', name: 'Veg Biryani', quantity: 2, priceInr: 180 }],
      });

      assert.ok(job.id, 'Job should have a valid UUID');
      assert.ok(job.job_number.startsWith('DEL-'), 'Job number should start with DEL-');
      assert.strictEqual(job.status, 'CREATED');
      assert.ok(job.handover_otp && job.handover_otp.length === 4, 'Handover OTP must be 4 digits');
      assert.ok(job.delivery_pin && job.delivery_pin.length === 4, 'Delivery PIN must be 4 digits');

      testJobId = job.id;
      testHandoverOtp = job.handover_otp;
      testDeliveryPin = job.delivery_pin;

      // Verify initial status event recorded
      const eventRes = await db.query(
        `SELECT * FROM delivery_status_events WHERE delivery_job_id = $1 ORDER BY created_at ASC;`,
        [testJobId],
      );
      assert.strictEqual(eventRes.rows.length, 1);
      assert.strictEqual(eventRes.rows[0].to_status, 'CREATED');
    } catch (e: any) {
      console.error('TEST 1 FAILURE CAUSE:', e.message, e.stack);
      throw e;
    }
  });

  it('2. Merchant Preparation Lifecycle transitions', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    try {
      // Accept job
      const accepted = await deliveryJobService.merchantAcceptJob(merchantOwnerId, testJobId);
      assert.strictEqual(accepted.status, 'MERCHANT_ACCEPTED');

      // Start preparing
      const prep = await deliveryJobService.merchantStartPreparing(merchantOwnerId, testJobId);
      assert.strictEqual(prep.status, 'PREPARING');

      // Mark ready for pickup
      const ready = await deliveryJobService.merchantMarkReadyForPickup(merchantOwnerId, testJobId);
      assert.ok(ready.status === 'READY_FOR_PICKUP' || ready.status === 'ASSIGNMENT_PENDING');
    } catch (e: any) {
      console.error('TEST 2 FAILURE CAUSE:', e.message, e.stack);
      throw e;
    }
  });

  it('3. Partner Availability: Go Online and Record Heartbeat with Anti-Spoofing', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    try {
      // Partner 1 goes online near pickup (Anna Nagar: 13.0851, 80.2174)
      const session1 = await partnerAvailabilityService.setOnline(partnerUserId1, {
        latitude: 13.0851,
        longitude: 80.2174,
      });
      assert.strictEqual(session1.status, 'ONLINE');

      // Partner 2 goes online slightly further away (13.0880, 80.2200)
      const session2 = await partnerAvailabilityService.setOnline(partnerUserId2, {
        latitude: 13.088,
        longitude: 80.22,
      });
      assert.strictEqual(session2.status, 'ONLINE');

      // Verify Redis GEO contains partners
      const rawRedis = redis.getRawClient();
      if (rawRedis) {
        const pos1 = await rawRedis.geopos('dispatch:partners:online:geo', testPartnerId1);
        assert.ok(
          pos1 && pos1.length > 0 && pos1[0] !== null,
          'Partner 1 should exist in Redis GEO',
        );
      }

      // Verify impossible speed check rejects telemetry (> 45 m/s)
      await assert.rejects(async () => {
        // Record point in Delhi (distance > 1500 km within 1 second)
        await partnerAvailabilityService.recordLocation(partnerUserId1, {
          latitude: 28.6139,
          longitude: 77.209,
          speedMps: 999.0, // impossible speed
        });
      }, /teleportation|Impossible speed/);
    } catch (e: any) {
      console.error('TEST 3 FAILURE CAUSE:', e.message, e.stack);
      throw e;
    }
  });

  it('4. Dispatch Engine: Candidate Discovery and Offer Creation', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    // Request dispatch
    const dispatchResult = await dispatchEngineService.requestDispatch(testJobId);
    assert.ok(dispatchResult.attemptId, 'Dispatch should return an attemptId');
    assert.strictEqual(
      dispatchResult.partnerId,
      testPartnerId1,
      'Nearest partner (Partner 1) should receive offer first',
    );

    // Verify dispatch attempt recorded as OFFERED
    const attemptRes = await db.query(`SELECT * FROM dispatch_attempts WHERE id = $1;`, [
      dispatchResult.attemptId,
    ]);
    assert.strictEqual(attemptRes.rows.length, 1);
    assert.strictEqual(attemptRes.rows[0].status, 'OFFERED');
  });

  it('5. Atomic Offer Acceptance & Race Condition Protection', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    // Fetch active attempt for Partner 1
    const attemptRes = await db.query(
      `SELECT * FROM dispatch_attempts WHERE delivery_job_id = $1 AND partner_id = $2 AND status = 'OFFERED';`,
      [testJobId, testPartnerId1],
    );
    assert.strictEqual(attemptRes.rows.length, 1);
    const attemptId = attemptRes.rows[0].id;

    // Partner 1 accepts offer
    const acceptRes = await dispatchEngineService.acceptOffer(partnerUserId1, attemptId);
    assert.strictEqual(acceptRes.success, true);
    assert.strictEqual(acceptRes.status, 'PARTNER_ASSIGNED');

    // Verify delivery job is updated
    const jobCheck = await db.query(
      'SELECT status, assigned_partner_id FROM delivery_jobs WHERE id = $1;',
      [testJobId],
    );
    assert.strictEqual(jobCheck.rows[0].status, 'PARTNER_ASSIGNED');
    assert.strictEqual(jobCheck.rows[0].assigned_partner_id, testPartnerId1);

    // Verify partner session set to BUSY
    const sessCheck = await db.query(
      'SELECT status FROM partner_availability_sessions WHERE partner_id = $1;',
      [testPartnerId1],
    );
    assert.strictEqual(sessCheck.rows[0].status, 'BUSY');

    // Try accepting again or another partner accepting -> must reject
    await assert.rejects(async () => {
      await dispatchEngineService.acceptOffer(partnerUserId1, attemptId);
    }, /no longer available/);
  });

  it('6. Merchant-Courier Handover: OTP Security Verification', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    try {
      // Partner marks arrived at pickup
      await deliveryJobService.partnerArrivedAtPickup(partnerUserId1, testJobId);
      const arrivedCheck = await db.query('SELECT status FROM delivery_jobs WHERE id = $1;', [
        testJobId,
      ]);
      assert.strictEqual(arrivedCheck.rows[0].status, 'PARTNER_ARRIVED');

      // Attempt handover with wrong OTP -> must fail
      await assert.rejects(async () => {
        await deliveryJobService.merchantVerifyHandover(merchantOwnerId, testJobId, {
          handoverOtp: '0000',
        });
      }, /Invalid handover OTP/);

      // Attempt handover with correct OTP -> must succeed and transition to PICKED_UP
      const handoverSuccess = await deliveryJobService.merchantVerifyHandover(
        merchantOwnerId,
        testJobId,
        { handoverOtp: testHandoverOtp },
      );
      assert.strictEqual(handoverSuccess.status, 'PICKED_UP');

      // Partner starts delivery towards customer dropoff -> transitions to IN_TRANSIT
      const transitSuccess = await deliveryJobService.partnerStartDelivery(
        partnerUserId1,
        testJobId,
      );
      assert.strictEqual(transitSuccess.status, 'IN_TRANSIT');
    } catch (e: any) {
      console.error('TEST 6 FAILURE CAUSE:', e.message, e.stack);
      throw e;
    }
  });

  it('7. Delivery Completion: Customer PIN Verification & Earnings Ledger', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    try {
      // Partner arrives at destination
      await deliveryJobService.partnerArrivedAtDestination(partnerUserId1, testJobId);
      const destCheck = await db.query('SELECT status FROM delivery_jobs WHERE id = $1;', [
        testJobId,
      ]);
      assert.strictEqual(destCheck.rows[0].status, 'ARRIVED_AT_DESTINATION');

      // Attempt complete with wrong PIN -> must fail
      await assert.rejects(async () => {
        await deliveryJobService.partnerCompleteDelivery(partnerUserId1, testJobId, {
          deliveryPin: '9999',
        });
      }, /Invalid delivery PIN/);

      // Attempt complete with correct PIN -> must succeed
      const completed = await deliveryJobService.partnerCompleteDelivery(
        partnerUserId1,
        testJobId,
        {
          deliveryPin: testDeliveryPin,
          proofType: 'PIN',
          latitude: 13.082,
          longitude: 80.235,
        },
      );
      assert.strictEqual(completed.status, 'DELIVERED');

      // Verify partner session freed back to ONLINE
      const sessCheck = await db.query(
        'SELECT status FROM partner_availability_sessions WHERE partner_id = $1;',
        [testPartnerId1],
      );
      assert.strictEqual(sessCheck.rows[0].status, 'ONLINE');

      // Verify partner earnings ledger entry created
      const earningsRes = await db.query(
        `SELECT * FROM partner_earnings_entries WHERE delivery_job_id = $1 AND partner_id = $2;`,
        [testJobId, testPartnerId1],
      );
      assert.strictEqual(earningsRes.rows.length, 1);
      assert.strictEqual(Number(earningsRes.rows[0].base_amount_inr), 65.0);
      assert.strictEqual(Number(earningsRes.rows[0].surge_amount_inr), 10.0);
      assert.strictEqual(Number(earningsRes.rows[0].total_earned_inr), 75.0);
    } catch (e: any) {
      console.error('TEST 7 FAILURE CAUSE:', e.message, e.stack);
      throw e;
    }
  });

  it('8. Safe Data Exposure & Role-Based Redactions', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    // Customer tracking query -> must NOT leak partner KYC or merchant handover OTP
    const customerView = await deliveryJobService.getJobTrackingDetails(
      customerUserId,
      'CUSTOMER',
      testJobId,
    );
    assert.strictEqual(
      customerView.handoverOtp,
      null,
      'Customer must not see merchant handover OTP',
    );
    assert.strictEqual(customerView.deliveryPin, testDeliveryPin, 'Customer can see delivery PIN');
    assert.ok(customerView.assignedPartner, 'Customer should see assigned courier details');

    // Partner tracking query -> must NOT see customer delivery PIN in advance
    const partnerView = await deliveryJobService.getJobTrackingDetails(
      partnerUserId1,
      'PARTNER',
      testJobId,
    );
    assert.strictEqual(
      partnerView.deliveryPin,
      null,
      'Partner must not see delivery PIN in advance',
    );
  });

  it('9. Admin Operations: Listing, Statistics & Cancellation Audit', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    try {
      // Admin list jobs
      const adminJobs = await deliveryJobService.listAdminJobs({ status: 'DELIVERED' });
      assert.ok(adminJobs.total >= 1);
      assert.ok(adminJobs.items.some((j) => j.id === testJobId));

      // Admin stats
      const stats = await deliveryJobService.getDispatchStats();
      assert.ok(stats.deliveredToday >= 1);
      assert.ok(stats.onlinePartners >= 1);

      // Create a disposable job to test cancellation
      const cancelJob = await deliveryJobService.createDeliveryJob({
        outletId: testOutletId,
        customerId: customerUserId,
        pickupAddress: 'Pickup',
        pickupLocation: { latitude: 13.085, longitude: 80.2173 },
        pickupContactPhone: '+919999000001',
        dropoffAddress: 'Dropoff',
        dropoffLocation: { latitude: 13.082, longitude: 80.235 },
        dropoffContactPhone: '+919999000004',
        courierFeeInr: 50.0,
      });

      const cancelled = await deliveryJobService.cancelDeliveryJob(
        adminUserId,
        'ADMIN',
        cancelJob.id,
        {
          reasonCode: 'CUSTOMER_CANCELLED',
          reasonDetails: 'Customer changed mind before preparation',
        },
      );
      assert.strictEqual(cancelled.status, 'CANCELLED');

      // Verify cancellation audit record
      const cancelAudit = await db.query(
        `SELECT * FROM delivery_cancellation_records WHERE delivery_job_id = $1;`,
        [cancelJob.id],
      );
      assert.strictEqual(cancelAudit.rows.length, 1);
      assert.strictEqual(cancelAudit.rows[0].reason_code, 'CUSTOMER_CANCELLED');

      // Clean up cancelled job
      await db.query(
        `DELETE FROM delivery_status_events WHERE delivery_job_id = '${cancelJob.id}';`,
      );
      await db.query(
        `DELETE FROM delivery_cancellation_records WHERE delivery_job_id = '${cancelJob.id}';`,
      );
      await db.query(`DELETE FROM delivery_jobs WHERE id = '${cancelJob.id}';`);
    } catch (e: any) {
      console.error('TEST 9 FAILURE CAUSE:', e.message, e.stack);
      throw e;
    }
  });
});
