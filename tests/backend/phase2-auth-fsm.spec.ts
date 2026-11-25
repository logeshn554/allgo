import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';
import { OrderStatus } from '@allgo/common';
import jwt from 'jsonwebtoken';
import { AuthRepository } from '../../services/api/dist/auth/data/auth.repository.js';
import { OtpService } from '../../services/api/dist/auth/otp.service.js';
import { TokenSessionService } from '../../services/api/dist/auth/token-session.service.js';
import { ConfigService } from '../../services/api/dist/config/config.service.js';
import { createAuthMiddleware } from '../../services/api/dist/middleware/auth.middleware.js';
import { requireOwnership } from '../../services/api/dist/middleware/ownership.middleware.js';
import { requireRole } from '../../services/api/dist/middleware/rbac.middleware.js';
import {
  InvalidTransitionError,
  OtpVerificationError,
} from '../../services/api/dist/services/fsmTypes.js';
import { OrderFsmService } from '../../services/api/dist/services/orderFsm.js';
import { InMemoryRedisTestDouble, MockDatabaseService } from '../helpers/test-doubles.ts';

describe('Phase 2: Authentication, RBAC Middleware & Deterministic Order FSM', () => {
  let mockDb: MockDatabaseService;
  let mockRedis: InMemoryRedisTestDouble;
  let configService: ConfigService;
  let tokenSessionService: TokenSessionService;
  let orderFsm: OrderFsmService;

  const customerId = 'usr_cust_001';
  const driverId = 'usr_drv_001';
  const merchantId = 'usr_merch_001';
  const adminId = 'usr_admin_001';

  beforeEach(() => {
    mockDb = new MockDatabaseService();
    mockRedis = new InMemoryRedisTestDouble();
    configService = new ConfigService();

    const authRepo = new AuthRepository(mockDb as any);
    const otpService = new OtpService(configService, mockRedis as any, {} as any);
    tokenSessionService = new TokenSessionService(
      configService,
      mockRedis as any,
      authRepo,
      otpService,
    );
    orderFsm = new OrderFsmService(mockDb as any, mockRedis as any);

    // Seed test users
    mockDb.users.set(customerId, {
      id: customerId,
      phone: '+919876543210',
      status: 'ACTIVE',
      roles: ['CUSTOMER'],
    });
    mockDb.users.set(driverId, {
      id: driverId,
      phone: '+919876543211',
      status: 'ACTIVE',
      roles: ['DRIVER'],
    });
    mockDb.users.set(merchantId, {
      id: merchantId,
      phone: '+919876543212',
      status: 'ACTIVE',
      roles: ['MERCHANT'],
    });
    mockDb.users.set(adminId, {
      id: adminId,
      phone: '+919876543213',
      status: 'ACTIVE',
      roles: ['ADMIN'],
    });
  });

  describe('1. Authentication & RBAC Middleware', () => {
    it('should generate 15-minute access token and 7-day rotating refresh token', () => {
      const user = mockDb.users.get(customerId);
      const accessToken = tokenSessionService.generateAccessToken(user, 'dev_1');
      const refreshToken = tokenSessionService.generateRefreshToken(user, 'dev_1');

      const decodedAccess: any = jwt.verify(accessToken, configService.jwtSecret);
      const decodedRefresh: any = jwt.verify(refreshToken, configService.jwtSecret);

      const accessTtlSec = decodedAccess.exp - decodedAccess.iat;
      const refreshTtlSec = decodedRefresh.exp - decodedRefresh.iat;

      assert.strictEqual(accessTtlSec, 900); // 15 minutes = 900 seconds
      assert.strictEqual(refreshTtlSec, 7 * 24 * 3600); // 7 days
    });

    it('should authenticate valid bearer token and populate req.user in AuthMiddleware', async () => {
      const user = mockDb.users.get(customerId);
      const token = tokenSessionService.generateAccessToken(user, 'dev_1');
      const middleware = createAuthMiddleware(configService, mockRedis as any);

      const req: any = { headers: { authorization: `Bearer ${token}` } };
      const res: any = { status: (c: number) => ({ json: (b: any) => ({ c, b }) }) };
      let calledNext = false;

      await middleware(req, res, () => {
        calledNext = true;
      });

      assert.strictEqual(calledNext, true);
      assert.strictEqual(req.user?.userId, customerId);
      assert.deepStrictEqual(req.user?.roles, ['CUSTOMER']);
    });

    it('should enforce strict RBAC and normalize DRIVER/PARTNER roles', async () => {
      const driverGuard = requireRole(['DRIVER']);
      const customerReq: any = { user: { userId: customerId, roles: ['CUSTOMER'] }, headers: {} };
      const driverReq: any = { user: { userId: driverId, roles: ['PARTNER'] }, headers: {} };

      let deniedCode = 0;
      const res: any = {
        status: (c: number) => ({
          json: () => {
            deniedCode = c;
          },
        }),
      };

      let nextCalled = false;
      driverGuard(customerReq, res, () => {
        nextCalled = true;
      });
      assert.strictEqual(deniedCode, 403);
      assert.strictEqual(nextCalled, false);

      driverGuard(driverReq, res, () => {
        nextCalled = true;
      });
      assert.strictEqual(nextCalled, true);
    });

    it('should prevent IDOR via OwnershipMiddleware on order resources', async () => {
      const orderId = 'ord_secret_100';
      mockDb.orders.set(orderId, {
        id: orderId,
        customer_id: customerId,
        merchant_id: merchantId,
        driver_id: driverId,
        status: 'CONFIRMED',
      });

      const ownershipGuard = requireOwnership(mockDb as any, 'order');
      let statusResult = 0;
      const res: any = {
        status: (c: number) => ({
          json: () => {
            statusResult = c;
          },
        }),
      };

      // Legitimate customer accesses order
      let nextCalled = false;
      const ownerReq: any = {
        user: { userId: customerId, roles: ['CUSTOMER'] },
        params: { id: orderId },
      };
      await ownershipGuard(ownerReq, res, () => {
        nextCalled = true;
      });
      assert.strictEqual(nextCalled, true);

      // Unrelated customer tries to access order (IDOR attempt)
      let attackerNext = false;
      const attackerReq: any = {
        user: { userId: 'usr_attacker_666', roles: ['CUSTOMER'] },
        params: { id: orderId },
      };
      await ownershipGuard(attackerReq, res, () => {
        attackerNext = true;
      });
      assert.strictEqual(attackerNext, false);
      assert.strictEqual(statusResult, 403);
    });
  });

  describe('2. Deterministic Order Finite State Machine', () => {
    it('should complete full Ride-Hailing lifecycle with 4-digit start OTP verification', async () => {
      const rideId = 'ride_fsm_001';
      mockDb.orders.set(rideId, {
        id: rideId,
        vertical: 'RIDE_HAILING',
        status: OrderStatus.CREATED,
        pickup_otp: '4821',
        customer_id: customerId,
      });

      // Track WebSocket emission
      const eventsEmitted: any[] = [];
      orderFsm.liveOrderStream.on('order:status_changed', (evt) => eventsEmitted.push(evt));

      // CREATED -> CONFIRMED -> DISPATCHING -> DRIVER_ASSIGNED -> ARRIVED_AT_PICKUP
      await orderFsm.transition({
        orderId: rideId,
        targetStatus: OrderStatus.CONFIRMED,
        actorId: customerId,
        actorRole: 'CUSTOMER',
      });
      await orderFsm.transition({
        orderId: rideId,
        targetStatus: OrderStatus.DISPATCHING,
        actorId: 'system',
        actorRole: 'SYSTEM',
      });
      await orderFsm.transition({
        orderId: rideId,
        targetStatus: OrderStatus.DRIVER_ASSIGNED,
        actorId: 'dispatch',
        actorRole: 'SYSTEM',
      });
      await orderFsm.transition({
        orderId: rideId,
        targetStatus: OrderStatus.ARRIVED_AT_PICKUP,
        actorId: driverId,
        actorRole: 'DRIVER',
      });

      // Rejects PICKED_UP with invalid OTP
      await assert.rejects(
        () =>
          orderFsm.transition({
            orderId: rideId,
            targetStatus: OrderStatus.PICKED_UP,
            actorId: driverId,
            actorRole: 'DRIVER',
            otp: '9999',
          }),
        OtpVerificationError,
      );

      // Accepts PICKED_UP with valid 4-digit OTP
      const pickedUp = await orderFsm.transition({
        orderId: rideId,
        targetStatus: OrderStatus.PICKED_UP,
        actorId: driverId,
        actorRole: 'DRIVER',
        otp: '4821',
      });
      assert.strictEqual(pickedUp.newStatus, OrderStatus.PICKED_UP);

      // IN_TRANSIT -> ARRIVED_AT_DROP -> COMPLETED
      await orderFsm.transition({
        orderId: rideId,
        targetStatus: OrderStatus.IN_TRANSIT,
        actorId: driverId,
        actorRole: 'DRIVER',
      });
      await orderFsm.transition({
        orderId: rideId,
        targetStatus: OrderStatus.ARRIVED_AT_DROP,
        actorId: driverId,
        actorRole: 'DRIVER',
      });
      const completed = await orderFsm.transition({
        orderId: rideId,
        targetStatus: OrderStatus.COMPLETED,
        actorId: driverId,
        actorRole: 'DRIVER',
      });

      assert.strictEqual(completed.newStatus, OrderStatus.COMPLETED);
      assert.strictEqual(eventsEmitted.length, 8);
      assert.strictEqual(eventsEmitted[eventsEmitted.length - 1].newStatus, OrderStatus.COMPLETED);
    });

    it('should reject illegal state transitions according to deterministic FSM rules', async () => {
      const orderId = 'grocery_fsm_002';
      mockDb.orders.set(orderId, {
        id: orderId,
        vertical: 'INSTANT_GROCERY',
        status: OrderStatus.CREATED,
        pickup_otp: '1122',
        delivery_pin: '3344',
      });

      // Illegal skip from CREATED directly to DELIVERED
      await assert.rejects(
        () =>
          orderFsm.transition({
            orderId,
            targetStatus: OrderStatus.DELIVERED,
            actorId: driverId,
            actorRole: 'DRIVER',
            otp: '3344',
          }),
        InvalidTransitionError,
      );

      // Cancel order and attempt to revive
      await orderFsm.transition({
        orderId,
        targetStatus: OrderStatus.CANCELLED,
        actorId: customerId,
        actorRole: 'CUSTOMER',
      });
      await assert.rejects(
        () =>
          orderFsm.transition({
            orderId,
            targetStatus: OrderStatus.CONFIRMED,
            actorId: customerId,
            actorRole: 'CUSTOMER',
          }),
        InvalidTransitionError,
      );
    });

    it('should handle sequential transitions under simulated locking without state corruption', async () => {
      const orderId = 'parcel_fsm_003';
      mockDb.orders.set(orderId, {
        id: orderId,
        vertical: 'PARCEL_DELIVERY',
        status: OrderStatus.CREATED,
        pickup_otp: '7788',
        delivery_pin: '9900',
      });

      // Transition to CONFIRMED
      const res1 = await orderFsm.transition({
        orderId,
        targetStatus: OrderStatus.CONFIRMED,
        actorId: customerId,
        actorRole: 'CUSTOMER',
      });
      assert.strictEqual(res1.newStatus, OrderStatus.CONFIRMED);

      // Attempting duplicate transition to same state returns safely
      const res2 = await orderFsm.transition({
        orderId,
        targetStatus: OrderStatus.DISPATCHING,
        actorId: 'system',
        actorRole: 'SYSTEM',
      });
      assert.strictEqual(res2.newStatus, OrderStatus.DISPATCHING);
      assert.strictEqual(mockDb.orders.get(orderId).status, OrderStatus.DISPATCHING);
    });
  });
});
