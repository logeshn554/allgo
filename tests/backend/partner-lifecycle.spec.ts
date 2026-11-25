import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';
import { EncryptionService } from '../../services/api/dist/common/encryption/encryption.service.js';
import { PartnerService } from '../../services/api/dist/partner/partner.service.js';
import { StorageService } from '../../services/api/dist/storage/storage.service.js';
import { MockDatabaseService } from '../helpers/test-doubles.ts';

describe('Checkpoint 3: Partner Onboarding, KYC, Independent Services & Admin Approval', () => {
  let partnerService: PartnerService;
  let encryptionService: EncryptionService;
  let storageService: StorageService;
  let mockDb: MockDatabaseService;

  const testPartnerUserId = 'usr_partner_001';
  const otherPartnerUserId = 'usr_partner_002';
  const adminUserId = 'usr_admin_001';

  beforeEach(() => {
    mockDb = new MockDatabaseService();

    // Seed mock users
    mockDb.users.set(testPartnerUserId, {
      id: testPartnerUserId,
      phone: '+919876543210',
      full_name: 'Murugan Delivery Partner',
      status: 'ACTIVE',
    });

    mockDb.users.set(otherPartnerUserId, {
      id: otherPartnerUserId,
      phone: '+919876543211',
      full_name: 'Karthik Cab Partner',
      status: 'ACTIVE',
    });

    encryptionService = new EncryptionService();
    encryptionService.initializeKeys();

    storageService = new StorageService(mockDb as any);

    partnerService = new PartnerService(mockDb as any, encryptionService, storageService);
  });

  describe('Part A: Partner Registration, Vehicle Compatibility & Bank Encryption', () => {
    it('should register a new partner with vehicle details and AES-256-GCM encrypted bank account', async () => {
      const regDto = {
        vehicleType: 'MOTORCYCLE',
        registrationNumber: 'TN01AB1234',
        makeModel: 'Hero Splendor Plus',
        bankAccountNumber: '50100234567890',
        bankIfsc: 'HDFC0001234',
        bankBeneficiaryName: 'Murugan S',
      };

      const result = await partnerService.registerOrUpdate(testPartnerUserId, regDto);

      assert.ok(result.partnerId);
      assert.strictEqual(result.status, 'REGISTERED');
      assert.strictEqual(result.vehicle.registration_number, 'TN01AB1234');
      assert.strictEqual(result.bankAccountMasked, '**********7890');

      // Verify raw stored partner has encrypted bank account
      const stored = partnerService.inMemoryPartners.get(result.partnerId);
      assert.ok(
        stored.bank_account_number.startsWith('v1:'),
        'Bank account must be encrypted with v1 prefix',
      );
      assert.notStrictEqual(stored.bank_account_number, '50100234567890');
      assert.ok(stored.bank_account_hmac.length === 64, 'HMAC deduplication hash must be present');
    });

    it('should prevent blocked or suspended partners from re-registering', async () => {
      const reg = await partnerService.registerOrUpdate(testPartnerUserId, {
        vehicleType: 'SCOOTER',
        registrationNumber: 'TN02CD5678',
        makeModel: 'Honda Activa',
        bankAccountNumber: '1234567890',
        bankIfsc: 'SBIN0001234',
        bankBeneficiaryName: 'Murugan',
      });

      // Admin blocks partner
      await partnerService.updateAdminPartnerStatus(
        reg.partnerId,
        adminUserId,
        'BLOCKED',
        'Serious policy violation',
      );

      await assert.rejects(async () => {
        await partnerService.registerOrUpdate(testPartnerUserId, {
          vehicleType: 'SCOOTER',
          registrationNumber: 'TN02CD5678',
          makeModel: 'Honda Activa',
          bankAccountNumber: '1234567890',
          bankIfsc: 'SBIN0001234',
          bankBeneficiaryName: 'Murugan',
        });
      }, /Partner account is BLOCKED/);
    });
  });

  describe('Part B: Service Eligibility & Independent Applications', () => {
    it('should allow partner to apply for compatible services and reject incompatible vehicle types', async () => {
      // Register with a Motorcycle
      const reg = await partnerService.registerOrUpdate(testPartnerUserId, {
        vehicleType: 'MOTORCYCLE',
        registrationNumber: 'TN01AB1234',
        makeModel: 'Hero Splendor Plus',
        bankAccountNumber: '50100234567890',
        bankIfsc: 'HDFC0001234',
        bankBeneficiaryName: 'Murugan S',
      });

      // Food delivery with Motorcycle: Allowed
      const foodApp = await partnerService.applyForService(testPartnerUserId, 'FOOD_DELIVERY');
      assert.strictEqual(foodApp.service_type, 'FOOD_DELIVERY');
      assert.strictEqual(foodApp.status, 'PENDING');

      // Parcel delivery with Motorcycle: Allowed
      const parcelApp = await partnerService.applyForService(testPartnerUserId, 'PARCEL');
      assert.strictEqual(parcelApp.service_type, 'PARCEL');
      assert.strictEqual(parcelApp.status, 'PENDING');

      // Cab Sedan with Motorcycle: INCOMPATIBLE -> must be rejected
      await assert.rejects(async () => {
        await partnerService.applyForService(testPartnerUserId, 'CAB_SEDAN');
      }, /Vehicle type 'MOTORCYCLE' is not eligible for 'CAB_SEDAN'/);
    });
  });

  describe('Part C: Document Submission, Versioning & Supersession', () => {
    it('should version KYC documents and supersede older versions atomically', async () => {
      await partnerService.registerOrUpdate(testPartnerUserId, {
        vehicleType: 'MOTORCYCLE',
        registrationNumber: 'TN01AB1234',
        makeModel: 'Hero Splendor Plus',
        bankAccountNumber: '50100234567890',
        bankIfsc: 'HDFC0001234',
        bankBeneficiaryName: 'Murugan S',
      });

      // 1. Upload initial Driving License
      const ticket1 = await storageService.createTicket(testPartnerUserId, {
        documentType: 'DRIVING_LICENSE',
        mimeType: 'application/pdf',
        fileSizeBytes: 1024,
      });
      const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
      await storageService.saveUploadedFile(ticket1.id, testPartnerUserId, pdf);

      const docV1 = await partnerService.submitDocument(testPartnerUserId, {
        documentType: 'DRIVING_LICENSE',
        documentNumber: 'TN0120200001234',
        ticketId: ticket1.id,
      });

      assert.strictEqual(docV1.version, 1);
      assert.strictEqual(docV1.is_current, true);

      // 2. Upload renewed Driving License (version 2)
      const ticket2 = await storageService.createTicket(testPartnerUserId, {
        documentType: 'DRIVING_LICENSE',
        mimeType: 'application/pdf',
        fileSizeBytes: 1024,
      });
      await storageService.saveUploadedFile(ticket2.id, testPartnerUserId, pdf);

      const docV2 = await partnerService.submitDocument(testPartnerUserId, {
        documentType: 'DRIVING_LICENSE',
        documentNumber: 'TN0120260009999',
        ticketId: ticket2.id,
      });

      assert.strictEqual(docV2.version, 2);
      assert.strictEqual(docV2.is_current, true);

      // Verify V1 was superseded
      const updatedV1 = partnerService.inMemoryDocuments.get(docV1.id);
      assert.strictEqual(updatedV1.is_current, false);
      assert.strictEqual(updatedV1.superseded_by, docV2.id);
    });
  });

  describe('Part D: Onboarding Review Submission & Independent Service Approvals', () => {
    it('should submit dossier for review and transition status to DOCS_SUBMITTED', async () => {
      await partnerService.registerOrUpdate(testPartnerUserId, {
        vehicleType: 'MOTORCYCLE',
        registrationNumber: 'TN01AB1234',
        makeModel: 'Hero Splendor Plus',
        bankAccountNumber: '50100234567890',
        bankIfsc: 'HDFC0001234',
        bankBeneficiaryName: 'Murugan S',
      });

      await partnerService.applyForService(testPartnerUserId, 'FOOD_DELIVERY');

      const ticket = await storageService.createTicket(testPartnerUserId, {
        documentType: 'DRIVING_LICENSE',
        mimeType: 'application/pdf',
        fileSizeBytes: 1024,
      });
      const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
      await storageService.saveUploadedFile(ticket.id, testPartnerUserId, pdf);
      await partnerService.submitDocument(testPartnerUserId, {
        documentType: 'DRIVING_LICENSE',
        ticketId: ticket.id,
      });

      const submission = await partnerService.submitForReview(testPartnerUserId);
      assert.strictEqual(submission.status, 'DOCS_SUBMITTED');

      const profile = await partnerService.getProfile(testPartnerUserId);
      assert.strictEqual(profile.status, 'DOCS_SUBMITTED');
    });

    it('should strictly enforce independent service approval (FOOD_DELIVERY approval does not approve PARCEL)', async () => {
      const reg = await partnerService.registerOrUpdate(testPartnerUserId, {
        vehicleType: 'MOTORCYCLE',
        registrationNumber: 'TN01AB1234',
        makeModel: 'Hero Splendor Plus',
        bankAccountNumber: '50100234567890',
        bankIfsc: 'HDFC0001234',
        bankBeneficiaryName: 'Murugan S',
      });

      // Apply for two services
      await partnerService.applyForService(testPartnerUserId, 'FOOD_DELIVERY');
      await partnerService.applyForService(testPartnerUserId, 'PARCEL');

      // Admin approves Food Delivery only
      await partnerService.updateAdminServiceStatus(
        reg.partnerId,
        'FOOD_DELIVERY',
        adminUserId,
        'APPROVED',
      );

      // Admin rejects Parcel with reason
      await partnerService.updateAdminServiceStatus(
        reg.partnerId,
        'PARCEL',
        adminUserId,
        'REJECTED',
        'Commercial permit missing',
      );

      const profile = await partnerService.getProfile(testPartnerUserId);
      const foodService = profile.services.find((s: any) => s.service_type === 'FOOD_DELIVERY');
      const parcelService = profile.services.find((s: any) => s.service_type === 'PARCEL');

      assert.strictEqual(foodService.status, 'APPROVED');
      assert.strictEqual(parcelService.status, 'REJECTED');
      assert.strictEqual(parcelService.rejection_reason, 'Commercial permit missing');
    });

    it('should handle partner rejection, additional-document request, resubmission, suspension and reactivation', async () => {
      const reg = await partnerService.registerOrUpdate(testPartnerUserId, {
        vehicleType: 'MOTORCYCLE',
        registrationNumber: 'TN01AB1234',
        makeModel: 'Hero Splendor Plus',
        bankAccountNumber: '50100234567890',
        bankIfsc: 'HDFC0001234',
        bankBeneficiaryName: 'Murugan S',
      });

      // Apply for Food Delivery service
      await partnerService.applyForService(testPartnerUserId, 'FOOD_DELIVERY');

      // 1. Admin requests additional documents
      await partnerService.updateAdminPartnerStatus(
        reg.partnerId,
        adminUserId,
        'DOCUMENTS_REQUIRED',
        'Driving license copy is expired. Please re-upload current license.',
      );
      let profile = await partnerService.getProfile(testPartnerUserId);
      assert.strictEqual(profile.status, 'DOCUMENTS_REQUIRED');

      // 2. Partner resubmits document V2
      const ticket2 = await storageService.createTicket(testPartnerUserId, {
        documentType: 'DRIVING_LICENSE',
        mimeType: 'application/pdf',
        fileSizeBytes: 1024,
      });
      const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
      await storageService.saveUploadedFile(ticket2.id, testPartnerUserId, pdf);
      await partnerService.submitDocument(testPartnerUserId, {
        documentType: 'DRIVING_LICENSE',
        ticketId: ticket2.id,
      });
      await partnerService.submitForReview(testPartnerUserId);

      profile = await partnerService.getProfile(testPartnerUserId);
      assert.strictEqual(profile.status, 'DOCS_SUBMITTED');

      // 3. Admin approves partner
      await partnerService.updateAdminPartnerStatus(
        reg.partnerId,
        adminUserId,
        'APPROVED',
        'All documents verified',
      );
      profile = await partnerService.getProfile(testPartnerUserId);
      assert.strictEqual(profile.status, 'APPROVED');

      // 4. Admin suspends partner
      await partnerService.updateAdminPartnerStatus(
        reg.partnerId,
        adminUserId,
        'SUSPENDED',
        'Pending customer dispute investigation',
      );
      profile = await partnerService.getProfile(testPartnerUserId);
      assert.strictEqual(profile.status, 'SUSPENDED');

      // 5. Admin reactivates partner
      await partnerService.updateAdminPartnerStatus(
        reg.partnerId,
        adminUserId,
        'APPROVED',
        'Dispute cleared, partner reactivated',
      );
      profile = await partnerService.getProfile(testPartnerUserId);
      assert.strictEqual(profile.status, 'APPROVED');

      // 6. Admin rejects partner
      await partnerService.updateAdminPartnerStatus(
        reg.partnerId,
        adminUserId,
        'REJECTED',
        'Failed background verification',
      );
      profile = await partnerService.getProfile(testPartnerUserId);
      assert.strictEqual(profile.status, 'REJECTED');
    });
  });
});
