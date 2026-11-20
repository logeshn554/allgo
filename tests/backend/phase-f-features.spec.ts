import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ReferralService } from '../../apps/api/dist/users/referral.service.js';
import { DpdpComplianceService } from '../../apps/api/dist/users/dpdp-compliance.service.js';
import { CloudTasksGateway } from '../../apps/api/dist/common/scheduling/cloud-tasks.gateway.js';
import { OrderSubstitutionService } from '../../apps/api/dist/ordering/services/order-substitution.service.js';
import { MerchantCsvMenuService } from '../../apps/api/dist/catalog/merchant-csv-menu.service.js';
import { MaskedCallGateway } from '../../apps/api/dist/common/calling/masked-call.gateway.js';
import { MultiStoreBatchingService } from '../../apps/api/dist/delivery/multi-store-batching.service.js';
import { PartnerContinuityExtensionService } from '../../apps/api/dist/mobility/partner-continuity-extension.service.js';
import { NotificationLocalizationService } from '../../apps/api/dist/notifications/notification-localization.service.js';

describe('Phase F: Core Features Integration & Safety Suite', () => {
  // 1. Referral System & Abuse Checks
  describe('1. Referral System & Abuse Checks', () => {
    it('should generate unique code and block self-referrals and device abuse', async () => {
      const dbMock: any = {
        query: async (sql: string, params: any[]) => {
          if (sql.includes('SELECT code FROM referral_codes')) return { rows: [] };
          if (sql.includes('INSERT INTO referral_codes')) return { rows: [{ code: 'ALLGO123' }] };
          if (sql.includes('SELECT rc.*, u.phone as referrer_phone')) {
            return { rows: [{ id: 'ref_1', user_id: 'user_referrer', code: 'ALLGO123' }] };
          }
          if (sql.includes('SELECT id FROM referral_redemptions WHERE referee_device_id')) {
            return params[0] === 'dev_abuser' ? { rows: [{ id: 'red_prev' }] } : { rows: [] };
          }
          if (sql.includes('SELECT id FROM referral_redemptions WHERE referee_user_id')) return { rows: [] };
          if (sql.includes('INSERT INTO referral_redemptions')) return { rows: [{ id: 'red_new' }] };
          return { rows: [] };
        },
      };
      const redisMock: any = {};
      const referralService = new ReferralService(dbMock, redisMock);

      // Self referral test
      const selfRes = await referralService.validateAndApplyReferral('user_referrer', 'ALLGO123');
      assert.strictEqual(selfRes.valid, false);
      assert.match(selfRes.message!, /Self-referral is strictly barred/);

      // Device abuse test
      const devRes = await referralService.validateAndApplyReferral('user_new', 'ALLGO123', 'dev_abuser');
      assert.strictEqual(devRes.valid, false);
      assert.match(devRes.message!, /Device has already claimed/);

      // Valid referral
      const validRes = await referralService.validateAndApplyReferral('user_new', 'ALLGO123', 'dev_clean');
      assert.strictEqual(validRes.valid, true);
      assert.strictEqual(validRes.discountInr, 50.0);
    });
  });

  // 2. Scheduled Cloud Tasks
  describe('2. Scheduled Cloud Tasks Gateway', () => {
    it('should enqueue and cancel scheduled order / driver-hire tasks', async () => {
      let inserted = false;
      let cancelled = false;
      const dbMock: any = {
        query: async (sql: string) => {
          if (sql.includes('INSERT INTO scheduled_cloud_tasks')) {
            inserted = true;
            return { rows: [] };
          }
          if (sql.includes('UPDATE scheduled_cloud_tasks SET status = \'CANCELLED\'')) {
            cancelled = true;
            return { rowCount: 1, rows: [] };
          }
          return { rows: [] };
        },
      };
      const gateway = new CloudTasksGateway(dbMock);
      const res = await gateway.scheduleTask({
        taskName: 'task_order_schedule_1',
        targetType: 'SCHEDULED_ORDER',
        targetId: 'order_uuid_1',
        scheduledFor: new Date(Date.now() + 3600000),
      });

      assert.strictEqual(inserted, true);
      assert.strictEqual(res.taskName, 'task_order_schedule_1');

      const cancelRes = await gateway.cancelTask('task_order_schedule_1');
      assert.strictEqual(cancelled, true);
      assert.strictEqual(cancelRes, true);
    });
  });

  // 3. Out-of-Stock Substitution & Refund
  describe('3. Out-of-stock Substitution with Bill Adjustment', () => {
    it('should refund difference when approved or refund full item on timeout/reject', async () => {
      const dbMock: any = {
        query: async (sql: string, params: any[]) => {
          if (sql.includes('INSERT INTO order_item_substitutions')) {
            return { rows: [{ id: 'sub_1', difference_refund_inr: 20.0 }] };
          }
          if (sql.includes('SELECT s.*, o.customer_id FROM order_item_substitutions')) {
            return {
              rows: [{
                id: 'sub_1',
                customer_id: 'cust_1',
                sub_order_id: 'sub_ord_1',
                status: 'PENDING_CUSTOMER_APPROVAL',
                expires_at: new Date(Date.now() + 100000).toISOString(),
                original_price_inr: 100.0,
                difference_refund_inr: 20.0,
              }],
            };
          }
          if (sql.includes('UPDATE wallets SET refundable_balance_inr')) return { rows: [] };
          if (sql.includes('UPDATE order_item_substitutions')) return { rows: [] };
          return { rows: [] };
        },
      };

      const substitutionService = new OrderSubstitutionService(dbMock);
      const decision = await substitutionService.respondToSubstitution('cust_1', 'sub_1', { decision: 'APPROVE' });
      assert.strictEqual(decision.status, 'APPROVED');
      assert.strictEqual(decision.refundDifferenceInr, 20.0);
      assert.match(decision.message, /refunded to wallet/);
    });
  });

  // 4. CSV Bulk Menu Upload
  describe('4. Merchant CSV Bulk Menu Upload', () => {
    it('should validate CSV columns and report row errors', async () => {
      const catalogRepoMock: any = {
        verifyOutletOwnership: async () => {},
      };
      const categoryRepoMock: any = {
        findCategoriesByOutlet: async () => [{ id: 'cat_1', name: 'beverages' }],
      };
      let insertedProducts = 0;
      const productRepoMock: any = {
        insertProduct: async () => {
          insertedProducts++;
          return { id: `prod_${insertedProducts}` };
        },
      };
      const overrideRepoMock: any = {
        upsertStock: async () => {},
      };
      const categoryServiceMock: any = {
        createCategory: async () => ({ id: 'cat_auto' }),
      };

      const csvService = new MerchantCsvMenuService(
        catalogRepoMock,
        categoryRepoMock,
        productRepoMock,
        overrideRepoMock,
        categoryServiceMock
      );

      const csv = `name,category,base_price,is_veg,stock\nMasala Chai,Beverages,25.0,true,100\n,Snacks,50,true,20\nBad Item,Snacks,-10,false,10`;
      const result = await csvService.processBulkMenuCsv('owner_1', 'outlet_1', csv);

      assert.strictEqual(result.totalRows, 3);
      assert.strictEqual(result.validRows, 1);
      assert.strictEqual(result.errors.length, 2);
      assert.match(result.errors[0]?.reason!, /Product name cannot be empty/);
      assert.match(result.errors[1]?.reason!, /Invalid base price/);
    });
  });

  // 5. DPDP Act User Privacy & Account Deletion
  describe('5. DPDP Act User Privacy & Deletion Flow', () => {
    it('should record user consent, export data, and enforce 30-day deletion grace period', async () => {
      const dbMock: any = {
        query: async (sql: string) => {
          if (sql.includes('INSERT INTO dpdp_consents')) return { rows: [{ id: 'con_1', is_granted: true }] };
          if (sql.includes('SELECT DISTINCT ON (consent_purpose)')) return { rows: [{ consent_purpose: 'LIVE_TRACKING', is_granted: true }] };
          if (sql.includes('SELECT id, phone, email, full_name FROM users')) return { rows: [{ id: 'u_1', phone: '9999999999' }] };
          if (sql.includes('SELECT id, label, address_line1')) return { rows: [] };
          if (sql.includes('SELECT COUNT(*)::int as total')) return { rows: [{ total: 2, active: 0 }] };
          if (sql.includes('SELECT id FROM order_groups WHERE customer_id = $1 AND status IN')) return { rows: [] }; // No active orders
          if (sql.includes('INSERT INTO dpdp_deletion_requests')) return { rows: [{ id: 'del_req_1' }] };
          if (sql.includes('UPDATE users SET status = \'SUSPENDED\'')) return { rows: [] };
          return { rows: [] };
        },
      };
      const redisMock: any = {
        set: async () => 'OK',
      };

      const dpdp = new DpdpComplianceService(dbMock, redisMock);
      const consent = await dpdp.recordConsent('u_1', { purpose: 'LIVE_TRACKING', granted: true });
      assert.strictEqual(consent.is_granted, true);

      const exported = await dpdp.exportUserData('u_1');
      assert.strictEqual(exported.userId, 'u_1');
      assert.strictEqual(exported.consents.length, 1);

      const deletion = await dpdp.requestAccountDeletion('u_1', 'User requested privacy deletion');
      assert.strictEqual(deletion.status, 'PENDING_PURGE');
      assert.strictEqual(deletion.success, true);
    });
  });

  // 6. Multi-Store Batching in Dispatch
  describe('6. Multi-Store Batching in Dispatch (Section 5A)', () => {
    it('should evaluate 1.5 km distance threshold and calculate Mode A vs Mode B options', () => {
      const batchingService = new MultiStoreBatchingService({} as any);

      // Store 1 & Store 2 separated by 0.8 km (Batchable)
      const storesNearby = [
        { id: 's1', name: 'Biryani Store', latitude: 13.0827, longitude: 80.2707, prepTimeMinutes: 15 },
        { id: 's2', name: 'Juice Corner', latitude: 13.0870, longitude: 80.2720, prepTimeMinutes: 20 },
      ];

      const choiceNearby = batchingService.generateCustomerFulfillmentChoice(storesNearby);
      assert.strictEqual(choiceNearby.isBatchable, true);
      assert.strictEqual(choiceNearby.modeA_fastest.fulfillmentMode, 'SEPARATE');
      assert.strictEqual(choiceNearby.modeB_deliverTogether?.fulfillmentMode, 'DELIVER_TOGETHER');
      assert.strictEqual(choiceNearby.modeB_deliverTogether?.discountInr, 25);

      // Stores separated by 5 km (Unbatchable)
      const storesFar = [
        { id: 's1', name: 'Biryani Store', latitude: 13.0827, longitude: 80.2707, prepTimeMinutes: 15 },
        { id: 's3', name: 'Far Bakery', latitude: 13.0200, longitude: 80.2200, prepTimeMinutes: 15 },
      ];
      const choiceFar = batchingService.generateCustomerFulfillmentChoice(storesFar);
      assert.strictEqual(choiceFar.isBatchable, false);
      assert.strictEqual(choiceFar.modeB_deliverTogether, undefined);
    });
  });

  // 7. Masked Calling Gateway
  describe('7. Masked Calling Gateway (Exotel/Twilio)', () => {
    it('should establish masked virtual bridge and safely terminate call', async () => {
      const gateway = new MaskedCallGateway();
      const session = await gateway.initiateMaskedBridge({
        orderId: 'ord_123',
        customerId: 'c_1',
        partnerId: 'p_1',
        customerPhone: '+919999900001',
        partnerPhone: '+919999900002',
      });

      assert.strictEqual(session.status, 'INITIATED');
      assert.strictEqual(session.virtualNumber, '+918047193000');
      assert.strictEqual(session.provider, 'EXOTEL');
      assert.ok(session.relayPin.length >= 4);

      const terminated = await gateway.terminateSession(session.callSid);
      assert.strictEqual(terminated, true);
    });
  });

  // 8. Partner Continuity & Unified Earnings
  describe('8. Partner Continuity & Unified Earnings (Section 5B)', () => {
    it('should aggregate unified earnings across delivery, ride, and hire-driver', async () => {
      const partnerContinuityMock: any = {
        getPartnerByUserId: async () => ({ id: 'partner_uuid_1' }),
        getPartnerMode: async () => ({ preferredMode: 'ALL_JOBS' }),
      };

      const dbMock: any = {
        query: async (sql: string) => {
          if (sql.includes('FROM delivery_jobs WHERE assigned_partner_id')) {
            return { rows: [{ earnings: 150.0, count: 2 }] };
          }
          if (sql.includes('FROM rides WHERE driver_id')) {
            return { rows: [{ earnings: 300.0, count: 1 }] };
          }
          if (sql.includes('FROM hire_driver_bookings WHERE partner_id')) {
            return { rows: [{ earnings: 600.0, count: 1 }] };
          }
          return { rows: [] };
        },
      };

      const ext = new PartnerContinuityExtensionService(dbMock, partnerContinuityMock);
      const unified = await ext.getUnifiedEarnings('user_driver_1');

      assert.strictEqual(unified.deliveryEarningsInr, 150.0);
      assert.strictEqual(unified.rideEarningsInr, 300.0);
      assert.strictEqual(unified.hireDriverEarningsInr, 600.0);
      assert.strictEqual(unified.totalEarningsInr, 1050.0);
      assert.strictEqual(unified.completedJobsCount, 4);
      assert.strictEqual(unified.activeMode, 'ALL_JOBS');
    });
  });

  // 9. Localized Notification Templates
  describe('9. Multi-Language Notification Localization', () => {
    it('should render templates in English, Tamil, and Hindi', () => {
      const loc = new NotificationLocalizationService();

      const en = loc.renderTemplate('ORDER_CONFIRMED', 'en', { orderId: '99', merchantName: 'A2B' });
      assert.strictEqual(en.title, 'Order Confirmed');
      assert.strictEqual(en.body, 'Your order #99 has been confirmed by A2B.');

      const ta = loc.renderTemplate('ORDER_CONFIRMED', 'ta', { orderId: '99', merchantName: 'A2B' });
      assert.strictEqual(ta.title, 'ஆர்டர் உறுதி செய்யப்பட்டது');
      assert.strictEqual(ta.body, 'உங்கள் ஆர்டர் #99 A2B ஆல் உறுதி செய்யப்பட்டுள்ளது.');

      const hi = loc.renderTemplate('ORDER_CONFIRMED', 'hi', { orderId: '99', merchantName: 'A2B' });
      assert.strictEqual(hi.title, 'ऑर्डर की पुष्टि हुई');
      assert.strictEqual(hi.body, 'आपका ऑर्डर #99 A2B द्वारा स्वीकार कर लिया गया है।');
    });
  });
});
