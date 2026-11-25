import assert from 'node:assert';
import { after, before, describe, it } from 'node:test';
import { ConfigService } from '../../services/api/dist/config/config.service.js';
import { DatabaseService } from '../../services/api/dist/database/database.service.js';
import { AdminMobilityController } from '../../services/api/dist/mobility/controllers/admin-mobility.controller.js';
import { HireDriverController } from '../../services/api/dist/mobility/controllers/hire-driver.controller.js';
import { ParcelsController } from '../../services/api/dist/mobility/controllers/parcels.controller.js';
import { PartnerContinuityController } from '../../services/api/dist/mobility/controllers/partner-continuity.controller.js';
import { RidesController } from '../../services/api/dist/mobility/controllers/rides.controller.js';
import { HireDriverService } from '../../services/api/dist/mobility/hire-driver.service.js';
import { MobilityFareService } from '../../services/api/dist/mobility/mobility-fare.service.js';
import { ParcelsService } from '../../services/api/dist/mobility/parcels.service.js';
import { PartnerContinuityService } from '../../services/api/dist/mobility/partner-continuity.service.js';
import { RidesService } from '../../services/api/dist/mobility/rides.service.js';
import { RedisService } from '../../services/api/dist/redis/redis.service.js';

describe('Phase 5: Mobility, Rides, Parcels, Hire-Driver & Partner Continuity Suite', () => {
  let config: ConfigService;
  let db: DatabaseService;
  let redis: RedisService;
  let fareService: MobilityFareService;
  let continuityService: PartnerContinuityService;
  let ridesService: RidesService;
  let parcelsService: ParcelsService;
  let hireDriverService: HireDriverService;

  let ridesController: RidesController;
  let parcelsController: ParcelsController;
  let hireDriverController: HireDriverController;
  let partnerContinuityController: PartnerContinuityController;
  let adminMobilityController: AdminMobilityController;

  const customerUserId = '66666666-6666-6666-6666-000000000001';
  const partnerUserId = '66666666-6666-6666-6666-000000000002';
  const adminUserId = '66666666-6666-6666-6666-000000000003';

  let testPartnerId: string;
  let testRideId: string;
  let rideStartOtp: string;
  let testParcelId: string;
  let parcelPickupOtp: string;
  let parcelDeliveryOtp: string;
  let testHireBookingId: string;
  let hireStartOtp: string;
  let hireEndOtp: string;

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

    fareService = new MobilityFareService(db);
    continuityService = new PartnerContinuityService(db, redis);
    ridesService = new RidesService(db, fareService, continuityService);
    parcelsService = new ParcelsService(db, fareService, continuityService);
    hireDriverService = new HireDriverService(db, fareService, continuityService);

    ridesController = new RidesController(ridesService, fareService);
    parcelsController = new ParcelsController(parcelsService, fareService);
    hireDriverController = new HireDriverController(hireDriverService, fareService);
    partnerContinuityController = new PartnerContinuityController(continuityService);
    adminMobilityController = new AdminMobilityController(db);

    // Clean prior artifacts
    try {
      await db.query(
        `DELETE FROM mobility_sos_events WHERE triggered_by_user_id IN ('${customerUserId}', '${partnerUserId}');`,
      );
      await db.query(`DELETE FROM hire_driver_bookings WHERE customer_id = '${customerUserId}';`);
      await db.query(`DELETE FROM parcels WHERE sender_id = '${customerUserId}';`);
      await db.query(`DELETE FROM rides WHERE customer_id = '${customerUserId}';`);
      await db.query(
        `DELETE FROM partner_modes WHERE partner_id IN (SELECT id FROM partners WHERE user_id = '${partnerUserId}');`,
      );
      await db.query(
        `DELETE FROM partner_earnings_entries WHERE partner_id IN (SELECT id FROM partners WHERE user_id = '${partnerUserId}');`,
      );
      await db.query(
        `DELETE FROM vehicles WHERE partner_id IN (SELECT id FROM partners WHERE user_id = '${partnerUserId}');`,
      );
      await db.query(
        `DELETE FROM partner_documents WHERE partner_id IN (SELECT id FROM partners WHERE user_id = '${partnerUserId}');`,
      );
      await db.query(`DELETE FROM partners WHERE user_id = '${partnerUserId}';`);
      await db.query(
        `DELETE FROM users WHERE id IN ('${customerUserId}', '${partnerUserId}', '${adminUserId}');`,
      );
    } catch {}

    // Seed test users
    await db.query(`
      INSERT INTO users (id, phone, full_name, status, firebase_uid, created_at, updated_at)
      VALUES
        ('${customerUserId}', '+919999000031', 'Phase5 Customer', 'ACTIVE', 'fb_p5_c_01', NOW(), NOW()),
        ('${partnerUserId}', '+919999000032', 'Phase5 Multijob Partner', 'ACTIVE', 'fb_p5_p_01', NOW(), NOW()),
        ('${adminUserId}', '+919999000033', 'Phase5 Mobility Admin', 'ACTIVE', 'fb_p5_a_01', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE';
    `);

    // Seed partner & dual vehicle (Motorcycle & Cab)
    const pRes = await db.query(`
      INSERT INTO partners (user_id, status)
      VALUES ('${partnerUserId}', 'APPROVED')
      RETURNING id;
    `);
    testPartnerId = pRes.rows[0].id;

    await db.query(`
      INSERT INTO vehicles (partner_id, vehicle_type, registration_number, make_model)
      VALUES ('${testPartnerId}', 'MOTORCYCLE', 'TN-01-P5-1111', 'Bajaj Pulsar 150')
      ON CONFLICT (registration_number) DO NOTHING;
    `);

    await db.query(`
      INSERT INTO partner_modes (partner_id, current_mode, is_online, active_vertical_lock)
      VALUES ('${testPartnerId}', 'ALL_JOBS', true, null)
      ON CONFLICT (partner_id) DO NOTHING;
    `);
  });

  after(async () => {
    if (!isLiveAvailable) {
      return;
    }
    try {
      await db.query(
        `DELETE FROM mobility_sos_events WHERE triggered_by_user_id IN ('${customerUserId}', '${partnerUserId}');`,
      );
      await db.query(`DELETE FROM hire_driver_bookings WHERE customer_id = '${customerUserId}';`);
      await db.query(`DELETE FROM parcels WHERE sender_id = '${customerUserId}';`);
      await db.query(`DELETE FROM rides WHERE customer_id = '${customerUserId}';`);
      if (testPartnerId) {
        await db.query(`DELETE FROM partner_modes WHERE partner_id = '${testPartnerId}';`);
        await db.query(
          `DELETE FROM partner_earnings_entries WHERE partner_id = '${testPartnerId}';`,
        );
        await db.query(`DELETE FROM vehicles WHERE partner_id = '${testPartnerId}';`);
        await db.query(`DELETE FROM partner_documents WHERE partner_id = '${testPartnerId}';`);
        await db.query(`DELETE FROM partners WHERE id = '${testPartnerId}';`);
      }
      await db.query(
        `DELETE FROM users WHERE id IN ('${customerUserId}', '${partnerUserId}', '${adminUserId}');`,
      );
    } catch {}
    await db.onModuleDestroy();
    await redis.onModuleDestroy();
  });

  it('1. State Regulatory Feature Gating enforces compliance', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    // Unauthorized state (e.g. Maharashtra before clearance)
    await assert.rejects(async () => {
      await fareService.checkStateClearance('MH', 'RIDE');
    }, /Mobility operations not authorized in state: MH/);

    // Authorized state (Tamil Nadu dev pilot)
    const tnApproved = await fareService.checkStateClearance('TN', 'RIDE');
    assert.strictEqual(tnApproved, true);
  });

  it('2. Multi-Vehicle Ride Fare Estimation calculates accurate pricing and 5% GST', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    const pickup = { latitude: 13.0827, longitude: 80.2707 }; // Chennai Central
    const dropoff = { latitude: 13.0604, longitude: 80.2496 }; // T. Nagar (~5km)

    const estimates = await ridesController.estimateFare({
      pickupLocation: pickup,
      dropoffLocation: dropoff,
      stateCode: 'TN',
    });

    assert.strictEqual(
      estimates.length,
      4,
      'Must compute estimates for BIKE, AUTO, CAB_ECONOMY, CAB_PREMIUM',
    );

    const bike = estimates.find((e) => e.vehicleCategory === 'BIKE')!;
    const auto = estimates.find((e) => e.vehicleCategory === 'AUTO')!;
    const cab = estimates.find((e) => e.vehicleCategory === 'CAB_ECONOMY')!;

    assert.ok(bike.totalFareInr < auto.totalFareInr);
    assert.ok(auto.totalFareInr < cab.totalFareInr);
    assert.ok(bike.gstInr > 0, 'Must include statutory 5% GST');
    assert.ok(bike.platformFeeInr >= 3.0);
  });

  it('3. Ride Booking creates ride with server-generated Start OTP', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    const req = { user: { userId: customerUserId, roles: ['CUSTOMER'] } };

    const ride = await ridesController.bookRide(req, {
      pickupLocation: { latitude: 13.0827, longitude: 80.2707 },
      pickupAddress: 'Chennai Central Railway Station',
      dropoffLocation: { latitude: 13.0604, longitude: 80.2496 },
      dropoffAddress: 'Pondy Bazaar, T. Nagar, Chennai',
      vehicleCategory: 'BIKE',
      paymentMethod: 'ONLINE',
      stateCode: 'TN',
    });

    assert.ok(ride.id);
    assert.strictEqual(ride.status, 'REQUESTED');
    assert.ok(ride.ride_number.startsWith('RID-'));
    assert.ok(/^\d{4}$/.test(ride.start_otp), 'Must generate 4-digit start OTP');
    assert.ok(Number(ride.total_fare_inr) > 0);

    testRideId = ride.id;
    rideStartOtp = ride.start_otp;
  });

  it('4. Section 5B Mutual Exclusion: Driver acquires vertical lock and bars concurrent goods delivery', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    const partnerReq = { user: { userId: partnerUserId, roles: ['PARTNER'] } };

    // Partner accepts ride
    const assigned = await ridesController.driverAssign(partnerReq, testRideId);
    assert.strictEqual(assigned.status, 'ACCEPTED');
    assert.strictEqual(assigned.partner_id, testPartnerId);

    // Verify active vertical lock set to 'RIDE'
    const mode = await continuityService.getPartnerMode(testPartnerId);
    assert.strictEqual(mode.activeVerticalLock, 'RIDE');

    // Strict Mutual Exclusion Check: Driver carrying passenger cannot receive or accept food/grocery/parcel
    await assert.rejects(async () => {
      await continuityService.assertMutualExclusion(testPartnerId, 'FOOD');
    }, /Safety Invariant Violation.*carrying human passenger/);

    await assert.rejects(async () => {
      await continuityService.assertMutualExclusion(testPartnerId, 'PARCEL');
    }, /Safety Invariant Violation.*carrying human passenger/);
  });

  it('5. Ride Journey: Driver Arrives, Start OTP verification, Completion & Driver Payout', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    const partnerReq = { user: { userId: partnerUserId, roles: ['PARTNER'] } };

    // 1. Driver arrived
    const arrived = await ridesController.driverArrived(partnerReq, testRideId);
    assert.strictEqual(arrived.status, 'ARRIVED');

    // 2. Invalid start OTP rejected
    await assert.rejects(async () => {
      await ridesController.startTrip(partnerReq, testRideId, { startOtp: '0000' });
    }, /Invalid ride start OTP/);

    // 3. Valid start OTP starts trip
    const started = await ridesController.startTrip(partnerReq, testRideId, {
      startOtp: rideStartOtp,
    });
    assert.strictEqual(started.status, 'IN_PROGRESS');

    // 4. Complete trip
    const completed = await ridesController.completeTrip(partnerReq, testRideId, {
      actualDistanceKm: 5.2,
      actualDurationMinutes: 18,
    });
    assert.strictEqual(completed.status, 'COMPLETED');
    assert.strictEqual(completed.payment_status, 'COMPLETED');

    // 5. Verify partner payout recorded in ledger
    const earningsRes = await db.query(
      'SELECT * FROM partner_earnings_entries WHERE partner_id = $1;',
      [testPartnerId],
    );
    assert.ok(earningsRes.rows.length >= 1);
    assert.ok(Number(earningsRes.rows[0].total_earned_inr) > 0);

    // 6. Verify vertical lock released back to null
    const mode = await continuityService.getPartnerMode(testPartnerId);
    assert.strictEqual(mode.activeVerticalLock, null, 'Lock must be released on trip completion');
  });

  it('6. Emergency / SOS Safety: Trigger, audit logging and dispatcher resolution', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    const custReq = { user: { userId: customerUserId, roles: ['CUSTOMER'] } };

    // Customer triggers SOS
    const sos = await ridesController.triggerSos(custReq, testRideId, {
      latitude: 13.07,
      longitude: 80.25,
      notes: 'Driver taking unexpected route off highway',
    });

    assert.ok(sos.id);
    assert.strictEqual(sos.status, 'TRIGGERED');

    // Verify ride record flagged with SOS
    const rideCheck = await db.query(
      'SELECT sos_status, sos_triggered_at FROM rides WHERE id = $1;',
      [testRideId],
    );
    assert.strictEqual(rideCheck.rows[0].sos_status, 'TRIGGERED');
    assert.ok(rideCheck.rows[0].sos_triggered_at);

    // Admin lists SOS events
    const adminSosList = await adminMobilityController.listSosEvents('TRIGGERED');
    assert.ok(adminSosList.some((s: any) => s.id === sos.id));

    // Admin resolves SOS event
    const resolved = await adminMobilityController.resolveSos(sos.id, {
      notes: 'Customer contacted via telephone; confirmed safe arrival.',
      status: 'RESOLVED',
    });
    assert.strictEqual(resolved.status, 'RESOLVED');
  });

  it('7. Intra-City Parcel Courier: Dual OTP (Pickup & Delivery) with Fare Calculation', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    const senderReq = { user: { userId: customerUserId, roles: ['CUSTOMER'] } };
    const courierReq = { user: { userId: partnerUserId, roles: ['PARTNER'] } };

    // 1. Create parcel order
    const parcel = await parcelsController.createParcel(senderReq, {
      pickupLocation: { latitude: 13.08, longitude: 80.24 },
      pickupAddress: 'Kilpauk, Chennai',
      pickupContactName: 'Kavitha Sender',
      pickupContactPhone: '+919999000031',
      dropoffLocation: { latitude: 13.03, longitude: 80.21 },
      dropoffAddress: 'Guindy Industrial Estate, Chennai',
      dropoffContactName: 'Ramesh Recipient',
      dropoffContactPhone: '+919999000039',
      packageCategory: 'DOCUMENTS',
      weightKg: 0.5,
      packageDescription: 'Signed Legal Contracts',
      isFragile: false,
    });

    assert.ok(parcel.id);
    assert.strictEqual(parcel.status, 'CREATED');
    assert.ok(/^\d{4}$/.test(parcel.pickup_otp), 'Must generate pickup OTP');
    assert.ok(/^\d{4}$/.test(parcel.delivery_otp), 'Must generate delivery OTP');
    assert.notStrictEqual(
      parcel.pickup_otp,
      parcel.delivery_otp,
      'Dual OTPs must be cryptographically distinct',
    );

    testParcelId = parcel.id;
    parcelPickupOtp = parcel.pickup_otp;
    parcelDeliveryOtp = parcel.delivery_otp;

    // 2. Courier assigns & acquires PARCEL vertical lock
    const assigned = await parcelsController.assignCourier(courierReq, testParcelId);
    assert.strictEqual(assigned.status, 'ACCEPTED');

    const mode = await continuityService.getPartnerMode(testPartnerId);
    assert.strictEqual(mode.activeVerticalLock, 'PARCEL');

    // 3. Sender Pickup OTP Verification
    await assert.rejects(
      async () => parcelsController.verifyPickup(courierReq, testParcelId, { otp: '0000' }),
      /Invalid sender pickup OTP/,
    );

    const pickedUp = await parcelsController.verifyPickup(courierReq, testParcelId, {
      otp: parcelPickupOtp,
    });
    assert.strictEqual(pickedUp.status, 'PICKED_UP');

    // 4. In Transit
    const inTransit = await parcelsController.startTransit(courierReq, testParcelId);
    assert.strictEqual(inTransit.status, 'IN_TRANSIT');

    // 5. Recipient Delivery OTP Verification
    await assert.rejects(
      async () => parcelsController.verifyDelivery(courierReq, testParcelId, { otp: '0000' }),
      /Invalid recipient delivery OTP/,
    );

    const delivered = await parcelsController.verifyDelivery(courierReq, testParcelId, {
      otp: parcelDeliveryOtp,
    });
    assert.strictEqual(delivered.status, 'DELIVERED');

    // Vertical lock released back to null
    const modeAfter = await continuityService.getPartnerMode(testPartnerId);
    assert.strictEqual(modeAfter.activeVerticalLock, null);
  });

  it('8. Designated Driver Hire (Hire-Driver): Hourly booking, Start & End OTPs, Odometer tracking', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    const custReq = { user: { userId: customerUserId, roles: ['CUSTOMER'] } };
    const driverReq = { user: { userId: partnerUserId, roles: ['PARTNER'] } };

    // 1. Customer books 4-hour chauffeur duty
    const booking = await hireDriverController.bookDriver(custReq, {
      durationHours: 4,
      vehicleTransmission: 'MANUAL',
      pickupLocation: { latitude: 13.085, longitude: 80.21 },
      pickupAddress: 'Anna Nagar, Chennai',
      scheduledStartTime: new Date(Date.now() + 3600000).toISOString(),
      stateCode: 'TN',
    });

    assert.ok(booking.id);
    assert.strictEqual(booking.status, 'BOOKED');
    assert.strictEqual(Number(booking.base_fee_inr), 500.0);
    assert.ok(/^\d{4}$/.test(booking.start_otp));
    assert.ok(/^\d{4}$/.test(booking.end_otp));

    testHireBookingId = booking.id;
    hireStartOtp = booking.start_otp;
    hireEndOtp = booking.end_otp;

    // 2. Chauffeur assigned & acquires HIRE_DRIVER vertical lock
    const assigned = await hireDriverController.assignDriver(driverReq, testHireBookingId);
    assert.strictEqual(assigned.status, 'ASSIGNED');

    const mode = await continuityService.getPartnerMode(testPartnerId);
    assert.strictEqual(mode.activeVerticalLock, 'HIRE_DRIVER');

    // 3. Driver arrives
    const arrived = await hireDriverController.driverArrived(driverReq, testHireBookingId);
    assert.strictEqual(arrived.status, 'ARRIVED');

    // 4. Start duty with Start OTP and initial odometer
    await assert.rejects(
      async () =>
        hireDriverController.startDuty(driverReq, testHireBookingId, {
          startOtp: '0000',
          odometerKm: 45200,
        }),
      /Invalid start OTP/,
    );

    const started = await hireDriverController.startDuty(driverReq, testHireBookingId, {
      startOtp: hireStartOtp,
      odometerKm: 45200,
    });
    assert.strictEqual(started.status, 'STARTED');
    assert.strictEqual(started.start_odometer_km, 45200);

    // 5. End duty with End OTP and final odometer
    await assert.rejects(
      async () =>
        hireDriverController.endDuty(driverReq, testHireBookingId, {
          endOtp: '0000',
          odometerKm: 45255,
        }),
      /Invalid end OTP/,
    );

    const completed = await hireDriverController.endDuty(driverReq, testHireBookingId, {
      endOtp: hireEndOtp,
      odometerKm: 45255,
    });
    assert.strictEqual(completed.status, 'COMPLETED');
    assert.strictEqual(completed.end_odometer_km, 45255);

    // Lock released
    const modeFinal = await continuityService.getPartnerMode(testPartnerId);
    assert.strictEqual(modeFinal.activeVerticalLock, null);
  });

  it('9. Safe Data Exposure & Role-Based Redactions across mobility services', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    // Customer query on ride -> sees start OTP (to tell driver verbally)
    const customerRide = await ridesService.getRideDetails(customerUserId, 'CUSTOMER', testRideId);
    assert.strictEqual(customerRide.startOtp, rideStartOtp);
    assert.ok(customerRide.driver, 'Customer can see assigned driver');

    // Driver query on ride -> cannot see start OTP in advance
    const driverRide = await ridesService.getRideDetails(partnerUserId, 'PARTNER', testRideId);
    assert.strictEqual(driverRide.startOtp, null, 'Driver must not see start OTP in advance');

    // Admin operational metrics
    const stats = await adminMobilityController.getStats();
    assert.ok(stats.totalRides >= 1);
    assert.ok(stats.completedRides >= 1);
    assert.ok(stats.totalParcels >= 1);
    assert.ok(stats.totalHireDriverBookings >= 1);
  });
});
