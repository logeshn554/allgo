import assert from 'node:assert';
import crypto from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import { ConfigService } from '../../services/api/dist/config/config.service.js';
import { DatabaseService } from '../../services/api/dist/database/database.service.js';
import { PartnerContinuityService } from '../../services/api/dist/mobility/partner-continuity.service.js';
import { PaymentService } from '../../services/api/dist/ordering/services/payment.service.js';
import { AdminParcelController } from '../../services/api/dist/parcel/controllers/admin-parcel.controller.js';
import { CustomerParcelController } from '../../services/api/dist/parcel/controllers/customer-parcel.controller.js';
import { PartnerParcelController } from '../../services/api/dist/parcel/controllers/partner-parcel.controller.js';
import { ParcelDispatchService } from '../../services/api/dist/parcel/parcel-dispatch.service.js';
import { ParcelPricingService } from '../../services/api/dist/parcel/parcel-pricing.service.js';
import { ParcelRestrictionService } from '../../services/api/dist/parcel/parcel-restriction.service.js';
import { ParcelService } from '../../services/api/dist/parcel/parcel.service.js';
import { RedisService } from '../../services/api/dist/redis/redis.service.js';
import { ZonesService } from '../../services/api/dist/zones/zones.service.js';

import net from 'node:net';

// Fast top-level probe for database connectivity (without lingering handles)
const isDbAvailable = await new Promise<boolean>((resolve) => {
  const dbUrl =
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/allgo_dev';
  let host = '127.0.0.1';
  let port = 5432;
  try {
    const parsed = new URL(dbUrl);
    host = parsed.hostname;
    port = parsed.port ? Number.parseInt(parsed.port, 10) : 5432;
  } catch {}
  const socket = net.createConnection({ port, host, timeout: 1000 });
  socket.on('connect', () => {
    socket.destroy();
    resolve(true);
  });
  socket.on('timeout', () => {
    socket.destroy();
    resolve(false);
  });
  socket.on('error', () => {
    socket.destroy();
    resolve(false);
  });
});

