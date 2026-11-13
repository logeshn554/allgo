# ALLGO — PHASE 2 DATABASE SCHEMA & MIGRATION SPECIFICATION
## Additive DDL, Constraints, Indexes, Triggers, and Rollback Procedures

**Project:** AllGo — India Super App  
**Workspace:** `E:\allgo`  
**Migration Number:** `003_phase2_kyc_and_onboarding.sql`  
**Rollback Number:** `database/rollbacks/003_phase2_kyc_rollback.sql`  
**Database Engine:** PostgreSQL 16+ with PostGIS 3.4  
**Status:** VALIDATED & COMPLIANT WITH MIGRATION FREEZE RULES  

---

## 1. MIGRATION INVARIANTS & INTEGRITY RULES

1. **Frozen Baseline Preserved:**
   - `database/migrations/001_initial_schema.sql` (Phase 0 Baseline): 0 bytes changed.
   - `database/migrations/002_postgis_indexes.sql` (PostGIS Baseline): 0 bytes changed.
2. **Strict Additive Strategy:** Migration 003 introduces only additive tables, non-destructive column additions, and constraint replacements.
3. **Atomic Execution:** Entire script wrapped in explicit `BEGIN;` and `COMMIT;` blocks ensuring all-or-nothing execution.
4. **Inverse Rollback Mirror:** Standalone rollback file `database/rollbacks/003_phase2_kyc_rollback.sql` safely placed outside `database/migrations/` so automated forward migration runners (`scripts/run-migrations.ts`) do not inadvertently run it.

---

## 2. DETAILED DDL SPECIFICATION

### 2.1 Ephemeral Upload Tickets (`document_upload_tickets`)
Pre-allocates upload slots, establishes upload expiry, tracks binary size limits, and associates storage keys with users.

```sql
CREATE TABLE document_upload_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(64) NOT NULL,
    mime_type VARCHAR(64) NOT NULL,
    max_file_size_bytes BIGINT NOT NULL DEFAULT 5242880, -- 5 MB hard limit
    actual_file_size_bytes BIGINT,
    storage_key VARCHAR(512),
    file_hash_sha256 VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'TICKET_CREATED' 
        CHECK (status IN ('TICKET_CREATED', 'UPLOADED', 'LINKED', 'FAILED', 'EXPIRED')),
    rejection_reason TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_upload_tickets_user_status ON document_upload_tickets(user_id, status);
CREATE INDEX idx_upload_tickets_expires_at ON document_upload_tickets(expires_at) WHERE status = 'TICKET_CREATED';
```

### 2.2 Independent Partner Service Applications (`partner_service_applications`)
Decouples service categories so delivery approval never automatically confers ride-hailing authorization.

```sql
CREATE TABLE partner_service_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES delivery_partners(id) ON DELETE CASCADE,
    service_category VARCHAR(64) NOT NULL CHECK (service_category IN (
        'FOOD_DELIVERY',
        'GROCERY_DELIVERY',
        'PARCEL',
        'BIKE_TAXI',
        'AUTO_RICKSHAW',
        'CAB_SEDAN',
        'CAB_HATCHBACK',
        'CAB_SUV',
        'HIRE_DRIVER'
    )),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING',
        'UNDER_REVIEW',
        'DOCUMENTS_REQUIRED',
        'APPROVED',
        'REJECTED',
        'SUSPENDED'
    )),
    rejection_reason TEXT,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_partner_service UNIQUE (partner_id, service_category)
);

CREATE INDEX idx_partner_service_apps_status ON partner_service_applications(status);
```

### 2.3 Versioned Merchant KYC Documents (`merchant_documents`)
Enforces versioning, regulatory retention, and uniqueness of current valid documents.

```sql
CREATE TABLE merchant_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    document_type VARCHAR(64) NOT NULL CHECK (document_type IN (
        'FSSAI_LICENSE',
        'GSTIN_CERTIFICATE',
        'PAN_CARD',
        'BANK_CHEQUE',
        'SHOP_ESTABLISHMENT_ACT',
        'TRADE_LICENSE',
        'FIRE_SAFETY_NOC'
    )),
    document_number VARCHAR(128) NOT NULL,
    document_url VARCHAR(512) NOT NULL, -- Logical storage key, never absolute filesystem path
    file_hash_sha256 VARCHAR(64),
    mime_type VARCHAR(64) NOT NULL DEFAULT 'application/pdf',
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    version INT NOT NULL DEFAULT 1,
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    superseded_by UUID REFERENCES merchant_documents(id),
    verification_status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN (
        'PENDING',
        'VERIFIED',
        'REJECTED',
        'EXPIRED'
    )),
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    expiry_date DATE,
    deleted_at TIMESTAMPTZ, -- Soft-delete flag for regulatory retention
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial unique index ensuring exactly one active current document per type
CREATE UNIQUE INDEX uq_merchant_current_doc 
ON merchant_documents(merchant_id, document_type) 
WHERE is_current = TRUE AND deleted_at IS NULL;
```

### 2.4 Partner Documents Schema Extensions (`partner_documents`)
Extends existing Phase 0 `partner_documents` table with regulatory audit and versioning attributes:

```sql
ALTER TABLE partner_documents
    ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES partner_documents(id),
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Partial unique index for current partner documents
CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_current_doc
ON partner_documents(partner_id, document_type)
WHERE is_current = TRUE AND deleted_at IS NULL;
```

### 2.5 Merchant Status Lifecycle Expansion
Expands `chk_merchant_status` constraint on `merchants` table to support resubmission and compliance blocks:

```sql
ALTER TABLE merchants DROP CONSTRAINT IF EXISTS chk_merchant_status;
ALTER TABLE merchants ADD CONSTRAINT chk_merchant_status CHECK (status IN (
    'REGISTERED',
    'SUBMITTED',
    'UNDER_REVIEW',
    'DOCUMENTS_REQUIRED',
    'APPROVED',
    'REJECTED',
    'LIVE',
    'PAUSED',
    'SUSPENDED',
    'BLOCKED'
));
```

### 2.6 Merchant Outlets Status Addition (`outlets.outlet_status`)
Adds explicit outlet verification state to support multi-outlet governance:

```sql
ALTER TABLE outlets 
    ADD COLUMN IF NOT EXISTS outlet_status VARCHAR(32) NOT NULL DEFAULT 'PENDING_APPROVAL'
    CHECK (outlet_status IN ('PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'REJECTED'));

CREATE INDEX IF NOT EXISTS idx_outlets_merchant_status ON outlets(merchant_id, outlet_status);
```

### 2.7 Audit Logs Immutability Trigger & Reason Column
Hardens audit logs table against administrative tampering:

```sql
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS reason TEXT;

CREATE OR REPLACE FUNCTION fn_audit_logs_immutable()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs entries are strictly immutable and cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION fn_audit_logs_immutable();
```

---

## 3. ROLLBACK SPECIFICATION & VERIFICATION

The rollback script `database/rollbacks/003_phase2_kyc_rollback.sql` mirrors migration 003 in reverse:
1. Drops `trg_audit_logs_immutable` and `fn_audit_logs_immutable`.
2. Drops `reason` column from `audit_logs`.
3. Drops `outlet_status` column and index from `outlets`.
4. Restores original Phase 0 `chk_merchant_status` constraint.
5. Drops `uq_partner_current_doc` index and versioning columns from `partner_documents`.
6. Drops `merchant_documents` table and cascade constraints.
7. Drops `partner_service_applications` table.
8. Drops `document_upload_tickets` table.
9. All statements are wrapped in an atomic `BEGIN; ... COMMIT;` block.
