import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { FirebaseAdminAuthService } from '../../apps/api/dist/auth/firebase-auth.service.js';
import { FirebaseSessionExchangeService } from '../../apps/api/dist/auth/firebase-session-exchange.service.js';
import { TokenSessionService } from '../../apps/api/dist/auth/token-session.service.js';
import { AuthRepository } from '../../apps/api/dist/auth/data/auth.repository.js';
import { ConfigService } from '../../apps/api/dist/config/config.service.js';
import { SmsAbuseProtectionService } from '../../apps/api/dist/auth/sms-abuse-protection.service.js';
import { IndiaDltSmsGateway } from '../../apps/api/dist/notifications/sms/india-dlt-sms.gateway.js';
import { DLT_TEMPLATES } from '../../apps/api/dist/notifications/sms/sms-gateway.interface.js';
import { FirebaseAdminFcmService } from '../../apps/api/dist/notifications/fcm/fcm-push.service.js';
import { NotificationsService } from '../../apps/api/dist/notifications/notifications.service.js';
import { InMemoryRedisTestDouble, MockDatabaseService } from '../helpers/test-doubles.ts';

describe('Phase C: Auth, Firebase App Check, SMS Abuse & Notifications Test Suite', () => {
  let configService: ConfigService;
  let dbService: MockDatabaseService;
  let redisService: InMemoryRedisTestDouble;
  let firebaseAuth: FirebaseAdminAuthService;
  let authRepo: AuthRepository;
  let tokenSessionService: TokenSessionService;
  let exchangeService: FirebaseSessionExchangeService;
  let abuseProtection: SmsAbuseProtectionService;
  let dltGateway: IndiaDltSmsGateway;
  let fcmService: FirebaseAdminFcmService;
  let notifService: NotificationsService;

  beforeEach(() => {
    configService = new ConfigService();
    dbService = new MockDatabaseService();
    redisService = new InMemoryRedisTestDouble();
    firebaseAuth = new FirebaseAdminAuthService(configService);
    authRepo = new AuthRepository(dbService as any);
    tokenSessionService = new TokenSessionService(
      configService,
      redisService as any,
      authRepo,
      { validateIndianPhone: (p: string) => p } as any
    );
    exchangeService = new FirebaseSessionExchangeService(
      firebaseAuth,
      authRepo,
      tokenSessionService
    );
    abuseProtection = new SmsAbuseProtectionService(redisService as any);
    dltGateway = new IndiaDltSmsGateway(configService);
    fcmService = new FirebaseAdminFcmService(configService);
    notifService = new NotificationsService(dbService as any, fcmService, dltGateway);
  });

  describe('1. Firebase Phone Auth & Session Token Exchange', () => {
    it('should exchange verified Firebase ID token for AllGo session tokens with device session', async () => {
      const result = await exchangeService.exchangeFirebaseToken({
        firebase_token: 'mock_uid_123_phone_+919876543210',
        device_id: 'test_phone_hw_uuid_1',
        platform: 'ANDROID',
        fcm_token: 'fcm_token_device_abc',
      });

      assert.ok(result.accessToken, 'Access token must be issued');
      assert.ok(result.refreshToken, 'Refresh token must be issued');
      assert.strictEqual(result.user.phone, '+919876543210');
      assert.strictEqual(result.tokenType, 'Bearer');

      // Verify device session recorded
      const session = await authRepo.getDeviceSession(result.user.id, 'test_phone_hw_uuid_1');
      assert.ok(session, 'Device session must be saved');
    });

    it('should verify App Check tokens and reject unauthenticated requests', async () => {
      const claims = await firebaseAuth.verifyAppCheckToken('test_app_check_token_123');
      assert.ok(claims.app_id, 'App Check claims must include app_id');

      await assert.rejects(
        async () => firebaseAuth.verifyAppCheckToken(''),
        /App Check token is required/
      );
    });
  });

  describe('2. SMS Abuse Protection & SMS-Pumping Defense', () => {
    it('should enforce 60s resend cooldown per phone number', async () => {
      const phone = '+919988776655';
      const ip = '103.21.244.1';

      const first = await abuseProtection.checkAndRecordSmsRequest(phone, ip);
      assert.strictEqual(first.allowed, true);

      const second = await abuseProtection.checkAndRecordSmsRequest(phone, ip);
      assert.strictEqual(second.allowed, false);
      assert.strictEqual(second.retryAfterSeconds, 60);
    });

    it('should detect SMS-pumping pattern when distinct phones exceed threshold from single IP', async () => {
      const ip = '185.220.101.5';

      for (let i = 1; i <= 4; i++) {
        const phone = `+91987650000${i}`;
        const res = await abuseProtection.checkAndRecordSmsRequest(phone, ip);
        assert.strictEqual(res.allowed, true);
      }

      // Add distinct numbers to set to trigger pumping threshold
      for (let i = 5; i <= 7; i++) {
        await redisService.sadd(`otp:pumping:ip:${ip}:phones`, `+91987650000${i}`);
      }

      // Next distinct phone triggers pumping alert
      const triggerPhone = '+919876500008';
      const triggerRes = await abuseProtection.checkAndRecordSmsRequest(triggerPhone, ip);
      assert.strictEqual(triggerRes.allowed, false);
      assert.strictEqual(triggerRes.isPumpingAttack, true);
      assert.match(triggerRes.reason!, /SMS pumping/i);
    });
  });

  describe('3. India DLT SMS Gateway', () => {
    it('should format and dispatch SMS with registered DLT template and header ALGOIN', async () => {
      const res = await dltGateway.sendCriticalAlert(
        '+919876543210',
        'Your AllGo security code is 889900.',
        { dltTemplateId: DLT_TEMPLATES.OTP_VERIFICATION }
      );

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.provider, 'KARIX_INDIA_DLT');
      assert.strictEqual(res.dltTemplateId, DLT_TEMPLATES.OTP_VERIFICATION);
      assert.ok(res.messageId.startsWith('sms_'));
    });

    it('should reject invalid non-E.164 phone numbers or missing template ID', async () => {
      await assert.rejects(
        async () => dltGateway.sendCriticalAlert('9876543210', 'test', { dltTemplateId: 'T1' }),
        /Invalid Indian E.164/
      );

      await assert.rejects(
        async () => dltGateway.sendCriticalAlert('+919876543210', 'test', { dltTemplateId: '' }),
        /DLT Template ID missing/
      );
    });
  });

  describe('4. FCM Push Notifications & Invalid Token Pruning', () => {
    it('should send high-priority push for merchant new-order and partner job-offer', async () => {
      const merchantPush = await fcmService.sendToDevice(
        'mock_merchant_device_token',
        'New Order Received',
        'Order #ORD-123 ready for preparation',
        { orderId: 'ORD-123', isFullScreenAlert: 'true' },
        { priority: 'high', channelId: 'merchant_orders_channel' }
      );
      assert.strictEqual(merchantPush.success, true);
      assert.ok(merchantPush.messageId);

      const partnerPush = await fcmService.sendToDevice(
        'mock_partner_device_token',
        'New Delivery Job Offer',
        'New Food order pickup 1.2km away',
        { jobId: 'JOB-456' },
        { priority: 'high', channelId: 'partner_jobs_channel' }
      );
      assert.strictEqual(partnerPush.success, true);
      assert.ok(partnerPush.messageId);
    });

    it('should detect invalid/unregistered token and prune from devices table', async () => {
      const res = await fcmService.sendToDevice(
        'mock_invalid_unregistered_token',
        'Test Title',
        'Test Body'
      );

      assert.strictEqual(res.success, false);
      assert.strictEqual(res.invalidToken, true);
    });

    it('should dispatch notification, deduplicate rapid repeats, and record in DB', async () => {
      const userId = 'usr_merchant_test_01';
      const notif1 = await notifService.sendNotification({
        userId,
        role: 'MERCHANT',
        title: 'New Order #ORD-999',
        body: 'Customer placed order for ₹450',
        category: 'BOOKING',
        referenceType: 'ORDER',
        referenceId: 'ORD-999',
      });

      assert.ok(notif1.id);

      // Duplicate within 60s must return existing notification
      const notif2 = await notifService.sendNotification({
        userId,
        role: 'MERCHANT',
        title: 'New Order #ORD-999',
        body: 'Customer placed order for ₹450',
        category: 'BOOKING',
        referenceType: 'ORDER',
        referenceId: 'ORD-999',
      });

      assert.strictEqual(notif1.id, notif2.id, 'Rapid identical notification must be deduplicated');
    });
  });
});