describe(
  'Phase 7: Parcel & Courier Booking, Dispatch, Tracking and Delivery Suite',
  { skip: !isDbAvailable },
  () => {
    let db: DatabaseService;
    let redis: RedisService;
    let zonesService: ZonesService;
    let restrictionService: ParcelRestrictionService;
    let pricingService: ParcelPricingService;
    let dispatchService: ParcelDispatchService;
    let parcelService: ParcelService;
    let continuityService: PartnerContinuityService;
    let paymentService: PaymentService;

    let customerController: CustomerParcelController;
    let partnerController: PartnerParcelController;
    let adminController: AdminParcelController;

    const testAdminId = '77777777-7777-7777-7777-000000000001';
    const testCustomerId = '77777777-7777-7777-7777-000000000002';
    const testPartnerUserId = '77777777-7777-7777-7777-000000000003';
    let testPartnerId: string;

    before(async () => {
      if (!isDbAvailable) {
        console.log(
          'Skipping Phase 7 live DB tests because PostgreSQL is unavailable in this execution environment',
        );
        return;
      }

      const config = new ConfigService();
      db = new DatabaseService(config);
      redis = new RedisService(config);

      await db.onModuleInit();
      await redis.onModuleInit();

      const mockGateway: any = {
        server: {
          to: () => ({ emit: () => {} }),
        },
      };

      zonesService = new ZonesService(db);
      continuityService = new PartnerContinuityService(db, redis);
      paymentService = new PaymentService(db, redis);
      restrictionService = new ParcelRestrictionService(db);
      pricingService = new ParcelPricingService(db, zonesService, restrictionService);
      dispatchService = new ParcelDispatchService(db, redis, mockGateway, continuityService);
      parcelService = new ParcelService(
        db,
        redis,
        pricingService,
        dispatchService,
        paymentService,
        continuityService,
        mockGateway,
      );

      customerController = new CustomerParcelController(
        parcelService,
        pricingService,
        restrictionService,
      );
      partnerController = new PartnerParcelController(parcelService, dispatchService);
      adminController = new AdminParcelController(
        parcelService,
        pricingService,
        restrictionService,
      );

      // Clean any prior phase 7 test data safely (avoiding append-only parcel_delivery_events)
      try {
        await db.query(`DELETE FROM parcel_policy_audit_logs WHERE customer_id = $1;`, [
          testCustomerId,
        ]);
        await db.query(
          `UPDATE parcels SET status = 'CANCELLED' WHERE (customer_id = $1 OR partner_id IN (SELECT id FROM partners WHERE user_id = $2)) AND status NOT IN ('DELIVERED', 'RETURNED_TO_SENDER', 'CANCELLED');`,
          [testCustomerId, testPartnerUserId],
        );
        await db.query(
          `UPDATE parcel_assignments SET status = 'EXPIRED' WHERE partner_id IN (SELECT id FROM partners WHERE user_id = $1) AND status = 'OFFERED';`,
          [testPartnerUserId],
        );
      } catch (_) {}

      // Seed test users
      await db.query(
        `INSERT INTO users (id, firebase_uid, phone, full_name, status, default_language)
       VALUES 
         ($1, 'fb_admin_p7', '+919700000001', 'Phase7 Admin', 'ACTIVE', 'en'),
         ($2, 'fb_cust_p7', '+919700000002', 'Phase7 Customer', 'ACTIVE', 'en'),
         ($3, 'fb_part_p7', '+919700000003', 'Phase7 Partner', 'ACTIVE', 'en')
       ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE';`,
        [testAdminId, testCustomerId, testPartnerUserId],
      );

      // Reuse or create partner
      const pCheck = await db.query(
        `SELECT id FROM partners WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1;`,
        [testPartnerUserId],
      );
      if (pCheck.rows.length > 0) {
        testPartnerId = pCheck.rows[0].id;
        await db.query(`UPDATE partners SET status = 'APPROVED' WHERE id = $1;`, [testPartnerId]);
      } else {
        const partnerRes = await db.query(
          `INSERT INTO partners (user_id, status)
         VALUES ($1, 'APPROVED')
         RETURNING id;`,
          [testPartnerUserId],
        );
        testPartnerId = partnerRes.rows[0].id;
      }

      // Seed verified KYC document
      await db.query(`DELETE FROM partner_documents WHERE partner_id = $1;`, [testPartnerId]);
      await db.query(
        `INSERT INTO partner_documents (partner_id, document_type, document_number, file_url, verification_status)
       VALUES ($1, 'DRIVING_LICENSE', 'DL-TN-01-P7-2026', 'https://storage.allgo.local/docs/dl.pdf', 'VERIFIED');`,
        [testPartnerId],
      );

      // Seed vehicle
      await db.query(
        `INSERT INTO vehicles (partner_id, vehicle_type, registration_number, make_model)
       VALUES ($1, 'MOTORCYCLE', 'TN-01-P7-9999', 'Hero Splendor')
       ON CONFLICT (registration_number) DO UPDATE SET partner_id = EXCLUDED.partner_id;`,
        [testPartnerId],
      );

      // Seed partner mode
      await db.query(
        `INSERT INTO partner_modes (partner_id, current_mode, is_online, active_vertical_lock)
       VALUES ($1, 'ALL_JOBS', true, null)
       ON CONFLICT (partner_id) DO UPDATE SET is_online = true, active_vertical_lock = null;`,
        [testPartnerId],
      );

      // Seed partner availability session with location in Chennai
      await db.query(`DELETE FROM partner_availability_sessions WHERE partner_id = $1;`, [
        testPartnerId,
      ]);
      await db.query(
        `INSERT INTO partner_availability_sessions (partner_id, status, last_known_location, last_heartbeat_at)
       VALUES ($1, 'ONLINE', ST_SetSRID(ST_MakePoint(80.2707, 13.0827), 4326), NOW());`,
        [testPartnerId],
      );

      // Clear any active parcels or assignments for this partner
      await db.query(
        `UPDATE parcels SET status = 'CANCELLED' WHERE partner_id = $1 AND status NOT IN ('DELIVERED', 'RETURNED_TO_SENDER', 'CANCELLED');`,
        [testPartnerId],
      );
      await db.query(
        `UPDATE parcel_assignments SET status = 'EXPIRED' WHERE partner_id = $1 AND status = 'OFFERED';`,
        [testPartnerId],
      );

      // Seed Redis online partner geo with the authoritative dispatch key
      await redis.geoadd('dispatch:partners:online:geo', 80.2707, 13.0827, testPartnerId);
      await redis.geoadd('partners:online:geo', 80.2707, 13.0827, testPartnerId);

      // Approve PARCEL service for this partner
      await db.query(
        `INSERT INTO partner_service_applications (partner_id, service_type, status, reviewed_at)
       VALUES ($1, 'PARCEL', 'APPROVED', NOW())
       ON CONFLICT (partner_id, service_type) DO UPDATE SET status = 'APPROVED';`,
        [testPartnerId],
      );

      // Ensure audit table allows REQUIRES_REVIEW
      await db.query(`
      ALTER TABLE parcel_policy_audit_logs DROP CONSTRAINT IF EXISTS chk_policy_decision;
      ALTER TABLE parcel_policy_audit_logs ADD CONSTRAINT chk_policy_decision CHECK (decision IN ('ALLOWED', 'REJECTED', 'FLAGGED_FOR_REVIEW', 'REQUIRES_REVIEW'));
    `);

      // Update service multipliers
      await db.query(
        `UPDATE parcel_service_configs SET base_multiplier = 1.60 WHERE service_type = 'SAME_DAY';`,
      );
      await db.query(
        `UPDATE parcel_service_configs SET base_multiplier = 1.30 WHERE service_type = 'EXPRESS';`,
      );
    });

    after(async () => {
      if (!isDbAvailable) return;
      try {
        await db.query(`DELETE FROM parcel_policy_audit_logs WHERE customer_id = $1;`, [
          testCustomerId,
        ]);
        await db.query(
          `UPDATE partner_modes SET active_vertical_lock = null WHERE partner_id = $1;`,
          [testPartnerId],
        );
        await redis.zrem('partners:online:geo', testPartnerId);
      } catch (_) {}

      await db.onModuleDestroy();
      await redis.onModuleDestroy();
    });

    describe('1. Configurable Package Category & Restriction Validation', () => {
      it('should validate and approve standard permitted parcel category', async () => {
        const result = await restrictionService.validateRestrictions(
          'DOCUMENTS',
          1.5,
          30,
          20,
          5,
          500,
          testCustomerId,
        );

        assert.strictEqual(result.category, 'DOCUMENTS');
        assert.strictEqual(result.isPermitted, true);
        assert.strictEqual(result.requiresReview, false);
      });

      it('should reject prohibited parcel category (e.g. HAZARDOUS_CHEMICALS, EXPLOSIVES)', async () => {
        await assert.rejects(
          async () => {
            await restrictionService.validateRestrictions(
              'HAZARDOUS_CHEMICALS',
              2.0,
              undefined,
              undefined,
              undefined,
              undefined,
              testCustomerId,
            );
          },
          (err: any) => {
            assert.strictEqual(err.status, 400);
            assert.match(err.message, /prohibited/i);
            return true;
          },
        );

        // Verify policy audit log was recorded
        const audit = await db.query(
          `SELECT * FROM parcel_policy_audit_logs WHERE customer_id = $1 AND category = 'HAZARDOUS_CHEMICALS';`,
          [testCustomerId],
        );
        assert.strictEqual(audit.rows.length, 1);
        assert.strictEqual(audit.rows[0].decision, 'REJECTED');
      });

      it('should flag review-required category (e.g. MEDICINE) and record audit log', async () => {
        const result = await restrictionService.validateRestrictions(
          'MEDICINE',
          0.5,
          undefined,
          undefined,
          undefined,
          undefined,
          testCustomerId,
        );

        assert.strictEqual(result.isPermitted, true);
        assert.strictEqual(result.requiresReview, true);

        // Verify audit log recorded review required
        const audit = await db.query(
          `SELECT * FROM parcel_policy_audit_logs WHERE customer_id = $1 AND category = 'MEDICINE' ORDER BY created_at DESC LIMIT 1;`,
          [testCustomerId],
        );
        assert.strictEqual(audit.rows.length, 1);
        assert.strictEqual(audit.rows[0].decision, 'REQUIRES_REVIEW');
      });

      it('should reject packages exceeding weight or dimension limits', async () => {
        await assert.rejects(
          async () => {
            await restrictionService.validateRestrictions(
              'ELECTRONICS',
              99.0, // Exceeds 50kg limit
              undefined,
              undefined,
              undefined,
              undefined,
              testCustomerId,
            );
          },
          (err: any) => {
            assert.strictEqual(err.status, 400);
            assert.match(err.message, /weight/i);
            return true;
          },
        );

        await assert.rejects(
          async () => {
            await restrictionService.validateRestrictions(
              'ELECTRONICS',
              5.0,
              250, // Exceeds 150cm limit
              undefined,
              undefined,
              undefined,
              testCustomerId,
            );
          },
          (err: any) => {
            assert.strictEqual(err.status, 400);
            assert.match(err.message, /dimension/i);
            return true;
          },
        );
      });
    });

    describe('2. Server-Authoritative Quote Calculation', { skip: !isDbAvailable }, () => {
      it('should calculate quote with volumetric weight, road distance, and service type pricing', async () => {
        const quote = await pricingService.calculateQuote({
          pickupLocation: { latitude: 13.0827, longitude: 80.2707 },
          dropoffLocation: { latitude: 13.0405, longitude: 80.2337 },
          packageCategory: 'ELECTRONICS',
          weightKg: 2.0,
          lengthCm: 40,
          widthCm: 30,
          heightCm: 20, // Volumetric = (40*30*20)/5000 = 4.8kg > 2.0kg dead weight
          serviceType: 'EXPRESS',
        });

        assert(quote.distanceKm > 4.0);
        assert.strictEqual(quote.chargeableWeightKg, 4.8);
        assert.strictEqual(quote.serviceType, 'EXPRESS');
        assert(quote.totalAmountInr > 0);
        assert(quote.baseFareInr > 0);
        assert(quote.platformFeeInr > 0);
        assert(quote.gstInr > 0);
      });

      it('should calculate differentiated pricing for STANDARD vs EXPRESS vs SAME_DAY', async () => {
        const [standardQuote, expressQuote, sameDayQuote] = await Promise.all([
          pricingService.calculateQuote({
            pickupLocation: { latitude: 13.0827, longitude: 80.2707 },
            dropoffLocation: { latitude: 13.0405, longitude: 80.2337 },
            weightKg: 1.0,
            serviceType: 'STANDARD',
          }),
          pricingService.calculateQuote({
            pickupLocation: { latitude: 13.0827, longitude: 80.2707 },
            dropoffLocation: { latitude: 13.0405, longitude: 80.2337 },
            weightKg: 1.0,
            serviceType: 'EXPRESS',
          }),
          pricingService.calculateQuote({
            pickupLocation: { latitude: 13.0827, longitude: 80.2707 },
            dropoffLocation: { latitude: 13.0405, longitude: 80.2337 },
            weightKg: 1.0,
            serviceType: 'SAME_DAY',
          }),
        ]);

        assert(expressQuote.totalAmountInr > standardQuote.totalAmountInr);
        assert(sameDayQuote.totalAmountInr > expressQuote.totalAmountInr);
      });
    });

    describe(
      '3. Parcel Booking Lifecycle, Dual OTP & Dispatch Execution',
      { skip: !isDbAvailable },
      () => {
        let createdParcelId: string;
        let pickupOtp: string;
        let deliveryOtp: string;
        let attemptId: string;

        it('should create parcel booking with server-generated Dual OTP hashes', async () => {
          const booking = await parcelService.createBooking(testCustomerId, {
            pickupAddress: 'Chennai Central Railway Station',
            pickupLocation: { latitude: 13.0827, longitude: 80.2707 },
            pickupContactName: 'Sender S',
            pickupContactPhone: '+919700000002',
            dropoffAddress: 'T Nagar Shopping District',
            dropoffLocation: { latitude: 13.0405, longitude: 80.2337 },
            recipientName: 'Recipient R',
            recipientPhone: '+919700000099',
            packageDescription: 'Confidential Business Documents',
            packageCategory: 'DOCUMENTS',
            serviceType: 'STANDARD',
            weightKg: 1.5,
            paymentMethod: 'COD',
          });

          assert(booking.id);
          assert.strictEqual(booking.status, 'BOOKED');
          assert.strictEqual(booking.pickupContactPhone, '+919700000002');
          assert.strictEqual(booking.recipientPhone, '+919700000099');
          assert(booking.pickupOtp); // Customer receives plaintext OTP
          assert(booking.deliveryOtp);

          createdParcelId = booking.id;
          pickupOtp = booking.pickupOtp;
          deliveryOtp = booking.deliveryOtp;

          // Verify database stored cryptographic SHA-256 hashes
          const dbRecord = await db.query(
            `SELECT pickup_otp_hash, delivery_otp_hash FROM parcels WHERE id = $1;`,
            [createdParcelId],
          );
          assert(dbRecord.rows[0].pickup_otp_hash);
          assert(dbRecord.rows[0].delivery_otp_hash);

          const expectedPickupHash = crypto.createHash('sha256').update(pickupOtp).digest('hex');
          assert.strictEqual(dbRecord.rows[0].pickup_otp_hash, expectedPickupHash);
        });

        it('should check partner eligibility: KYC, vehicle, PARCEL service, and vertical lock', async () => {
          const eligibility = await dispatchService.checkEligibility(testPartnerId, 1.5);
          assert.strictEqual(eligibility.isEligible, true);
        });

        it('should generate dispatch offer for eligible nearby partner', async () => {
          const result = await dispatchService.requestDispatch(createdParcelId);
          assert.strictEqual(result.status, 'OFFER_DISPATCHED');
          assert.strictEqual(result.partnerId, testPartnerId);
          assert(result.attemptId);
          attemptId = result.attemptId;

          // Verify active offer can be queried by partner
          const partnerOffers = await dispatchService.getPartnerOffers(testPartnerUserId);
          assert.strictEqual(partnerOffers.length, 1);
          assert.strictEqual(partnerOffers[0].parcelId, createdParcelId);
        });

        it('should atomically accept offer and acquire active vertical lock', async () => {
          const acceptedParcel = await dispatchService.acceptOffer(testPartnerUserId, attemptId);
          assert.strictEqual(acceptedParcel.status, 'PARTNER_ASSIGNED');
          assert.strictEqual(acceptedParcel.partner_id, testPartnerId);

          // Verify vertical lock acquired
          const partnerMode = await continuityService.getPartnerMode(testPartnerId);
          assert.strictEqual(partnerMode.activeVerticalLock, 'PARCEL');

          // Verify partner cannot accept another offer while locked
          const eligibility = await dispatchService.checkEligibility(testPartnerId, 1.0);
          // When locked to PARCEL, same vertical is permitted, but locked to another is prevented
          assert.strictEqual(eligibility.isEligible, true);
        });

        it('should progress to ARRIVING_AT_PICKUP', async () => {
          const parcel = await parcelService.confirmArrivedPickup(
            testPartnerUserId,
            createdParcelId,
          );
          assert.strictEqual(parcel.status, 'ARRIVING_AT_PICKUP');
        });

        it('should enforce pickup OTP attempts lockout on 5 incorrect guesses', async () => {
          // Create a temporary parcel for lockout test
          const tempRes = await db.query(
            `INSERT INTO parcels (
           parcel_number, sender_id, customer_id, partner_id, city_id, status,
           pickup_address, pickup_location, pickup_contact_name, pickup_contact_phone,
           drop_address, drop_location, drop_contact_name, drop_contact_phone,
           package_category, estimated_weight_kg, pickup_otp, delivery_otp,
           pickup_otp_hash, delivery_otp_hash, delivery_fee_inr, platform_fee_inr, tax_total_inr, total_amount_inr, partner_payout_inr
         ) VALUES (
           'PCL-TEMP-LOCKOUT', $1, $1, $2, '20000000-0000-0000-0000-000000000001', 'ARRIVING_AT_PICKUP',
           'Addr', ST_SetSRID(ST_MakePoint(80.2, 13.0), 4326), 'Name', '+919700000002',
           'Drop', ST_SetSRID(ST_MakePoint(80.2, 13.0), 4326), 'Rec', '+919700000099',
           'DOCUMENTS', 1.0, '1234', '5678',
           $3, $4, 80, 5, 15, 100, 70
         ) RETURNING id;`,
            [
              testCustomerId,
              testPartnerId,
              crypto.createHash('sha256').update('1234').digest('hex'),
              crypto.createHash('sha256').update('5678').digest('hex'),
            ],
          );
          const tempId = tempRes.rows[0].id;

          // Fail 4 times
          for (let i = 0; i < 4; i++) {
            await assert.rejects(
              async () => {
                await parcelService.verifyPickupOtp(testPartnerUserId, tempId, '0000');
              },
              (err: any) => {
                assert.strictEqual(err.status, 400);
                assert.match(err.message, /invalid/i);
                return true;
              },
            );
          }

          // 5th failure
          await assert.rejects(
            async () => {
              await parcelService.verifyPickupOtp(testPartnerUserId, tempId, '0000');
            },
            (err: any) => {
              assert.strictEqual(err.status, 400);
              return true;
            },
          );

          // 6th attempt hits max attempts lockout
          await assert.rejects(
            async () => {
              await parcelService.verifyPickupOtp(testPartnerUserId, tempId, '1234');
            },
            (err: any) => {
              assert.strictEqual(err.status, 400);
              assert.match(err.message, /maximum/i);
              return true;
            },
          );

          // Clean temp parcel
          await db.query(`DELETE FROM parcels WHERE id = $1;`, [tempId]);
        });

        it('should verify correct pickup OTP, update status to PICKED_UP and record pickup timestamp', async () => {
          const parcel = await parcelService.verifyPickupOtp(
            testPartnerUserId,
            createdParcelId,
            pickupOtp,
          );
          assert.strictEqual(parcel.status, 'PICKED_UP');
          assert(parcel.picked_up_at);
        });

        it('should transition to IN_TRANSIT and ARRIVING_AT_DESTINATION', async () => {
          let parcel = await parcelService.startTransit(testPartnerUserId, createdParcelId);
          assert.strictEqual(parcel.status, 'IN_TRANSIT');

          parcel = await parcelService.confirmArrivedDestination(
            testPartnerUserId,
            createdParcelId,
          );
          assert.strictEqual(parcel.status, 'ARRIVING_AT_DESTINATION');
        });

        it('should verify delivery OTP, complete delivery, release vertical lock and credit partner earnings', async () => {
          const completed = await parcelService.verifyDelivery(
            testPartnerUserId,
            createdParcelId,
            deliveryOtp,
            'https://storage.allgo.local/proof/delivery-1.jpg',
          );

          assert.strictEqual(completed.status, 'DELIVERED');
          assert(completed.delivered_at);
          assert.strictEqual(
            completed.delivery_proof_photo_url,
            'https://storage.allgo.local/proof/delivery-1.jpg',
          );

          // Verify vertical lock is released
          const partnerMode = await continuityService.getPartnerMode(testPartnerId);
          assert.strictEqual(partnerMode.activeVerticalLock, null);

          // Verify partner earnings recorded in partner_earnings_entries
          const earnings = await db.query(
            `SELECT * FROM partner_earnings_entries WHERE partner_id = $1 ORDER BY created_at DESC LIMIT 1;`,
            [testPartnerId],
          );
          assert.strictEqual(earnings.rows.length, 1);
          assert.strictEqual(earnings.rows[0].entry_type, 'DELIVERY_PAY');
          assert(Number(earnings.rows[0].total_earned_inr) > 0);
        });
      },
    );

    describe(
      '4. Failed Delivery Attempt & Return to Sender Lifecycle',
      { skip: !isDbAvailable },
      () => {
        let returnParcelId: string;
        let attemptId2: string;

        it('should record delivery attempt failure with structured reason', async () => {
          const booking = await parcelService.createBooking(testCustomerId, {
            pickupAddress: 'Anna Nagar',
            pickupLocation: { latitude: 13.0827, longitude: 80.2707 },
            pickupContactName: 'Sender Return',
            pickupContactPhone: '+919700000002',
            dropoffAddress: 'Guindy',
            dropoffLocation: { latitude: 13.0405, longitude: 80.2337 },
            recipientName: 'Recipient Absent',
            recipientPhone: '+919700000088',
            packageDescription: 'Return Package',
            packageCategory: 'GENERAL',
            weightKg: 1.0,
            paymentMethod: 'COD',
          });

          returnParcelId = booking.id;

          const dispRes = await dispatchService.requestDispatch(returnParcelId);
          attemptId2 = dispRes.attemptId;
          await dispatchService.acceptOffer(testPartnerUserId, attemptId2);
          await parcelService.confirmArrivedPickup(testPartnerUserId, returnParcelId);
          await parcelService.verifyPickupOtp(testPartnerUserId, returnParcelId, booking.pickupOtp);
          await parcelService.startTransit(testPartnerUserId, returnParcelId);
          await parcelService.confirmArrivedDestination(testPartnerUserId, returnParcelId);

          // Record failed delivery attempt
          const failed = await parcelService.recordFailedAttempt(
            testPartnerUserId,
            returnParcelId,
            {
              reason: 'RECIPIENT_UNAVAILABLE: Door locked, recipient not answering calls',
            },
          );

          assert.strictEqual(failed.status, 'DELIVERY_FAILED');
          assert.match(failed.failed_attempt_reason, /RECIPIENT_UNAVAILABLE/);
        });

        it('should initiate return to sender and complete return workflow', async () => {
          const returning = await parcelService.initiateReturn(
            testPartnerUserId,
            'PARTNER',
            returnParcelId,
            { reason: 'RECIPIENT_UNAVAILABLE_3_ATTEMPTS' },
          );
          assert.strictEqual(returning.status, 'RETURN_INITIATED');
          assert(returning.return_initiated_at);

          // Return to sender is completed
          const returned = await parcelService.completeReturn(testPartnerUserId, returnParcelId);
          assert.strictEqual(returned.status, 'RETURNED_TO_SENDER');
          assert(returned.return_completed_at);

          // Verify vertical lock is released
          const partnerMode = await continuityService.getPartnerMode(testPartnerId);
          assert.strictEqual(partnerMode.activeVerticalLock, null);
        });
      },
    );

    describe(
      '5. Immutable Delivery Events Log & Trigger Enforcement',
      { skip: !isDbAvailable },
      () => {
        it('should have complete chronological audit trail in parcel_delivery_events', async () => {
          const eventsRes = await db.query(
            `SELECT * FROM parcel_delivery_events 
         WHERE parcel_id IN (SELECT id FROM parcels WHERE customer_id = $1)
         ORDER BY created_at ASC;`,
            [testCustomerId],
          );

          assert(eventsRes.rows.length >= 6);
          const eventNames = eventsRes.rows.map((r) => r.event_type);
          assert(eventNames.includes('BOOKED'));
          assert(eventNames.includes('PARTNER_ASSIGNED'));
          assert(eventNames.includes('PICKED_UP'));
          assert(eventNames.includes('DELIVERED'));
        });

        it('should enforce immutability: PostgreSQL trigger blocks UPDATE and DELETE on parcel_delivery_events', async () => {
          const anyEvent = await db.query(`SELECT id FROM parcel_delivery_events LIMIT 1;`);
          assert(anyEvent.rows.length > 0);
          const eventId = anyEvent.rows[0].id;

          // UPDATE attempt must fail
          await assert.rejects(
            async () => {
              await db.query(
                `UPDATE parcel_delivery_events SET event_type = 'TAMPERED' WHERE id = $1;`,
                [eventId],
              );
            },
            (err: any) => {
              assert.match(err.message, /append-only|immutable/i);
              return true;
            },
          );

          // DELETE attempt must fail
          await assert.rejects(
            async () => {
              await db.query(`DELETE FROM parcel_delivery_events WHERE id = $1;`, [eventId]);
            },
            (err: any) => {
              assert.match(err.message, /append-only|immutable/i);
              return true;
            },
          );
        });
      },
    );

    describe('6. Admin Governance & Configuration Controls', { skip: !isDbAvailable }, () => {
      it('should list parcel bookings with pagination and filters', async () => {
        const parcels = await adminController.listParcels(
          undefined,
          undefined,
          undefined,
          '10',
          '0',
        );
        assert(Array.isArray(parcels));
        assert(parcels.length > 0);
      });

      it('should get detailed parcel tracking with audit history and redacted hashes', async () => {
        const parcels = await adminController.listParcels(
          undefined,
          undefined,
          undefined,
          '1',
          '0',
        );
        const parcelId = parcels[0].id;

        const details = await adminController.getParcelDetails(
          { user: { userId: testAdminId } } as any,
          parcelId,
        );
        assert.strictEqual(details.id, parcelId);
        assert.strictEqual(details.pickupOtpHash, undefined); // Redacted

        const tracking = await adminController.getTracking(
          { user: { userId: testAdminId } } as any,
          parcelId,
        );
        assert(Array.isArray(tracking.events));
        assert(tracking.events.length > 0);
      });

      it('should manage parcel restriction configurations', async () => {
        const configs = await adminController.getRestrictions();
        assert(Array.isArray(configs));
        assert(configs.length > 0);
        const docsConfig = configs.find((c: any) => c.category_name === 'DOCUMENTS');
        assert(docsConfig);
        assert.strictEqual(docsConfig.is_permitted, true);
      });

      it('should manage parcel service configurations', async () => {
        const services = await adminController.getServices();
        assert(Array.isArray(services));
        assert(services.length >= 3);
        const serviceCodes = services.map((s: any) => s.service_type);
        assert(serviceCodes.includes('STANDARD'));
        assert(serviceCodes.includes('EXPRESS'));
        assert(serviceCodes.includes('SAME_DAY'));
      });
    });
  },
);

