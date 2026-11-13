import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase 2 Mobile: Partner Mobile Onboarding, Services & Verification Architecture', () => {
  const rootDir = path.resolve(import.meta.dirname, '../..');
  const partnerAppDir = path.join(rootDir, 'apps/partner_mobile');
  const sharedPackageDir = path.join(rootDir, 'packages/mobile_shared');

  describe('Partner Registration Wizard (apps/partner_mobile/lib/src/screens/partner_registration_screen.dart)', () => {
    const regScreenPath = path.join(partnerAppDir, 'lib/src/screens/partner_registration_screen.dart');

    it('should exist and implement complete partner registration form', () => {
      assert.ok(fs.existsSync(regScreenPath), 'partner_registration_screen.dart must exist');
      const content = fs.readFileSync(regScreenPath, 'utf8');

      // Vehicle selection
      assert.ok(content.includes('MOTORCYCLE'));
      assert.ok(content.includes('AUTO_RICKSHAW'));
      assert.ok(content.includes('CAB_SEDAN'));

      // Banking fields
      assert.ok(content.includes('Bank Account Number'));
      assert.ok(content.includes('Bank IFSC Code'));
      assert.ok(content.includes('Bank Beneficiary Name'));

      // Service category checkboxes
      assert.ok(content.includes('FOOD_DELIVERY'));
      assert.ok(content.includes('PARCEL'));
      assert.ok(content.includes('BIKE_TAXI'));

      // Real API wiring
      assert.ok(content.includes('client.registerPartner'));
      assert.ok(content.includes('client.applyPartnerService'));
      assert.ok(content.includes('client.submitPartnerDocument'));
      assert.ok(content.includes('client.submitPartnerApplication'));
    });
  });

  describe('Partner Approval Status & Operational Gating (apps/partner_mobile/lib/src/screens/approval_status_screen.dart)', () => {
    const statusScreenPath = path.join(partnerAppDir, 'lib/src/screens/approval_status_screen.dart');

    it('should implement live status polling and independent service breakdown', () => {
      assert.ok(fs.existsSync(statusScreenPath), 'approval_status_screen.dart must exist');
      const content = fs.readFileSync(statusScreenPath, 'utf8');

      assert.ok(content.includes('client.getPartnerProfile()'));
      assert.ok(content.includes('Service Category Approvals'));
      assert.ok(content.includes('DOCUMENTS_REQUIRED'));
      assert.ok(content.includes('REJECTED'));
      assert.ok(content.includes('APPROVED'));
    });
  });

  describe('Shared Package: Partner Domain Models & API Contracts', () => {
    it('should export PartnerProfile and ApiClient partner methods', () => {
      const exportFile = path.join(sharedPackageDir, 'lib/allgo_mobile_shared.dart');
      const exportContent = fs.readFileSync(exportFile, 'utf8');
      assert.ok(exportContent.includes('export \'src/models/partner_profile.dart\';'));

      const clientFile = path.join(sharedPackageDir, 'lib/src/api/api_client.dart');
      const clientContent = fs.readFileSync(clientFile, 'utf8');
      assert.ok(clientContent.includes('registerPartner('));
      assert.ok(clientContent.includes('applyPartnerService('));
      assert.ok(clientContent.includes('submitPartnerDocument('));
      assert.ok(clientContent.includes('submitPartnerApplication('));
      assert.ok(clientContent.includes('createUploadTicket('));
      assert.ok(clientContent.includes('uploadDocumentBinary('));
    });
  });
});
