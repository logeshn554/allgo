-- ============================================================================
-- AllGo Database Migration Rollback 003: Phase 2 KYC, Document Management
-- Exact symmetric inverse of 003_phase2_kyc_and_onboarding.sql
-- ============================================================================

BEGIN;

-- 1. REVERT OUTLETS
ALTER TABLE outlets DROP CONSTRAINT IF EXISTS chk_outlet_status;
ALTER TABLE outlets DROP COLUMN IF EXISTS outlet_status;

-- 2. REVERT MERCHANTS
DROP INDEX IF EXISTS idx_merchants_pan_hmac;
ALTER TABLE merchants DROP COLUMN IF EXISTS bank_account_hmac;
ALTER TABLE merchants DROP COLUMN IF EXISTS pan_hmac;
ALTER TABLE merchants DROP CONSTRAINT IF EXISTS chk_merchant_status;
ALTER TABLE merchants ADD CONSTRAINT chk_merchant_status CHECK (
    status IN ('REGISTERED', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'LIVE', 'PAUSED', 'SUSPENDED')
);

-- 3. DROP MERCHANT DOCUMENTS
DROP INDEX IF EXISTS idx_merchant_doc_current;
DROP TABLE IF EXISTS merchant_documents;

-- 4. REVERT PARTNER SENSITIVE FIELD HASH & DROP SERVICE APPLICATIONS
ALTER TABLE partners DROP COLUMN IF EXISTS bank_account_hmac;
DROP INDEX IF EXISTS idx_partner_services_status;
DROP TABLE IF EXISTS partner_service_applications;

-- 5. REVERT PARTNER DOCUMENTS
DROP INDEX IF EXISTS idx_partner_doc_current;
ALTER TABLE partner_documents DROP CONSTRAINT IF EXISTS chk_doc_status;
ALTER TABLE partner_documents ADD CONSTRAINT chk_doc_status CHECK (
    verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')
);
ALTER TABLE partner_documents DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE partner_documents DROP COLUMN IF EXISTS reviewed_by;
ALTER TABLE partner_documents DROP COLUMN IF EXISTS superseded_by;
ALTER TABLE partner_documents DROP COLUMN IF EXISTS is_current;
ALTER TABLE partner_documents DROP COLUMN IF EXISTS version;
ALTER TABLE partner_documents DROP COLUMN IF EXISTS file_size_bytes;
ALTER TABLE partner_documents DROP COLUMN IF EXISTS mime_type;
ALTER TABLE partner_documents DROP COLUMN IF EXISTS file_name;
ALTER TABLE partner_documents DROP COLUMN IF EXISTS storage_key;

-- Revert foreign key back to CASCADE if needed
ALTER TABLE partner_documents DROP CONSTRAINT IF EXISTS partner_documents_partner_id_fkey;
ALTER TABLE partner_documents ADD CONSTRAINT partner_documents_partner_id_fkey
    FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;

-- 6. DROP DOCUMENT UPLOAD TICKETS
DROP INDEX IF EXISTS idx_upload_tickets_cleanup;
DROP TABLE IF EXISTS document_upload_tickets;

-- 7. REVERT AUDIT LOGS IMMUTABILITY TRIGGER AND REASON COLUMN
DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON audit_logs;
DROP FUNCTION IF EXISTS prevent_audit_logs_mutation();
ALTER TABLE audit_logs DROP COLUMN IF EXISTS reason;

COMMIT;
