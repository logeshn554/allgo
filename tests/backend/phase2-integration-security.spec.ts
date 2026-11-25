import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';
import { EncryptionService } from '../../services/api/dist/common/encryption/encryption.service.js';
import { MerchantService } from '../../services/api/dist/merchant/merchant.service.js';
import { PartnerService } from '../../services/api/dist/partner/partner.service.js';
import { StorageService } from '../../services/api/dist/storage/storage.service.js';
import { InMemoryRedisTestDouble, MockDatabaseService } from '../helpers/test-doubles.ts';

describe('Checkpoint 7: Phase 2 End-to-End Integration & Security Boundary Verification', () => {
  let partnerService: PartnerService;
  let merchantService: MerchantService;
  let storageService: StorageService;
  let encryptionService: EncryptionService;
  let mockDb: MockDatabaseService;
  let mockRedis: InMemoryRedisTestDouble;

  const partnerUserA = 'usr_partner_alpha';
  const partnerUserB = 'usr_partner_beta';
  const merchantUserA = 'usr_merchant_alpha';
  const merchantUserB = 'usr_merchant_beta';
  const adminUser = 'usr_super_admin';

  beforeEach(() => {
    mockDb = new MockDatabaseService();
    mockRedis = new InMemoryRedisTestDouble();

    // Seed mock users
    mockDb.users.set(partnerUserA, {
      id: partnerUserA,
      phone: '+919876543201',
      full_name: 'Partner Alpha',
      status: 'ACTIVE',
    });
    mockDb.users.set(partnerUserB, {
      id: partnerUserB,
      phone: '+919876543202',
      full_name: 'Partner Beta',
      status: 'ACTIVE',
    });
    mockDb.users.set(merchantUserA, {
      id: merchantUserA,
      phone: '+919876543203',
      full_name: 'Merchant Alpha',
      status: 'ACTIVE',
    });
    mockDb.users.set(merchantUserB, {
      id: merchantUserB,
      phone: '+919876543204',
      full_name: 'Merchant Beta',
      status: 'ACTIVE',
    });
    mockDb.users.set(adminUser, {
      id: adminUser,
      phone: '+919876543999',
      full_name: 'Super Admin',
      status: 'ACTIVE',
    });

    encryptionService = new EncryptionService();
    encryptionService.initializeKeys();

    storageService = new StorageService(mockDb as any);

    partnerService = new PartnerService(mockDb as any, encryptionService, storageService);
    merchantService = new MerchantService(
      mockDb as any,
      mockRedis as any,
      encryptionService,
      storageService,
    );
  });

  describe('Part A: End-to-End Partner Onboarding & Independent Service Lifecycle', () => {
    it('should complete the entire partner onboarding workflow with independent service decisions', async () => {
      // 1. Register partner profile & motorcycle
      const reg = await partnerService.registerOrUpdate(partnerUserA, {
        vehicleType: 'MOTORCYCLE',
        registrationNumber: 'TN01XY1111',
        makeModel: 'TVS Apache RTR',
        bankAccountNumber: '50100999999999',
        bankIfsc: 'HDFC0001234',
        bankBeneficiaryName: 'Partner Alpha',
      });
      assert.strictEqual(reg.status, 'REGISTERED');

      // 2. Apply for two independent services: FOOD_DELIVERY and BIKE_TAXI
      const foodApp = await partnerService.applyForService(partnerUserA, 'FOOD_DELIVERY');
      const taxiApp = await partnerService.applyForService(partnerUserA, 'BIKE_TAXI');
      assert.strictEqual(foodApp.status, 'PENDING');
      assert.strictEqual(taxiApp.status, 'PENDING');

      // 3. Upload and submit driving license
      const ticket = await storageService.createTicket(partnerUserA, {
        documentType: 'DRIVING_LICENSE',
        mimeType: 'application/pdf',
        fileSizeBytes: 2048,
      });
      const validPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
      await storageService.saveUploadedFile(ticket.id, partnerUserA, validPdf);

      const doc = await partnerService.submitDocument(partnerUserA, {
        documentType: 'DRIVING_LICENSE',
        documentNumber: 'TN0120250001111',
        ticketId: ticket.id,
      });
      assert.strictEqual(doc.version, 1);
      assert.strictEqual(doc.is_current, true);

      // 4. Partner submits dossier for administrative review
      const submission = await partnerService.submitForReview(partnerUserA);
      assert.strictEqual(submission.status, 'DOCS_SUBMITTED');

      // 5. Admin lists applications queue and sees Partner Alpha
      const queue = await partnerService.listAdminApplications({ status: 'DOCS_SUBMITTED' });
      assert.ok(queue.some((p: any) => p.id === reg.partnerId));

      // 6. Admin performs review:
      // APPROVE overall account
      await partnerService.updateAdminPartnerStatus(
        reg.partnerId,
        adminUser,
        'APPROVED',
        'Identity and vehicle verified',
      );
      // INDEPENDENT APPROVAL: Approve FOOD_DELIVERY
      await partnerService.updateAdminServiceStatus(
        reg.partnerId,
        'FOOD_DELIVERY',
        adminUser,
        'APPROVED',
        'Standard food delivery authorized',
      );
      // INDEPENDENT DECISION: REJECT BIKE_TAXI pending municipal legal clearance
      await partnerService.updateAdminServiceStatus(
        reg.partnerId,
        'BIKE_TAXI',
        adminUser,
        'REJECTED',
        'Municipal bike taxi aggregator clearance pending',
      );

      // 7. Verify partner profile in mobile app reflects exact independent states
      const profile = await partnerService.getProfile(partnerUserA);
      assert.strictEqual(profile.status, 'APPROVED');

      const approvedFood = profile.services.find((s: any) => s.service_type === 'FOOD_DELIVERY');
      const rejectedTaxi = profile.services.find((s: any) => s.service_type === 'BIKE_TAXI');

      assert.strictEqual(approvedFood.status, 'APPROVED');
      assert.strictEqual(rejectedTaxi.status, 'REJECTED');
      assert.strictEqual(
        rejectedTaxi.rejection_reason,
        'Municipal bike taxi aggregator clearance pending',
      );
    });
  });

  describe('Part B: End-to-End Multi-Outlet Merchant Lifecycle & Resubmission Flow', () => {
    it('should complete merchant onboarding, multi-outlet creation, document resubmission and independent outlet approvals', async () => {
      // 1. Merchant registers profile and primary outlet
      const reg = await merchantService.registerOrUpdate(merchantUserA, {
        businessName: 'Thalappakatti Biryani',
        merchantType: 'RESTAURANT',
        panNumber: 'ABCDE9999F',
        bankAccountNumber: '50100888888888',
        bankIfsc: 'HDFC0001234',
        bankBeneficiaryName: 'Thalappakatti Pvt Ltd',
        outletName: 'Thalappakatti T Nagar',
        addressLine1: 'No 100 Usman Road',
        postalCode: '600017',
        latitude: 13.0405,
        longitude: 80.2337,
        phone: '+919876543203',
      } as any);

      // 2. Upload initial FSSAI document
      const ticketV1 = await storageService.createTicket(merchantUserA, {
        documentType: 'FSSAI_LICENSE',
        mimeType: 'application/pdf',
        fileSizeBytes: 2048,
      });
      const validPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
      await storageService.saveUploadedFile(ticketV1.id, merchantUserA, validPdf);
      const docV1 = await merchantService.submitDocument(merchantUserA, {
        documentType: 'FSSAI_LICENSE',
        documentNumber: '12423001009999',
        ticketId: ticketV1.id,
      });
      assert.strictEqual(docV1.version, 1);

      // 3. Create second outlet branch (starts PENDING_APPROVAL)
      const branch2 = await merchantService.createOutlet(merchantUserA, {
        outletName: 'Thalappakatti Velachery Branch',
        addressLine1: 'No 12 Bypass Road',
        postalCode: '600042',
        latitude: 12.9815,
        longitude: 80.218,
        phone: '+919876543205',
      });
      assert.strictEqual(branch2.outlet_status, 'PENDING_APPROVAL');
      assert.strictEqual(branch2.is_open, false);

      // 4. Admin requests additional documents
      await merchantService.updateAdminMerchantStatus(
        reg.merchant.id,
        'DOCUMENTS_REQUIRED',
        'FSSAI document image was blurry. Please re-upload high resolution copy.',
      );

      const profileReq = await merchantService.getProfile(merchantUserA);
      assert.strictEqual(profileReq.status, 'DOCUMENTS_REQUIRED');

      // 5. Merchant resubmits renewed document V2
      const ticketV2 = await storageService.createTicket(merchantUserA, {
        documentType: 'FSSAI_LICENSE',
        mimeType: 'application/pdf',
        fileSizeBytes: 2048,
      });
      await storageService.saveUploadedFile(ticketV2.id, merchantUserA, validPdf);
      const docV2 = await merchantService.submitDocument(merchantUserA, {
        documentType: 'FSSAI_LICENSE',
        documentNumber: '12423001009999-R',
        ticketId: ticketV2.id,
      });
      assert.strictEqual(docV2.version, 2);
      assert.strictEqual(docV2.is_current, true);

      // Resubmit application
      await merchantService.submitForReview(merchantUserA);

      // 6. Admin approves merchant profile
      await merchantService.updateAdminMerchantStatus(reg.merchant.id, 'APPROVED');

      // 7. Verify: Primary outlet is active, but secondary branch MUST REMAIN PENDING_APPROVAL
      const outlets = await merchantService.getOutlets(merchantUserA);
      const branch2After = outlets.find((o: any) => o.id === branch2.id);
      assert.strictEqual(
        branch2After.outlet_status,
        'PENDING_APPROVAL',
        'Secondary branch must not auto-activate',
      );
      assert.strictEqual(branch2After.is_open, false);

      // 8. Admin independently approves branch 2
      await merchantService.updateAdminOutletStatus(
        branch2.id,
        adminUser,
        'ACTIVE',
        'Branch inspection passed',
      );
      const branch2Final = (await merchantService.getOutlets(merchantUserA)).find(
        (o: any) => o.id === branch2.id,
      );
      assert.strictEqual(branch2Final.outlet_status, 'ACTIVE');
      assert.strictEqual(branch2Final.is_open, true);
    });
  });

  describe('Part C: Security Boundary, IDOR & Authorization Enforcements', () => {
    it('should prevent cross-user upload ticket linking (IDOR protection)', async () => {
      // Register Partner B profile
      await partnerService.registerOrUpdate(partnerUserB, {
        vehicleType: 'MOTORCYCLE',
        registrationNumber: 'TN02AB2222',
        makeModel: 'Honda Shine',
        bankAccountNumber: '50100888888888',
        bankIfsc: 'HDFC0001234',
        bankBeneficiaryName: 'Partner Beta',
      });

      // Partner A creates ticket
      const ticketA = await storageService.createTicket(partnerUserA, {
        documentType: 'DRIVING_LICENSE',
        mimeType: 'application/pdf',
        fileSizeBytes: 1024,
      });

      // Partner B attempts to link Partner A's ticket to Partner B's profile
      await assert.rejects(async () => {
        await partnerService.submitDocument(partnerUserB, {
          documentType: 'DRIVING_LICENSE',
          ticketId: ticketA.id,
        });
      }, /ownership mismatch/);
    });

    it('should prevent cross-user binary file uploads to other users tickets', async () => {
      const ticketA = await storageService.createTicket(partnerUserA, {
        documentType: 'DRIVING_LICENSE',
        mimeType: 'application/pdf',
        fileSizeBytes: 1024,
      });
      const validPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');

      // User B attempts to upload binary into User A's ticket
      await assert.rejects(async () => {
        await storageService.saveUploadedFile(ticketA.id, partnerUserB, validPdf);
      }, /Ticket does not belong to authenticated user/);
    });
  });
});
