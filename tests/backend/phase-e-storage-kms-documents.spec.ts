import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { StorageService } from '../../apps/api/dist/storage/storage.service.js';
import { CloudKmsService } from '../../apps/api/dist/storage/cloud-kms.service.js';
import { MerchantDocumentService } from '../../apps/api/dist/merchant/merchant-document.service.js';
import { PartnerVerificationOnboardingService } from '../../apps/api/dist/partner/partner-verification-onboarding.service.js';
import { RekognitionLivenessProvider, ExternalBackgroundCheckProvider } from '../../apps/api/dist/partner/interfaces/mock-liveness-and-bgc.provider.js';
import { ComplianceVerificationService } from '../../apps/api/dist/common/compliance/compliance-verification.service.js';
import { GstInvoiceService } from '../../apps/api/dist/ordering/services/gst-invoice.service.js';
import { MockDatabaseService } from '../helpers/test-doubles.ts';

describe('Phase E: Storage, Cloud KMS, Documents, Liveness & Invoices Test Suite', () => {
  let tempStorageDir: string;
  let mockDb: any;
  let storageService: StorageService;
  let kmsService: CloudKmsService;

  before(() => {
    tempStorageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'allgo-phase-e-storage-'));
    mockDb = new MockDatabaseService();
    storageService = new StorageService(mockDb);
    storageService.setStorageRootForTesting(tempStorageDir);
    kmsService = new CloudKmsService();
    kmsService.initializeKms();
  });

  after(() => {
    if (fs.existsSync(tempStorageDir)) {
      fs.rmSync(tempStorageDir, { recursive: true, force: true });
    }
  });

  describe('1. Cloud Storage, Signed URLs & Cloud KMS Document Encryption', () => {
    it('generateSignedUploadUrl and generateSignedDownloadUrl should produce signed URLs with signature and expiry', async () => {
      const uploadUrl = await storageService.generateSignedUploadUrl('kyc/doc_101.pdf', { expiresInSeconds: 600 });
      assert.ok(uploadUrl.includes('https://storage.googleapis.com/'));
      assert.ok(uploadUrl.includes('Action=PUT'));
      assert.ok(uploadUrl.includes('Signature='));
      assert.ok(uploadUrl.includes('Expires='));

      const downloadUrl = await storageService.generateSignedDownloadUrl('kyc/doc_101.pdf', { expiresInSeconds: 300 });
      assert.ok(downloadUrl.includes('https://storage.googleapis.com/'));
      assert.ok(downloadUrl.includes('Action=GET'));
      assert.ok(downloadUrl.includes('Signature='));
      assert.ok(downloadUrl.includes('Expires='));
    });

    it('uploadKmsEncryptedFile should encrypt payload at rest with KMS envelope and allow clean decryption', async () => {
      const samplePdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
      const storageKey = 'partner_kyc_aadhaar_001.pdf';

      const meta = await storageService.uploadKmsEncryptedFile(storageKey, samplePdf, 'application/pdf');
      assert.strictEqual(meta.storageKey, storageKey);
      assert.strictEqual(meta.kmsEncrypted, true);
      assert.ok(meta.kmsKeyId);

      // Inspect file on disk to ensure raw bytes are NOT plaintext PDF
      const diskPath = storageService.resolveAndValidatePath(storageKey);
      const rawDiskBytes = fs.readFileSync(diskPath);
      assert.ok(rawDiskBytes.subarray(0, 10).toString('utf8') === 'ALLGO_KMS:');
      assert.notStrictEqual(rawDiskBytes.toString('utf8'), samplePdf.toString('utf8'));

      // Retrieve via service: should be cleanly decrypted back to original PDF
      const decrypted = storageService.getFileBuffer(storageKey);
      assert.strictEqual(decrypted.toString('utf8'), samplePdf.toString('utf8'));
    });

    it('decryptDocumentPayload should reject corrupted ciphertext and truncated headers', () => {
      // 1. Truncated header
      const truncatedBuf = Buffer.from('ALLGO_KMS:\x00\x00\x00\x50{"truncated":');
      assert.throws(() => {
        kmsService.decryptDocumentPayload(truncatedBuf);
      }, /truncated payload bytes/);

      // 2. Corrupted ciphertext / auth tag
      const plain = Buffer.from('Confidential KYC Aadhaar payload');
      const encrypted = kmsService.encryptDocumentPayload(plain);
      // Flip a byte in the auth tag / ciphertext portion
      encrypted[encrypted.length - 2] ^= 0x55;
      assert.throws(() => {
        kmsService.decryptDocumentPayload(encrypted);
      });
    });
  });

  describe('2. Removal of mock/ storage key fallback in MerchantDocumentService', () => {
    it('should throw InternalServerErrorException if storage service is missing/undefined', async () => {
      const mockMerchantRepo: any = {
        findMerchantByOwnerId: async () => ({ id: 'merchant_123', owner_id: 'user_123' }),
      };
      const mockDocRepo: any = {};

      const docServiceNoStorage = new MerchantDocumentService(mockMerchantRepo, mockDocRepo, undefined);

      await assert.rejects(
        async () => {
          await docServiceNoStorage.submitDocument('user_123', {
            documentType: 'FSSAI_LICENSE',
            ticketId: 'ticket_999',
          });
        },
        /Storage service is unavailable/
      );
    });
  });

  describe('3. Selfie Liveness Check & Background Verification Providers', () => {
    let onboardingService: PartnerVerificationOnboardingService;

    before(() => {
      onboardingService = new PartnerVerificationOnboardingService(
        new RekognitionLivenessProvider(),
        new ExternalBackgroundCheckProvider()
      );
    });

    it('verifySelfieLiveness should succeed with valid facial selfie key', async () => {
      const result = await onboardingService.verifySelfieLiveness('partner_1', 'selfies/partner_1_face.jpg');
      assert.strictEqual(result.isLive, true);
      assert.ok(result.confidenceScore >= 0.95);
      assert.strictEqual(result.checks.antiSpoofingPassed, true);
    });

    it('verifySelfieLiveness should reject empty or spoofed selfie key', async () => {
      const emptyResult = await onboardingService.verifySelfieLiveness('partner_2', '');
      assert.strictEqual(emptyResult.isLive, false);
      assert.strictEqual(emptyResult.checks.antiSpoofingPassed, false);

      const spoofResult = await onboardingService.verifySelfieLiveness('partner_3', 'selfies/tampered_avatar.jpg');
      assert.strictEqual(spoofResult.isLive, false);
      assert.ok(spoofResult.rejectionReason?.includes('spoofing'));
    });

    it('runPartnerBackgroundCheck should return clear for clean partners and flag adverse history', async () => {
      const cleanCheck = await onboardingService.runPartnerBackgroundCheck('partner_1', 'Ramesh Kumar', 'DL1420110012345');
      assert.strictEqual(cleanCheck.status, 'CLEAR');
      assert.strictEqual(cleanCheck.criminalHistoryFound, false);

      const flaggedCheck = await onboardingService.runPartnerBackgroundCheck('partner_suspect', 'John Suspect Doe');
      assert.strictEqual(flaggedCheck.status, 'FLAGGED');
      assert.strictEqual(flaggedCheck.criminalHistoryFound, true);
    });

    it('training quiz and delivery kit steps should record progress', () => {
      const quizResult = onboardingService.submitTrainingQuiz({
        partnerId: 'partner_1',
        serviceType: 'FOOD_DELIVERY',
        answers: [
          { questionId: 'q1', answerIndex: 0 },
          { questionId: 'q2', answerIndex: 1 },
          { questionId: 'q3', answerIndex: 0 },
        ],
      });
      assert.strictEqual(quizResult.passed, true);
      assert.strictEqual(quizResult.scorePercentage, 100);

      const kitResult = onboardingService.updateKitStatus('partner_1', {
        tshirtProvided: true,
        thermalBagProvided: true,
        helmetCheckPassed: true,
        kitStatus: 'COLLECTED',
      });
      assert.strictEqual(kitResult.kitStatus, 'COLLECTED');

      const summary = onboardingService.getOnboardingVerificationSummary('partner_1');
      assert.strictEqual(summary.trainingQuiz?.passed, true);
      assert.strictEqual(summary.deliveryKit?.kitStatus, 'COLLECTED');
    });
  });

  describe('4. Penny-Drop Bank & FSSAI / GST / PAN Admin Verification', () => {
    let complianceService: ComplianceVerificationService;

    before(() => {
      complianceService = new ComplianceVerificationService();
    });

    it('validatePanFormat should validate 10-char PAN and identify entity category', () => {
      const companyPan = complianceService.validatePanFormat('ABCCE1234F');
      assert.strictEqual(companyPan.isValid, true);
      assert.strictEqual(companyPan.details?.entityType, 'Company');

      const personPan = complianceService.validatePanFormat('ABCPK1234Z');
      assert.strictEqual(personPan.isValid, true);
      assert.strictEqual(personPan.details?.entityType, 'Individual');

      const invalidPan = complianceService.validatePanFormat('INVALID123');
      assert.strictEqual(invalidPan.isValid, false);
      assert.ok(invalidPan.errorMessage);
    });

    it('validateGstinFormat should validate state code, embedded PAN, and 15-char structure', () => {
      const validGst = complianceService.validateGstinFormat('33AABCA1234A1Z5');
      assert.strictEqual(validGst.isValid, true);
      assert.strictEqual(validGst.details?.stateCode, '33');

      const invalidGst = complianceService.validateGstinFormat('12345');
      assert.strictEqual(invalidGst.isValid, false);
    });

    it('validateFssaiFormat should validate 14-digit license prefix', () => {
      const validFssai = complianceService.validateFssaiFormat('12423001000123');
      assert.strictEqual(validFssai.isValid, true);

      const invalidFssai = complianceService.validateFssaiFormat('32423001000123'); // Invalid prefix
      assert.strictEqual(invalidFssai.isValid, false);
    });

    it('executePennyDropVerification should verify real bank account with UTR simulation', async () => {
      const dropResult = await complianceService.executePennyDropVerification({
        bankAccountNumber: '50100234567890',
        bankIfsc: 'HDFC0001234',
        beneficiaryName: 'Anjappar Chettinad',
      });
      assert.strictEqual(dropResult.verified, true);
      assert.strictEqual(dropResult.bankResponseCode, 'ACTC');
      assert.ok(dropResult.utrNumber.startsWith('UTR'));
    });

    it('recordAdminVerification should register audit trail for compliance verification', () => {
      complianceService.recordAdminVerification({
        entityType: 'MERCHANT',
        entityId: 'merchant_anjappar',
        adminUserId: 'admin_super_1',
        verificationType: 'FSSAI',
        status: 'VERIFIED',
        notes: 'FSSAI license active on national portal',
      });

      const record = complianceService.getEntityVerificationRecord('merchant_anjappar');
      assert.strictEqual(record?.FSSAI.status, 'VERIFIED');
      assert.strictEqual(record?.FSSAI.adminUserId, 'admin_super_1');
    });
  });

  describe('5. GST Tax Invoices (Per Sub-Order & Combined Summary)', () => {
    let invoiceService: GstInvoiceService;

    before(() => {
      invoiceService = new GstInvoiceService(storageService);
    });

    it('generateSubOrderGstInvoice should produce PDF tax invoice stored in private storage', async () => {
      const subOrderData = {
        invoiceNumber: 'INV-2026-CHN-0089',
        subOrderId: 'sub_ord_555',
        orderGroupId: 'grp_888',
        merchantName: 'A2B Sweets and Snacks',
        merchantGstin: '33AABCA1234A1Z5',
        merchantFssai: '12423001000123',
        customerName: 'Karthik Raja',
        customerPhone: '+919876543210',
        customerAddress: '42 Gandhi Road, Chennai',
        items: [
          { title: 'Ghee Mysore Pak 500g', quantity: 2, unitPriceInr: 320, totalInr: 640, gstRatePercent: 5 },
          { title: 'Madras Mixture 250g', quantity: 1, unitPriceInr: 120, totalInr: 120, gstRatePercent: 12 },
        ],
        taxableAmountInr: 760,
        cgstAmountInr: 23.2,
        sgstAmountInr: 23.2,
        igstAmountInr: 0,
        packagingFeeInr: 15,
        deliveryFeeInr: 35,
        totalAmountInr: 856.4,
        issuedAt: new Date(),
      };

      const result = await invoiceService.generateSubOrderGstInvoice(subOrderData);
      assert.ok(result.storageKey.startsWith('invoices/sub_order_'));
      assert.ok(result.signedUrl.includes('https://storage.googleapis.com/'));

      // Validate decrypted PDF header and footer
      const buffer = storageService.getFileBuffer(result.storageKey);
      assert.ok(buffer.subarray(0, 5).toString('ascii') === '%PDF-');
      assert.ok(buffer.toString('ascii').includes('%%EOF'));
      assert.ok(buffer.toString('ascii').includes('INV-2026-CHN-0089'));
    });

    it('generateCombinedCustomerSummary should produce combined summary for multi-outlet orders', async () => {
      const summaryData = {
        orderGroupId: 'grp_multi_99',
        customerName: 'Karthik Raja',
        totalAmountPaidInr: 1450,
        subInvoices: [
          { subOrderId: 'sub_1', merchantName: 'A2B Sweets', subTotalInr: 850, invoiceNumber: 'INV-01' },
          { subOrderId: 'sub_2', merchantName: 'Nilgiris Groceries', subTotalInr: 600, invoiceNumber: 'INV-02' },
        ],
        totalCgstInr: 45,
        totalSgstInr: 45,
        issuedAt: new Date(),
      };

      const result = await invoiceService.generateCombinedCustomerSummary(summaryData);
      assert.ok(result.storageKey.startsWith('invoices/summary_group_'));
      assert.ok(result.signedUrl.includes('https://storage.googleapis.com/'));

      const buffer = storageService.getFileBuffer(result.storageKey);
      assert.ok(buffer.subarray(0, 5).toString('ascii') === '%PDF-');
      assert.ok(buffer.toString('ascii').includes('%%EOF'));
      assert.ok(buffer.toString('ascii').includes('grp_multi_99'));
    });
  });
});
