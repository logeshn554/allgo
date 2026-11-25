import assert from 'node:assert';
import fs from 'node:fs';
import { after, before, describe, it } from 'node:test';
import { EncryptionService } from '../../services/api/dist/common/encryption/encryption.service.js';
import { ConfigService } from '../../services/api/dist/config/config.service.js';
import { DatabaseService } from '../../services/api/dist/database/database.service.js';
import { MerchantService } from '../../services/api/dist/merchant/merchant.service.js';
import { PartnerService } from '../../services/api/dist/partner/partner.service.js';
import { RedisService } from '../../services/api/dist/redis/redis.service.js';
import { StorageService } from '../../services/api/dist/storage/storage.service.js';

describe('Phase 2 Real Infrastructure Integration Suite (Live PostgreSQL, PostGIS & Redis)', () => {
  let config: ConfigService;
  let db: DatabaseService;
  let redis: RedisService;
  let encryptionService: EncryptionService;
  let storageService: StorageService;
  let partnerService: PartnerService;
  let merchantService: MerchantService;

  const testPartnerUserId = '00000000-0000-0000-0000-000000000001';
  const otherPartnerUserId = '00000000-0000-0000-0000-000000000002';
  const testMerchantUserId = '00000000-0000-0000-0000-000000000003';
  const adminUserId = '00000000-0000-0000-0000-000000000099';

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

    encryptionService = new EncryptionService();
    encryptionService.initializeKeys();

    storageService = new StorageService(db as any);
    partnerService = new PartnerService(db as any, encryptionService, storageService);
    merchantService = new MerchantService(
      db as any,
      redis as any,
      encryptionService,
      storageService,
    );

    // Clean previous run records for test users
    try {
      await db.query(
        `DELETE FROM document_upload_tickets WHERE uploader_user_id IN ('${testPartnerUserId}', '${otherPartnerUserId}', '${testMerchantUserId}', '${adminUserId}');`,
      );
      await db.query(
        `DELETE FROM partner_service_applications WHERE partner_id IN (SELECT id FROM partners WHERE user_id IN ('${testPartnerUserId}', '${otherPartnerUserId}'));`,
      );
      await db.query(
        `DELETE FROM partner_documents WHERE partner_id IN (SELECT id FROM partners WHERE user_id IN ('${testPartnerUserId}', '${otherPartnerUserId}'));`,
      );
      await db.query(
        `DELETE FROM vehicles WHERE partner_id IN (SELECT id FROM partners WHERE user_id IN ('${testPartnerUserId}', '${otherPartnerUserId}'));`,
      );
      await db.query(
        `DELETE FROM partners WHERE user_id IN ('${testPartnerUserId}', '${otherPartnerUserId}');`,
      );
      await db.query(
        `DELETE FROM merchant_documents WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id = '${testMerchantUserId}');`,
      );
      await db.query(
        `DELETE FROM catalogs WHERE outlet_id IN (SELECT id FROM outlets WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id = '${testMerchantUserId}'));`,
      );
      await db.query(
        `DELETE FROM outlets WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id = '${testMerchantUserId}');`,
      );
      await db.query(`DELETE FROM merchants WHERE owner_id = '${testMerchantUserId}';`);
    } catch {}

    // Seed test users in real PostgreSQL
    await db.query(`
      INSERT INTO users (id, phone, full_name, status, firebase_uid)
      VALUES 
        ('${testPartnerUserId}', '+919876520001', 'Live Test Partner 1', 'ACTIVE', 'fb-live-partner-1'),
        ('${otherPartnerUserId}', '+919876520002', 'Live Test Partner 2', 'ACTIVE', 'fb-live-partner-2'),
        ('${testMerchantUserId}', '+919876520003', 'Live Test Merchant 1', 'ACTIVE', 'fb-live-merchant-1'),
        ('${adminUserId}', '+919876520099', 'Live Test Admin', 'ACTIVE', 'fb-live-admin-1')
      ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE';
    `);
  });

  after(async () => {
    if (!isLiveAvailable) {
      return;
    }
    // Clean up test records in reverse dependency order
    try {
      await db.query(
        `DELETE FROM document_upload_tickets WHERE uploader_user_id IN ('${testPartnerUserId}', '${otherPartnerUserId}', '${testMerchantUserId}', '${adminUserId}');`,
      );
      await db.query(
        `DELETE FROM partner_service_applications WHERE partner_id IN (SELECT id FROM partners WHERE user_id IN ('${testPartnerUserId}', '${otherPartnerUserId}'));`,
      );
      await db.query(
        `DELETE FROM partner_documents WHERE partner_id IN (SELECT id FROM partners WHERE user_id IN ('${testPartnerUserId}', '${otherPartnerUserId}'));`,
      );
      await db.query(
        `DELETE FROM vehicles WHERE partner_id IN (SELECT id FROM partners WHERE user_id IN ('${testPartnerUserId}', '${otherPartnerUserId}'));`,
      );
      await db.query(
        `DELETE FROM partners WHERE user_id IN ('${testPartnerUserId}', '${otherPartnerUserId}');`,
      );
      await db.query(
        `DELETE FROM merchant_documents WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id = '${testMerchantUserId}');`,
      );
      await db.query(
        `DELETE FROM catalogs WHERE outlet_id IN (SELECT id FROM outlets WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id = '${testMerchantUserId}'));`,
      );
      await db.query(
        `DELETE FROM outlets WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id = '${testMerchantUserId}');`,
      );
      await db.query(`DELETE FROM merchants WHERE owner_id = '${testMerchantUserId}';`);
    } catch {}
    await db.onModuleDestroy();
    await redis.onModuleDestroy();
  });

  it('[LIVE DB] 1. Should persist partner with AES-256-GCM encrypted bank account in real PostgreSQL', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    const rawBank = '50100999999999';
    const reg = await partnerService.registerOrUpdate(testPartnerUserId, {
      vehicleType: 'MOTORCYCLE',
      registrationNumber: 'TN01LIVE11',
      makeModel: 'Bajaj Pulsar 150',
      bankAccountNumber: rawBank,
      bankIfsc: 'HDFC0001234',
      bankBeneficiaryName: 'Live Partner 1',
    });

    assert.ok(reg.partnerId);
    assert.strictEqual(reg.status, 'REGISTERED');
    assert.strictEqual(reg.bankAccountMasked, '**********9999');

    // Query real PostgreSQL database row directly
    const rawPartnerRes = await db.query(
      'SELECT bank_account_number, bank_account_hmac FROM partners WHERE user_id = $1;',
      [testPartnerUserId],
    );
    assert.strictEqual(rawPartnerRes.rows.length, 1);
    const row = rawPartnerRes.rows[0];

    // Assert bank account is stored encrypted with v1 prefix and not plaintext
    assert.ok(row.bank_account_number.startsWith('v1:'), 'Bank account in DB must be encrypted');
    assert.notStrictEqual(row.bank_account_number, rawBank, 'Plaintext must NEVER be stored in DB');
    assert.strictEqual(
      row.bank_account_hmac.length,
      64,
      'HMAC deduplication blind index must be 64-char hex',
    );

    // Verify decryption
    const decrypted = encryptionService.decrypt(row.bank_account_number);
    assert.strictEqual(decrypted, rawBank);
  });

  it('[LIVE DB] 2. Should persist independent service applications in partner_service_applications table', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    const app1 = await partnerService.applyForService(testPartnerUserId, 'FOOD_DELIVERY');
    const app2 = await partnerService.applyForService(testPartnerUserId, 'PARCEL');

    assert.strictEqual(app1.status, 'PENDING');
    assert.strictEqual(app2.status, 'PENDING');

    // Verify in real PostgreSQL
    const res = await db.query(
      `SELECT service_type, status FROM partner_service_applications 
       WHERE partner_id = (SELECT id FROM partners WHERE user_id = $1)
       ORDER BY service_type;`,
      [testPartnerUserId],
    );

    assert.strictEqual(res.rows.length, 2);
    assert.strictEqual(res.rows[0].service_type, 'FOOD_DELIVERY');
    assert.strictEqual(res.rows[1].service_type, 'PARCEL');
  });

  it('[LIVE DB] 3. Should enforce independent service approval and record immutable audit reason in real PostgreSQL', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    const pRes = await db.query('SELECT id FROM partners WHERE user_id = $1;', [testPartnerUserId]);
    const partnerId = pRes.rows[0].id;

    // Admin approves Food Delivery
    await partnerService.updateAdminServiceStatus(
      partnerId,
      'FOOD_DELIVERY',
      adminUserId,
      'APPROVED',
      'Motorcycle inspection verified',
    );

    // Admin rejects Parcel with reason
    await partnerService.updateAdminServiceStatus(
      partnerId,
      'PARCEL',
      adminUserId,
      'REJECTED',
      'Commercial permit required',
    );

    // Query DB to verify independent statuses
    const res = await db.query(
      'SELECT service_type, status, rejection_reason FROM partner_service_applications WHERE partner_id = $1 ORDER BY service_type;',
      [partnerId],
    );

    assert.strictEqual(res.rows[0].service_type, 'FOOD_DELIVERY');
    assert.strictEqual(res.rows[0].status, 'APPROVED');

    assert.strictEqual(res.rows[1].service_type, 'PARCEL');
    assert.strictEqual(res.rows[1].status, 'REJECTED');
    assert.strictEqual(res.rows[1].rejection_reason, 'Commercial permit required');

    // Verify audit log record exists with reason
    const auditRes = await db.query(
      `SELECT * FROM audit_logs WHERE actor_id = $1 AND action = 'ADMIN_PARTNER_SERVICE_STATUS_CHANGE' ORDER BY created_at DESC;`,
      [adminUserId],
    );
    assert.ok(auditRes.rows.length >= 2);
    assert.strictEqual(auditRes.rows[0].reason, 'Commercial permit required');
  });

  it('[LIVE DB] 4. Should create multi-outlet hierarchy and enforce independent outlet approval in real PostgreSQL', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    // 1. Register merchant with primary outlet
    const reg = await merchantService.registerOrUpdate(testMerchantUserId, {
      businessName: 'Live Chettinad Kitchen',
      merchantType: 'RESTAURANT',
      panNumber: 'ABCDE9876F',
      bankAccountNumber: '50100777777777',
      bankIfsc: 'HDFC0001234',
      bankBeneficiaryName: 'Live Chettinad Pvt Ltd',
      outletName: 'Live Chettinad Primary Branch',
      addressLine1: 'No 100 Main Road',
      postalCode: '600001',
      latitude: 13.0827,
      longitude: 80.2707,
      phone: '+919876520003',
    } as any);

    assert.strictEqual(reg.merchant.status, 'SUBMITTED');

    // 2. Create secondary branch outlet
    const branch2 = await merchantService.createOutlet(testMerchantUserId, {
      outletName: 'Live Chettinad Secondary Branch',
      addressLine1: 'No 200 Bypass Road',
      postalCode: '600042',
      latitude: 12.9815,
      longitude: 80.218,
      phone: '+919876520004',
    });

    assert.strictEqual(branch2.outlet_status, 'PENDING_APPROVAL');
    assert.strictEqual(branch2.is_open, false);

    // 3. Admin approves merchant profile
    await merchantService.updateAdminMerchantStatus(
      reg.merchant.id,
      'APPROVED',
      'Initial onboarding complete',
    );

    // 4. Verify in real PostgreSQL: primary outlet is active, secondary branch is STILL PENDING_APPROVAL
    const outletsInDb = await db.query(
      'SELECT id, outlet_name, outlet_status, is_open FROM outlets WHERE merchant_id = $1 ORDER BY created_at;',
      [reg.merchant.id],
    );

    assert.strictEqual(outletsInDb.rows.length, 2);
    assert.strictEqual(
      outletsInDb.rows[0].is_open,
      true,
      'Primary outlet opens upon merchant approval',
    );
    assert.strictEqual(
      outletsInDb.rows[1].outlet_status,
      'PENDING_APPROVAL',
      'Secondary branch must stay PENDING_APPROVAL',
    );
    assert.strictEqual(outletsInDb.rows[1].is_open, false, 'Secondary branch must stay closed');

    // 5. Admin independently approves secondary branch
    await merchantService.updateAdminOutletStatus(
      branch2.id,
      adminUserId,
      'ACTIVE',
      'Branch inspection passed',
    );

    const branchAfter = await db.query(
      'SELECT outlet_status, is_open FROM outlets WHERE id = $1;',
      [branch2.id],
    );
    assert.strictEqual(branchAfter.rows[0].outlet_status, 'ACTIVE');
    assert.strictEqual(branchAfter.rows[0].is_open, true);
  });

  it('[LIVE STORAGE & IDOR] 5. Should persist upload ticket in real PostgreSQL and enforce cross-user IDOR protection', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    // Partner 1 creates ticket
    const ticket1 = await storageService.createTicket(testPartnerUserId, {
      documentType: 'DRIVING_LICENSE',
      mimeType: 'application/pdf',
      fileSizeBytes: 2048,
    });

    // Verify ticket in real PostgreSQL table document_upload_tickets
    const ticketRow = await db.query('SELECT * FROM document_upload_tickets WHERE id = $1;', [
      ticket1.id,
    ]);
    assert.strictEqual(ticketRow.rows.length, 1);
    assert.strictEqual(ticketRow.rows[0].uploader_user_id, testPartnerUserId);
    assert.strictEqual(ticketRow.rows[0].status, 'PENDING_LINK');

    // Partner 2 attempts to upload binary to Partner 1's ticket (IDOR attack)
    const validPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
    await assert.rejects(async () => {
      await storageService.saveUploadedFile(ticket1.id, otherPartnerUserId, validPdf);
    }, /Ticket does not belong to authenticated user/);

    // Partner 1 successfully uploads file
    const uploaded = await storageService.saveUploadedFile(ticket1.id, testPartnerUserId, validPdf);
    assert.strictEqual(uploaded.file_size_bytes, validPdf.length);
    assert.strictEqual(uploaded.scan_status, 'SKIPPED_UNAVAILABLE', 'ClamAV offline fails closed');

    // Verify file on disk
    const diskPath = storageService.resolveAndValidatePath(ticket1.storage_key);
    assert.ok(fs.existsSync(diskPath));

    // Clean up file
    try {
      fs.unlinkSync(diskPath);
    } catch {}
  });
});
