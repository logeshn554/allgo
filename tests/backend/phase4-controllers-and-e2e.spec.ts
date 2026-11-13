import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import { ConfigService } from '../../apps/api/dist/config/config.service.js';
import { DatabaseService } from '../../apps/api/dist/database/database.service.js';
import { RedisService } from '../../apps/api/dist/redis/redis.service.js';
import { DeliveryJobService } from '../../apps/api/dist/delivery/delivery-job.service.js';
import { PartnerAvailabilityService } from '../../apps/api/dist/delivery/partner-availability.service.js';
import { DispatchEngineService } from '../../apps/api/dist/delivery/dispatch-engine.service.js';
import { DeliveryJobController } from '../../apps/api/dist/delivery/controllers/delivery-job.controller.js';
import { MerchantDeliveryController } from '../../apps/api/dist/delivery/controllers/merchant-delivery.controller.js';
import { PartnerDeliveryController } from '../../apps/api/dist/delivery/controllers/partner-delivery.controller.js';
import { CustomerDeliveryController } from '../../apps/api/dist/delivery/controllers/customer-delivery.controller.js';
import { AdminDispatchController } from '../../apps/api/dist/delivery/controllers/admin-dispatch.controller.js';

describe('Phase 4: Controllers & End-to-End Operational Workflow Suite', () => {
  let config: ConfigService;
  let db: DatabaseService;
  let redis: RedisService;
  let deliveryJobService: DeliveryJobService;
  let partnerAvailabilityService: PartnerAvailabilityService;
  let dispatchEngineService: DispatchEngineService;

  let deliveryJobController: DeliveryJobController;
  let merchantDeliveryController: MerchantDeliveryController;
  let partnerDeliveryController: PartnerDeliveryController;
  let customerDeliveryController: CustomerDeliveryController;
  let adminDispatchController: AdminDispatchController;

  const merchantOwnerId = '55555555-5555-5555-5555-000000000001';
  const partnerUserId = '55555555-5555-5555-5555-000000000002';
  const customerUserId = '55555555-5555-5555-5555-000000000003';
  const adminUserId = '55555555-5555-5555-5555-000000000004';

  let testMerchantId: string;
  let testOutletId: string;
  let testPartnerId: string;
  let createdJobId: string;
  let deliveryPin: string;
  let handoverOtp: string;
  let dispatchAttemptId: string;

  before(async () => {
    config = new ConfigService();
    db = new DatabaseService(config);
    redis = new RedisService(config);
    await db.onModuleInit();
    await redis.onModuleInit();

    const gatewayMock = {
      emitJobOffer: () => {},
      emitJobStatusChanged: () => {},
      emitPartnerLocationUpdate: () => {},
      emitDispatchException: () => {},
    } as any;

    partnerAvailabilityService = new PartnerAvailabilityService(db, redis, gatewayMock);
    dispatchEngineService = new DispatchEngineService(db, redis, gatewayMock, partnerAvailabilityService);
    deliveryJobService = new DeliveryJobService(db, gatewayMock, dispatchEngineService);

    deliveryJobController = new DeliveryJobController(deliveryJobService);
    merchantDeliveryController = new MerchantDeliveryController(deliveryJobService, db);
    partnerDeliveryController = new PartnerDeliveryController(partnerAvailabilityService, dispatchEngineService, deliveryJobService, db);
    customerDeliveryController = new CustomerDeliveryController(deliveryJobService, db);
    adminDispatchController = new AdminDispatchController(deliveryJobService, dispatchEngineService);

    // Clean prior test artifacts
    try {
      await db.query(`DELETE FROM delivery_jobs WHERE outlet_id IN (SELECT id FROM outlets WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id = '${merchantOwnerId}'));`);
      await db.query(`DELETE FROM outlets WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id = '${merchantOwnerId}');`);
      await db.query(`DELETE FROM merchants WHERE owner_id = '${merchantOwnerId}';`);
      await db.query(`DELETE FROM partner_location_history WHERE partner_id IN (SELECT id FROM partners WHERE user_id = '${partnerUserId}');`);
      await db.query(`DELETE FROM partner_availability_sessions WHERE partner_id IN (SELECT id FROM partners WHERE user_id = '${partnerUserId}');`);
      await db.query(`DELETE FROM partner_service_applications WHERE partner_id IN (SELECT id FROM partners WHERE user_id = '${partnerUserId}');`);
      await db.query(`DELETE FROM vehicles WHERE partner_id IN (SELECT id FROM partners WHERE user_id = '${partnerUserId}');`);
      await db.query(`DELETE FROM partner_documents WHERE partner_id IN (SELECT id FROM partners WHERE user_id = '${partnerUserId}');`);
      await db.query(`DELETE FROM partners WHERE user_id = '${partnerUserId}';`);
      await db.query(`DELETE FROM users WHERE id IN ('${merchantOwnerId}', '${partnerUserId}', '${customerUserId}', '${adminUserId}');`);
    } catch {}

    // Seed test users
    await db.query(`
      INSERT INTO users (id, phone, full_name, status, firebase_uid, created_at, updated_at)
      VALUES
        ('${merchantOwnerId}', '+919999000021', 'Phase4 Merchant Owner', 'ACTIVE', 'fb_p4_m_01', NOW(), NOW()),
        ('${partnerUserId}', '+919999000022', 'Phase4 Delivery Partner', 'ACTIVE', 'fb_p4_p_01', NOW(), NOW()),
        ('${customerUserId}', '+919999000023', 'Phase4 Customer', 'ACTIVE', 'fb_p4_c_01', NOW(), NOW()),
        ('${adminUserId}', '+919999000024', 'Phase4 Dispatch Admin', 'ACTIVE', 'fb_p4_a_01', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE';
    `);

    // Seed merchant & outlet
    const mRes = await db.query(`
      INSERT INTO merchants (owner_id, business_name, merchant_type, status, pan_number, bank_account_number, bank_ifsc)
      VALUES ('${merchantOwnerId}', 'Phase4 Feast Kitchen', 'RESTAURANT', 'APPROVED', 'ABCDE1234M', '111122223333', 'HDFC0001234')
      RETURNING id;
    `);
    testMerchantId = mRes.rows[0].id;

    const outRes = await db.query(`
      INSERT INTO outlets (merchant_id, zone_id, outlet_name, address_line1, postal_code, phone, location, outlet_status)
      VALUES ('${testMerchantId}', '30000000-0000-0000-0000-000000000004', 'Feast Kitchen Kilpauk', 'Kilpauk Garden Rd', '600010', '+919999000021', ST_SetSRID(ST_MakePoint(80.2400, 13.0800), 4326), 'ACTIVE')
      RETURNING id;
    `);
    testOutletId = outRes.rows[0].id;

    // Seed approved partner & vehicle
    const pRes = await db.query(`
      INSERT INTO partners (user_id, status)
      VALUES ('${partnerUserId}', 'APPROVED')
      RETURNING id;
    `);
    testPartnerId = pRes.rows[0].id;

    await db.query(`
      INSERT INTO partner_documents (partner_id, document_type, document_number, file_url, verification_status)
      VALUES ('${testPartnerId}', 'DRIVING_LICENSE', 'DL-TN01-2020-0099', 'https://storage.local/dl99.pdf', 'VERIFIED');
    `);

    await db.query(`
      INSERT INTO vehicles (partner_id, vehicle_type, registration_number, make_model)
      VALUES ('${testPartnerId}', 'MOTORCYCLE', 'TN-01-P4-9999', 'Hero Splendor')
      ON CONFLICT (registration_number) DO NOTHING;
    `);

    await db.query(`
      INSERT INTO partner_service_applications (partner_id, service_type, status)
      VALUES ('${testPartnerId}', 'FOOD_DELIVERY', 'APPROVED');
    `);
  });

  after(async () => {
    try {
      if (testOutletId) {
        await db.query(`DELETE FROM partner_earnings_entries WHERE delivery_job_id IN (SELECT id FROM delivery_jobs WHERE outlet_id = '${testOutletId}');`);
        await db.query(`DELETE FROM delivery_status_events WHERE delivery_job_id IN (SELECT id FROM delivery_jobs WHERE outlet_id = '${testOutletId}');`);
        await db.query(`DELETE FROM dispatch_attempts WHERE delivery_job_id IN (SELECT id FROM delivery_jobs WHERE outlet_id = '${testOutletId}');`);
        await db.query(`DELETE FROM delivery_proofs WHERE delivery_job_id IN (SELECT id FROM delivery_jobs WHERE outlet_id = '${testOutletId}');`);
        await db.query(`DELETE FROM delivery_cancellation_records WHERE delivery_job_id IN (SELECT id FROM delivery_jobs WHERE outlet_id = '${testOutletId}');`);
        await db.query(`DELETE FROM delivery_exception_records WHERE delivery_job_id IN (SELECT id FROM delivery_jobs WHERE outlet_id = '${testOutletId}');`);
        await db.query(`DELETE FROM delivery_jobs WHERE outlet_id = '${testOutletId}';`);
        await db.query(`DELETE FROM outlets WHERE id = '${testOutletId}';`);
      }
      if (testPartnerId) {
        await db.query(`DELETE FROM partner_location_history WHERE partner_id = '${testPartnerId}';`);
        await db.query(`DELETE FROM partner_availability_sessions WHERE partner_id = '${testPartnerId}';`);
        await db.query(`DELETE FROM partner_service_applications WHERE partner_id = '${testPartnerId}';`);
        await db.query(`DELETE FROM vehicles WHERE partner_id = '${testPartnerId}';`);
        await db.query(`DELETE FROM partner_documents WHERE partner_id = '${testPartnerId}';`);
        await db.query(`DELETE FROM partners WHERE id = '${testPartnerId}';`);
      }
      if (testMerchantId) {
        await db.query(`DELETE FROM merchants WHERE id = '${testMerchantId}';`);
      }
      await db.query(`DELETE FROM users WHERE id IN ('${merchantOwnerId}', '${partnerUserId}', '${customerUserId}', '${adminUserId}');`);
    } catch {}
    await db.onModuleDestroy();
    await redis.onModuleDestroy();
  });

  it('1. DeliveryJobController: Intake creates job with secure 4-digit PIN and OTP', async () => {
    const job = await deliveryJobController.createJob({
      outletId: testOutletId,
      customerId: customerUserId,
      verticalType: 'FOOD',
      pickupAddress: 'Feast Kitchen Kilpauk, Chennai',
      pickupLocation: { latitude: 13.0800, longitude: 80.2400 },
      pickupContactPhone: '+919999000021',
      dropoffAddress: 'Chetpet High Rd, Chennai',
      dropoffLocation: { latitude: 13.0720, longitude: 80.2450 },
      dropoffContactPhone: '+919999000023',
      courierFeeInr: 60.0,
      packagingFeeInr: 15.0,
    });

    assert.ok(job.id);
    assert.strictEqual(job.status, 'CREATED');
    assert.ok(job.job_number.startsWith('DEL-'));
    assert.ok(/^\d{4}$/.test(job.handover_otp));
    assert.ok(/^\d{4}$/.test(job.delivery_pin));

    createdJobId = job.id;
    handoverOtp = job.handover_otp;
    deliveryPin = job.delivery_pin;
  });

  it('2. MerchantDeliveryController: Merchant accepts, starts prep, and marks ready', async () => {
    const req = { user: { userId: merchantOwnerId, roles: ['MERCHANT_ADMIN'] } };

    // 1. Merchant accept
    const accepted = await merchantDeliveryController.acceptJob(req, createdJobId);
    assert.strictEqual(accepted.status, 'MERCHANT_ACCEPTED');

    // 2. Merchant prepare
    const preparing = await merchantDeliveryController.startPreparing(req, createdJobId);
    assert.strictEqual(preparing.status, 'PREPARING');

    // 3. Merchant list outlet jobs
    const jobs = await merchantDeliveryController.getOutletDeliveryJobs(req, testOutletId);
    assert.ok(jobs.length >= 1);
    assert.strictEqual(jobs[0].id, createdJobId);
  });

  it('3. PartnerDeliveryController: Partner goes online and sends heartbeat', async () => {
    const req = { user: { userId: partnerUserId, roles: ['PARTNER'] } };

    const onlineRes = await partnerDeliveryController.goOnline(req, {
      location: { latitude: 13.0805, longitude: 80.2405 },
      batteryPercentage: 92,
    });
    assert.strictEqual(onlineRes.status, 'ONLINE');

    const hbRes = await partnerDeliveryController.heartbeat(req, {
      location: { latitude: 13.0804, longitude: 80.2403 },
      batteryPercentage: 91,
    });
    assert.strictEqual(hbRes.success, true);
  });

  it('4. Merchant marks ready -> triggers auto-dispatch offer to nearby partner', async () => {
    const merchantReq = { user: { userId: merchantOwnerId, roles: ['MERCHANT_ADMIN'] } };
    const ready = await merchantDeliveryController.markReady(merchantReq, createdJobId);
    assert.ok(ready.status === 'READY_FOR_PICKUP' || ready.status === 'ASSIGNMENT_PENDING');

    // Run dispatch request
    await dispatchEngineService.requestDispatch(createdJobId);

    // Partner checks offers
    const partnerReq = { user: { userId: partnerUserId, roles: ['PARTNER'] } };
    const offers = await partnerDeliveryController.getPendingOffers(partnerReq);
    assert.ok(offers.length >= 1, 'Partner should receive dispatch offer');
    assert.strictEqual(offers[0].jobId, createdJobId);

    dispatchAttemptId = offers[0].attemptId;
  });

  it('5. PartnerDeliveryController: Partner accepts offer and inspects active job', async () => {
    const partnerReq = { user: { userId: partnerUserId, roles: ['PARTNER'] } };

    const acceptRes = await partnerDeliveryController.acceptOffer(partnerReq, dispatchAttemptId);
    assert.strictEqual(acceptRes.status, 'PARTNER_ASSIGNED');

    const activeJob = await partnerDeliveryController.getActiveJob(partnerReq);
    assert.ok(activeJob);
    assert.strictEqual(activeJob.id, createdJobId);
    assert.strictEqual(activeJob.status, 'PARTNER_ASSIGNED');
    assert.strictEqual(activeJob.handoverOtp, handoverOtp, 'Assigned partner has handover OTP');
  });

  it('6. Handover Lifecycle: Courier arrives, Merchant verifies OTP -> IN_TRANSIT', async () => {
    const partnerReq = { user: { userId: partnerUserId, roles: ['PARTNER'] } };
    const merchantReq = { user: { userId: merchantOwnerId, roles: ['MERCHANT_ADMIN'] } };

    // Partner arrives at pickup
    const arrived = await partnerDeliveryController.arrivedPickup(partnerReq, createdJobId);
    assert.strictEqual(arrived.status, 'PARTNER_ARRIVED');

    // Invalid OTP test
    await assert.rejects(
      async () => merchantDeliveryController.verifyHandover(merchantReq, createdJobId, { handoverOtp: '0000' }),
      /Invalid handover OTP/
    );

    // Valid OTP verification
    const verified = await merchantDeliveryController.verifyHandover(merchantReq, createdJobId, { handoverOtp });
    assert.strictEqual(verified.status, 'PICKED_UP');

    // Partner starts delivery
    const inTransit = await partnerDeliveryController.startDelivery(partnerReq, createdJobId);
    assert.strictEqual(inTransit.status, 'IN_TRANSIT');
  });

  it('7. Delivery Completion: Partner arrives at destination and completes with customer PIN', async () => {
    const partnerReq = { user: { userId: partnerUserId, roles: ['PARTNER'] } };

    // Partner arrives at dropoff
    const arrivedDest = await partnerDeliveryController.arrivedDestination(partnerReq, createdJobId);
    assert.strictEqual(arrivedDest.status, 'ARRIVED_AT_DESTINATION');

    // Wrong PIN rejected
    await assert.rejects(
      async () => partnerDeliveryController.completeDelivery(partnerReq, createdJobId, {
        deliveryPin: '9999',
        proofType: 'PIN',
      }),
      /Invalid delivery PIN/
    );

    // Valid PIN completion
    const completed = await partnerDeliveryController.completeDelivery(partnerReq, createdJobId, {
      deliveryPin,
      proofType: 'PIN',
      latitude: 13.0720,
      longitude: 80.2450,
    });
    assert.strictEqual(completed.status, 'DELIVERED');

    // Partner checks earnings ledger
    const earnings = await partnerDeliveryController.getEarnings(partnerReq);
    assert.ok(earnings.entries.length >= 1);
    assert.ok(earnings.totalEarningsInr > 0);
  });

  it('8. CustomerDeliveryController: Active deliveries & tracking queries with data redaction', async () => {
    const custReq = { user: { userId: customerUserId, roles: ['CUSTOMER'] } };

    // Since job is delivered, tracking query snapshot still works
    const tracking = await customerDeliveryController.getTrackingSnapshot(custReq, createdJobId);
    assert.strictEqual(tracking.id, createdJobId);
    assert.strictEqual(tracking.deliveryPin, deliveryPin);
    assert.strictEqual(tracking.handoverOtp, null, 'Customer view must NOT expose merchant handover OTP');
  });

  it('9. AdminDispatchController: Operational metrics, job details, and online partners radar', async () => {
    const stats = await adminDispatchController.getStats();
    assert.ok(typeof stats.deliveredToday === 'number');
    assert.ok(typeof stats.onlinePartners === 'number');

    const adminJobs = await adminDispatchController.listJobs('DELIVERED');
    assert.ok(adminJobs.items.some(j => j.id === createdJobId));

    const jobDetails = await adminDispatchController.getJobDetails(createdJobId);
    assert.strictEqual(jobDetails.id, createdJobId);
    assert.ok(jobDetails.events.length >= 5, 'Must contain complete timeline of status events');

    const onlinePartners = await adminDispatchController.getOnlinePartners();
    assert.ok(Array.isArray(onlinePartners));
  });
});