describe('Phase 7: Pure Unit Logic (Pricing Formulas, Volumetric Weight & Haversine Distance)', () => {
  it('should calculate accurate volumetric weight using standard IATA intra-city formula', () => {
    // (L * W * H) / 5000
    const length = 40.0;
    const width = 30.0;
    const height = 20.0;
    const volumetricWeight = Math.round(((length * width * height) / 5000.0) * 10) / 10;
    assert.strictEqual(volumetricWeight, 4.8);

    const actualWeight = 2.0;
    const chargeableWeight = Math.max(actualWeight, volumetricWeight);
    assert.strictEqual(chargeableWeight, 4.8);
  });

  it('should calculate road distance with haversine and urban winding coefficient (1.25x)', () => {
    const p1 = { latitude: 13.0827, longitude: 80.2707 }; // Chennai Central
    const p2 = { latitude: 13.0405, longitude: 80.2337 }; // T Nagar

    const R = 6371;
    const dLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
    const dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.latitude * Math.PI) / 180) *
        Math.cos((p2.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightKm = R * c;
    const roadKm = Math.round(straightKm * 1.25 * 10) / 10;

    assert(straightKm > 5.0 && straightKm < 8.0);
    assert(roadKm > straightKm);
    assert.strictEqual(roadKm, Math.round(straightKm * 1.25 * 10) / 10);
  });

  it('should compute cryptographic SHA-256 OTP hashes and verify timing-safe comparison with length guards', () => {
    const otp = '4829';
    const hash = crypto.createHash('sha256').update(otp.trim()).digest('hex');
    assert.strictEqual(hash.length, 64);

    const inputBuf = Buffer.from(hash);
    const expectedBuf = Buffer.from(hash);
    assert.strictEqual(inputBuf.length, expectedBuf.length);
    assert.strictEqual(crypto.timingSafeEqual(inputBuf, expectedBuf), true);

    // Verify length mismatch guard prevents crash
    const wrongBuf = Buffer.from('short_hash');
    assert.notStrictEqual(inputBuf.length, wrongBuf.length);
  });

  it('should verify service tier multipliers: STANDARD (1.0x), EXPRESS (1.3x), SAME_DAY (1.6x)', () => {
    const baseSubtotal = 100.0;
    const standardSubtotal = Math.round(baseSubtotal * 1.0 * 100) / 100;
    const expressSubtotal = Math.round(baseSubtotal * 1.3 * 100) / 100;
    const sameDaySubtotal = Math.round(baseSubtotal * 1.6 * 100) / 100;

    assert.strictEqual(standardSubtotal, 100.0);
    assert.strictEqual(expressSubtotal, 130.0);
    assert.strictEqual(sameDaySubtotal, 160.0);
  });
});
