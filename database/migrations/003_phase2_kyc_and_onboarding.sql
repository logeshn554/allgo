-- ============================================================================
-- AllGo Database Migration 003: Phase 2 KYC, Document Management & Onboarding
-- Additive migration for partner & merchant verification, upload tickets,
-- per-service partner applications, multi-outlet lifecycle, and audit security.
-- ============================================================================

BEGIN;

-- 1. EXTEND AUDIT LOGS WITH REASON AND APPEND-ONLY IMMUTABILITY TRIGGER
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS reason TEXT;

CREATE OR REPLACE FUNCTION prevent_audit_logs_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is an immutable audit trail: % operations are strictly prohibited.', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_logs_mutation();

-- 2. DOCUMENT UPLOAD TICKETS (Ephemerality, content validation & anti-orphan tracking)
CREATE TABLE IF NOT EXISTS document_upload_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploader_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    storage_key VARCHAR(255) NOT NULL UNIQUE,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING_LINK',
    linked_entity_type VARCHAR(50),
    linked_entity_id UUID,
    scan_status VARCHAR(32) NOT NULL DEFAULT 'UNSCANNED',
    scan_result TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
    CONSTRAINT chk_ticket_status CHECK (status IN ('PENDING_LINK', 'LINKED', 'REVIEWABLE', 'EXPIRED', 'FAILED', 'ORPHANED')),
    CONSTRAINT chk_scan_status CHECK (scan_status IN ('UNSCANNED', 'CLEAN', 'INFECTED', 'SKIPPED_UNAVAILABLE', 'FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_upload_tickets_cleanup
    ON document_upload_tickets (status, expires_at)
    WHERE status = 'PENDING_LINK';

-- 3. EXTEND PARTNER DOCUMENTS (Versioning, storage keys, supersession & non-cascade retention)
-- Replace CASCADE deletion foreign key with RESTRICT to protect historical verification records
ALTER TABLE partner_documents DROP CONSTRAINT IF EXISTS partner_documents_partner_id_fkey;
ALTER TABLE partner_documents ADD CONSTRAINT partner_documents_partner_id_fkey 
    FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE RESTRICT;

ALTER TABLE partner_documents ADD COLUMN IF NOT EXISTS storage_key VARCHAR(255);
ALTER TABLE partner_documents ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
ALTER TABLE partner_documents ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);
ALTER TABLE partner_documents ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;
ALTER TABLE partner_documents ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE partner_documents ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE partner_documents ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES partner_documents(id) ON DELETE SET NULL;
ALTER TABLE partner_documents ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE partner_documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Extend partner document status check constraint to include UNDER_REVIEW and DOCUMENTS_REQUIRED
ALTER TABLE partner_documents DROP CONSTRAINT IF EXISTS chk_doc_status;
ALTER TABLE partner_documents ADD CONSTRAINT chk_doc_status CHECK (
    verification_status IN ('PENDING', 'UNDER_REVIEW', 'DOCUMENTS_REQUIRED', 'VERIFIED', 'REJECTED')
);

-- Partial unique index ensuring only one active/current document per document type per partner
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_doc_current
    ON partner_documents (partner_id, document_type)
    WHERE is_current = TRUE AND deleted_at IS NULL;

-- 4. PARTNER SERVICE APPLICATIONS (Service-specific eligibility and independent approval)
CREATE TABLE IF NOT EXISTS partner_service_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
    service_type VARCHAR(50) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_service_app_status CHECK (
        status IN ('PENDING', 'UNDER_REVIEW', 'DOCUMENTS_REQUIRED', 'APPROVED', 'REJECTED', 'SUSPENDED')
    ),
    CONSTRAINT chk_service_type CHECK (
        service_type IN (
            'FOOD_DELIVERY',
            'GROCERY_DELIVERY',
            'PARCEL',
            'BIKE_TAXI',
            'AUTO_RICKSHAW',
            'CAB_SEDAN',
            'CAB_HATCHBACK',
            'CAB_SUV',
            'HIRE_DRIVER'
        )
    ),
    CONSTRAINT uq_partner_service UNIQUE (partner_id, service_type)
);

CREATE INDEX IF NOT EXISTS idx_partner_services_status
    ON partner_service_applications (partner_id, status);

-- Partner sensitive field encryption & HMAC for deduplication
ALTER TABLE partners ALTER COLUMN bank_account_number TYPE TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS bank_account_hmac VARCHAR(64);

-- 5. MERCHANT DOCUMENTS (Versioned business KYC: FSSAI, GSTIN, Shop License, PAN)
CREATE TABLE IF NOT EXISTS merchant_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
    document_type VARCHAR(50) NOT NULL,
    document_number VARCHAR(100),
    storage_key VARCHAR(255),
    file_name VARCHAR(255),
    mime_type VARCHAR(100),
    file_size_bytes BIGINT,
    version INTEGER NOT NULL DEFAULT 1,
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    superseded_by UUID REFERENCES merchant_documents(id) ON DELETE SET NULL,
    verification_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_merchant_doc_status CHECK (
        verification_status IN ('PENDING', 'UNDER_REVIEW', 'DOCUMENTS_REQUIRED', 'VERIFIED', 'REJECTED')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_merchant_doc_current
    ON merchant_documents (merchant_id, document_type)
    WHERE is_current = TRUE AND deleted_at IS NULL;

-- 6. EXTEND MERCHANTS LIFECYCLE AND DEDUPLICATION HASHES
ALTER TABLE merchants DROP CONSTRAINT IF EXISTS chk_merchant_status;
ALTER TABLE merchants ADD CONSTRAINT chk_merchant_status CHECK (
    status IN ('REGISTERED', 'SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_REQUIRED', 'APPROVED', 'REJECTED', 'LIVE', 'PAUSED', 'SUSPENDED', 'BLOCKED')
);

ALTER TABLE merchants ADD COLUMN IF NOT EXISTS pan_hmac VARCHAR(64);
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS bank_account_hmac VARCHAR(64);
ALTER TABLE merchants ALTER COLUMN bank_account_number TYPE TEXT;
ALTER TABLE merchants ALTER COLUMN pan_number TYPE TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_merchants_pan_hmac ON merchants (pan_hmac) WHERE pan_hmac IS NOT NULL;

-- 7. MULTI-OUTLET ADMINISTRATIVE LIFECYCLE
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS outlet_status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE outlets DROP CONSTRAINT IF EXISTS chk_outlet_status;
ALTER TABLE outlets ADD CONSTRAINT chk_outlet_status CHECK (
    outlet_status IN ('PENDING_APPROVAL', 'ACTIVE', 'PAUSED', 'SUSPENDED', 'REJECTED', 'BLOCKED')
);

COMMIT;
