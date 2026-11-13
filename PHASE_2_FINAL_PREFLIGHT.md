# ALLGO — PHASE 2 FINAL ENGINEERING PREFLIGHT

**Project:** AllGo — India Super App  
**Workspace:** `E:\allgo`  
**Branch:** `master`  
**Baseline commit:** `5fe64927af3c97a37ae7b3da973761ec2ac54f91` (Phase 1 accepted)  
**Document status:** `PHASE 2 PREFLIGHT — READY FOR OWNER AUTHORIZATION`  
**Prepared:** 2026-11-10  
**Author:** Antigravity Engineering Agent (pre-implementation planning — no source code modified)

---

> [!IMPORTANT]
> This document is a **pre-implementation architecture and risk review only**.  
> No source code, migrations, or database schema files have been modified.  
> All section findings are based on static inspection of `database/migrations/001_initial_schema.sql`, `002_postgis_indexes.sql`, and existing Phase 2 uncommitted files.  
> Runtime schema verification via `docker exec` was **not completed** in this session (Docker daemon unavailable). Schema findings accurately reflect the frozen SQL files but are flagged as not runtime-verified.

---

## Table of Contents

- [A. Secure Filesystem Storage](#a-secure-filesystem-storage)
- [B. Database Integrity](#b-database-integrity)
- [C. Audit Security](#c-audit-security)
- [D. Retention and Deletion](#d-retention-and-deletion)
- [E. Encryption Design](#e-encryption-design)
- [F. Compliance and Regulatory Rules](#f-compliance-and-regulatory-rules)
- [G. Document Upload and Outlet Lifecycles](#g-document-upload-and-outlet-lifecycles)
- [H. Workstream Ownership and Implementation Sequence](#h-workstream-ownership-and-implementation-sequence)
- [I. Test and Acceptance Criteria](#i-test-and-acceptance-criteria)
- [J. Legal and Compliance Assumptions Requiring Review](#j-legal-and-compliance-assumptions-requiring-review)

---

## A. Secure Filesystem Storage

### A.1 Path Containment and Traversal Prevention

All file storage operations MUST use canonical path containment validation before writing, reading, or deleting any file.

**Required implementation pattern (TypeScript/NestJS):**
```typescript
import * as path from 'path';
import * as fs from 'fs';

const STORAGE_ROOT = path.resolve(process.env.DOCUMENT_STORAGE_ROOT!);

function assertWithinStorageRoot(absolutePath: string): void {
  const relative = path.relative(STORAGE_ROOT, absolutePath);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new ForbiddenException('Path traversal attempt detected');
  }
}
```

**Additional requirements:**
- Storage keys are **UUID-based**, server-generated. The client NEVER provides a storage path.
- Storage keys are stored in the PostgreSQL `document_upload_tickets.storage_key` column, not as absolute filesystem paths.
- The absolute filesystem path is reconstructed at runtime as `path.join(STORAGE_ROOT, storageKey)`.
- File extensions are determined from validated MIME type, not from client-supplied filenames.

### A.2 Symlink Protection

Before writing or reading any file, the implementation MUST check whether the resolved path is a symbolic link:

```typescript
async function assertNotSymlink(absolutePath: string): Promise<void> {
  try {
    const stat = await fs.promises.lstat(absolutePath);
    if (stat.isSymbolicLink()) {
      throw new ForbiddenException('Symlink detected at storage path');
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    // File does not yet exist — safe to create
  }
}
```

This check MUST be performed after path containment validation and BEFORE any `fs.createWriteStream` or `fs.writeFile` call.

### A.3 Streaming Upload with Enforced Size Limits

Uploads MUST use streaming (not full buffering) with size enforcement **during stream processing**, not after:

- Library: `@fastify/multipart` (if Fastify) or `busboy` (if Express/NestJS HTTP adapter).
- `limits.fileSize` MUST be set to enforce the byte limit during the stream. Exceeding the limit raises an error mid-stream and prevents the full payload from reaching the server.
- Recommended limit: 10 MB per document file, 2 MB per selfie/photograph.
- Maximum files per request: 1 (documents are uploaded one at a time, not batch).

**Streaming pipeline:**
```
Client upload → busboy stream → size enforcer → content validator → temp file → DB ticket → storage key response
```
The file is written to a unique temp path first, validated, then moved atomically to its final storage key path.

### A.4 File Content Validation

MIME type validation based solely on client-supplied `Content-Type` headers is **insufficient and must not be used**.

**Required validation sequence:**
1. **Magic byte check:** Read the first 8–16 bytes of the file stream and confirm the file signature matches the declared MIME type (JPEG: `FF D8 FF`, PNG: `89 50 4E 47`, PDF: `25 50 44 46`).
2. **Structural validation:**
   - **PDF:** Parse with `pdf-parse` or `pdfjs-dist` — confirm the file is a valid parseable PDF, not just a file with a `.pdf` extension.
   - **JPEG/PNG:** Parse with `sharp` — confirm the image can be decoded. `sharp(buffer).metadata()` will throw on corrupt or fake image files.
3. **Extension allowlist:** Only accept `jpg`, `jpeg`, `png`, `pdf`. Reject all other extensions.
4. **Reject empty files:** `fileSize === 0` → reject immediately.

### A.5 Malware Scanning

**Local development:** ClamAV is available as a Docker container (`mkodockx/docker-clamav`). The NestJS storage service SHOULD call `clamdscan` via TCP (default port 3310) after file write, before marking the ticket as linkable.

**Production:** ClamAV provides a reasonable baseline but is **not guaranteed** to detect all threats. Production deployment should:
- Integrate Google Cloud Storage bucket-level malware scanning (available via Security Command Center and GCS built-in scanning for uploads).
- Or integrate VirusTotal API (asynchronous) for a secondary scan on high-risk document types.
- Acknowledge in deployment documentation that no local malware scanner provides absolute protection.

**Fail-safe policy:** If the malware scanner is unavailable at startup, the application should:
- Log a warning.
- Continue operation with scanning disabled (not block startup), because ClamAV unavailability is an operational concern, not a security hole in development environments.
- In production, scanner unavailability should trigger an alert and optionally block new uploads until resolved (operator configurable).

### A.6 Orphan Upload Cleanup

The `document_upload_tickets` table tracks upload lifecycle. Cleanup rules:

| Ticket status | Cleanup action |
|---|---|
| `PENDING_LINK` and `expires_at < NOW()` | Safe to delete file and ticket row |
| `LINKED` | **NEVER** delete — linked to a KYC document |
| `ORPHANED` (manually marked) | Delete file and ticket row |

**Implementation:**
- A scheduled NestJS `@Cron` job runs every 15 minutes.
- Selects tickets where `status = 'PENDING_LINK'` AND `expires_at < NOW()`.
- Deletes the file at `path.join(STORAGE_ROOT, storage_key)` using the same path containment validation.
- Marks ticket as `ORPHANED` in a transaction BEFORE deleting the file.
- If file deletion fails: log error, leave ticket as `ORPHANED`, do not retry in same run.

### A.7 Platform Filesystem Permissions

- Storage root directory: mode `0700` (owner read/write/execute only) on Linux/macOS.
- Uploaded files: mode `0600` (owner read/write only) — not world-readable.
- On Windows (development): equivalent NTFS ACL restriction to the service account.
- Files are NEVER served from a public static directory. All document access goes through an authenticated streaming endpoint that checks ownership before streaming.

---

## B. Database Integrity

### B.1 Frozen Schema Compatibility — Exact Findings

> [!WARNING]
> The following findings are based on static inspection of `database/migrations/001_initial_schema.sql` (897 lines) and `002_postgis_indexes.sql` (181 lines). These files are **permanently frozen** (Phase 0). Migration 003 is the ONLY authorized schema modification file for Phase 2.

#### `partner_documents` table (frozen — `001_initial_schema.sql:296–307`)

| Column | Type | Frozen constraint | Phase 2 action |
|---|---|---|---|
| `id` | UUID | PK | None |
| `partner_id` | UUID FK → `partners` | `ON DELETE CASCADE` | **RISK** — see §B.5 |
| `document_type` | VARCHAR(50) | — | None |
| `document_number` | VARCHAR(100) | — | None |
| `file_url` | TEXT NOT NULL | — | **Keep for backward compat. New uploads use `storage_key` added in 003** |
| `verification_status` | VARCHAR | CHECK(`PENDING`, `VERIFIED`, `REJECTED`) | Extend via 003 |
| `rejection_reason` | TEXT | — | None |
| `verified_at` | TIMESTAMPTZ | — | None |
| `created_at` | TIMESTAMPTZ | — | None |

**Migration 003 additions to `partner_documents`:**
```sql
ALTER TABLE partner_documents ADD COLUMN IF NOT EXISTS storage_key VARCHAR(255);
ALTER TABLE partner_documents ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
ALTER TABLE partner_documents ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);
ALTER TABLE partner_documents ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;
ALTER TABLE partner_documents ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE partner_documents ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE partner_documents ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES partner_documents(id) ON DELETE SET NULL;
ALTER TABLE partner_documents ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE partner_documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
```

**Critical note:** The existing `file_url TEXT NOT NULL` column is **not renamed or dropped**. New uploads populate `storage_key`; existing rows retain `file_url`. The application layer differentiates by checking `storage_key IS NOT NULL`.

#### `partners` table — status constraint

The frozen `chk_partner_status` CHECK constraint allows:
```
'REGISTERED', 'DOCS_SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ACTIVE', 'SUSPENDED', 'BLOCKED'
```

**Phase 2 partner backend MUST use `DOCS_SUBMITTED` (not `SUBMITTED`)** when transitioning a partner to document-submitted state. Any Phase 2 code using `SUBMITTED` for partners is a schema mismatch bug.

The Phase 2 plan's partner state machine must map:
- Plan state `SUBMITTED` → DB value `DOCS_SUBMITTED`
- All other states: direct mapping (names match).

**Migration 003 DOES NOT modify `chk_partner_status`** — no additional states are needed for Phase 2 partner workflow within the existing constraint.

#### `merchants` table — status constraint

The frozen `chk_merchant_status` CHECK constraint allows:
```
'REGISTERED', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'LIVE', 'PAUSED', 'SUSPENDED'
```

**Missing states for Phase 2:**
- `DOCUMENTS_REQUIRED` — planned for Phase 2 flow
- `BLOCKED` — mentioned in Phase 2 architecture

> [!WARNING]
> **Adding `DOCUMENTS_REQUIRED` and `BLOCKED` to `merchants.status` requires dropping and re-creating the CHECK constraint on a frozen table.** This is an ALTER TABLE on a Phase 0 table's constraint (not its data or column structure). Migration 003 must handle this:
> ```sql
> ALTER TABLE merchants DROP CONSTRAINT chk_merchant_status;
> ALTER TABLE merchants ADD CONSTRAINT chk_merchant_status CHECK (
>   status IN ('REGISTERED','SUBMITTED','UNDER_REVIEW','DOCUMENTS_REQUIRED','APPROVED','REJECTED','LIVE','PAUSED','SUSPENDED','BLOCKED')
> );
> ```
> **This requires explicit owner sign-off** before migration 003 is finalized, as it modifies a Phase 0 constraint. The data columns themselves are unchanged.

#### `audit_logs` table — missing column

The frozen `audit_logs` table lacks a `reason` column. Migration 003 adds:
```sql
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS reason TEXT;
```

#### `outlets` table — no status column

The frozen `outlets` table has no administrative status column; only `is_open BOOLEAN` for operational toggling. Migration 003 adds:
```sql
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS outlet_status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE outlets ADD CONSTRAINT chk_outlet_status CHECK (
  outlet_status IN ('PENDING_APPROVAL','ACTIVE','PAUSED','SUSPENDED','BLOCKED')
);
```
The existing `is_open` column is preserved for real-time operational toggling by the merchant.

### B.2 New Tables in Migration 003

**`document_upload_tickets`** (new):
```sql
CREATE TABLE document_upload_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  storage_key VARCHAR(255) NOT NULL UNIQUE,
  mime_type VARCHAR(100) NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING_LINK',
  linked_entity_type VARCHAR(50),
  linked_entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 hour',
  CONSTRAINT chk_ticket_status CHECK (status IN ('PENDING_LINK','LINKED','ORPHANED'))
);
CREATE INDEX idx_upload_tickets_cleanup ON document_upload_tickets (status, expires_at)
  WHERE status = 'PENDING_LINK';
```

**`merchant_documents`** (new):
```sql
CREATE TABLE merchant_documents (
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
    verification_status IN ('PENDING','UNDER_REVIEW','VERIFIED','REJECTED')
  )
);
```

**`partner_service_applications`** (new):
```sql
CREATE TABLE partner_service_applications (
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
    status IN ('PENDING','UNDER_REVIEW','DOCUMENTS_REQUIRED','APPROVED','REJECTED','SUSPENDED')
  ),
  CONSTRAINT uq_partner_service UNIQUE (partner_id, service_type)
);
```

### B.3 Unique Current-Document Constraint

To ensure only one current document per type per entity:

**For partners:**
```sql
CREATE UNIQUE INDEX idx_partner_doc_current
  ON partner_documents (partner_id, document_type)
  WHERE is_current = TRUE AND deleted_at IS NULL;
```

**For merchants:**
```sql
CREATE UNIQUE INDEX idx_merchant_doc_current
  ON merchant_documents (merchant_id, document_type)
  WHERE is_current = TRUE AND deleted_at IS NULL;
```

When a new document version is uploaded:
1. BEGIN transaction.
2. UPDATE old current document: `SET is_current = FALSE, superseded_by = <new_id>`.
3. INSERT new document with `is_current = TRUE`.
4. COMMIT.

This prevents the unique index from firing during the transition because both rows are modified in the same transaction.

### B.4 Cascading Deletion Risk

The frozen schema defines:
```sql
partner_documents.partner_id REFERENCES partners(id) ON DELETE CASCADE
```

This means deleting a partner row **physically deletes all their KYC documents** — a serious retention compliance risk.

**Phase 2 mitigation (applied in Migration 003 via soft-delete):**
```sql
ALTER TABLE partner_documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
```

The application layer uses a soft-delete pattern: `UPDATE partner_documents SET deleted_at = NOW()` instead of DELETE. Partner deletion at the application layer is also restricted — the partner row is `SUSPENDED` or `BLOCKED`, not physically deleted, unless legally required.

> [!NOTE]
> The `ON DELETE CASCADE` FK in the frozen schema cannot be changed without `ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT` — which would need to be in Migration 003 as a constraint replacement. This is flagged for owner decision: **should Migration 003 change `ON DELETE CASCADE` to `ON DELETE RESTRICT` for `partner_documents`?** Recommended: YES, change to RESTRICT to prevent accidental cascade deletion.

### B.5 Migration Rollback Procedure

Migration 003 rollback script (store as `database/migrations/003_phase2_kyc_rollback.sql`):

```sql
BEGIN;

-- Remove new tables (order respects FK dependencies)
DROP TABLE IF EXISTS partner_service_applications;
DROP TABLE IF EXISTS merchant_documents;
DROP TABLE IF EXISTS document_upload_tickets;

-- Remove new columns from partner_documents
ALTER TABLE partner_documents DROP COLUMN IF EXISTS storage_key;
ALTER TABLE partner_documents DROP COLUMN IF EXISTS file_name;
ALTER TABLE partner_documents DROP COLUMN IF EXISTS mime_type;
ALTER TABLE partner_documents DROP COLUMN IF EXISTS file_size_bytes;
ALTER TABLE partner_documents DROP COLUMN IF EXISTS version;
ALTER TABLE partner_documents DROP COLUMN IF EXISTS is_current;
ALTER TABLE partner_documents DROP COLUMN IF EXISTS superseded_by;
ALTER TABLE partner_documents DROP COLUMN IF EXISTS reviewed_by;
ALTER TABLE partner_documents DROP COLUMN IF EXISTS deleted_at;

-- Remove new columns from outlets
ALTER TABLE outlets DROP CONSTRAINT IF EXISTS chk_outlet_status;
ALTER TABLE outlets DROP COLUMN IF EXISTS outlet_status;

-- Remove new column from audit_logs
ALTER TABLE audit_logs DROP COLUMN IF EXISTS reason;

-- Revert merchants status constraint
ALTER TABLE merchants DROP CONSTRAINT IF EXISTS chk_merchant_status;
ALTER TABLE merchants ADD CONSTRAINT chk_merchant_status CHECK (
  status IN ('REGISTERED','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','LIVE','PAUSED','SUSPENDED')
);

-- Remove unique indexes
DROP INDEX IF EXISTS idx_partner_doc_current;
DROP INDEX IF EXISTS idx_merchant_doc_current;

COMMIT;
```

> [!CAUTION]
> This rollback script is **destructive** — it drops new tables and removes columns. It should ONLY be run after confirming no production data has been written to these new tables. Run in a transaction and verify before committing.

---

## C. Audit Security

### C.1 Append-Only Trigger for `audit_logs`

The frozen schema already has immutability triggers on `order_events` and `ledger_entries`. Migration 003 adds the same protection to `audit_logs`:

```sql
CREATE OR REPLACE FUNCTION fn_prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs rows are immutable. UPDATE and DELETE are not permitted. (trigger: trg_prevent_audit_log_mutation)';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_audit_log_mutation
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION fn_prevent_audit_log_mutation();
```

### C.2 Database Role Restriction

A restricted PostgreSQL role `allgo_app` must lack `UPDATE` and `DELETE` privileges on `audit_logs`:

```sql
-- Run as superuser / DBA (outside migrations, documented as a DBA step)
REVOKE UPDATE, DELETE ON TABLE audit_logs FROM allgo_app;
GRANT SELECT, INSERT ON TABLE audit_logs TO allgo_app;
```

This is a **DBA step outside the migration file** because:
- Role creation and privilege assignment require superuser access.
- It must be documented in `docs/database/role-setup.md` and in the deployment runbook.
- If the role does not exist, the trigger is the only defense — both layers are required.

### C.3 Transactional Audit Consistency

Every domain state change that generates an audit event MUST commit the domain entity update and the audit INSERT in the same database transaction:

```typescript
await this.dataSource.transaction(async (manager) => {
  await manager.update(Partner, { id: partnerId }, { status: newStatus });
  await manager.insert(AuditLog, {
    actorId: adminUserId,
    action: 'PARTNER_STATUS_CHANGED',
    entityType: 'partner',
    entityId: partnerId,
    oldState: { status: oldStatus },
    newState: { status: newStatus },
    reason: reason,
    ipAddress: requestIp,
    userAgent: userAgent,
  });
});
```

If either operation fails, both roll back. Partial auditing (domain change without audit log, or audit log without domain change) is a defect.

### C.4 Audit Tamper Test

The integration test suite MUST include a test that verifies the trigger blocks mutation:

```typescript
it('should reject UPDATE on audit_logs', async () => {
  const log = await insertTestAuditLog();
  await expect(
    dataSource.query(`UPDATE audit_logs SET action = 'TAMPERED' WHERE id = $1`, [log.id])
  ).rejects.toThrow(/immutable/);
});

it('should reject DELETE on audit_logs', async () => {
  const log = await insertTestAuditLog();
  await expect(
    dataSource.query(`DELETE FROM audit_logs WHERE id = $1`, [log.id])
  ).rejects.toThrow(/immutable/);
});
```

These tests MUST run against a real PostgreSQL instance (not SQLite or mock), because the trigger is a database-level feature.

---

## D. Retention and Deletion

### D.1 Retention Schedule by Document Category

> [!IMPORTANT]
> The following retention periods are **engineering defaults derived from commonly cited Indian regulatory sources**. All periods require review by a qualified Indian legal professional before production deployment. AllGo does not have an in-house legal team identified in Phase 1.

| Document category | Retention period (after account closure) | Cited regulatory basis | Legal review required |
|---|---|---|---|
| Driving License copy | 3 years | Motor Vehicles Act 1988 (commercial record-keeping guidance) | ✅ Yes |
| Vehicle Registration Certificate | 3 years | Motor Vehicles Act 1988 | ✅ Yes |
| Police Verification / Background Check | 3 years | Standard employment record-keeping | ✅ Yes |
| FSSAI License | 5 years | FSSAI Act 2006, record-keeping obligations | ✅ Yes |
| PAN Card copy | 7 years | Income Tax Act 1961 s.44AA | ✅ Yes |
| Bank account details | 5 years | RBI Payment Aggregator and Payment Gateway Guidelines 2020 | ✅ Yes |
| UPI handle | 5 years | Same as above | ✅ Yes |
| Profile photograph / selfie | 1 year after closure | DPDP Act 2023 data minimization principle | ✅ Yes |
| GST registration | 7 years | CGST Act 2017 | ✅ Yes |

**Configuration mechanism:**
- Retention periods are stored in a server-side configuration file (not hardcoded): `config/retention-policy.json`.
- The admin panel exposes a read-only view of the current retention policy.
- Modifying retention periods requires a code review and re-deployment — they are not runtime-editable by admins.

### D.2 Secure Erasure Limitations

> [!WARNING]
> **Do NOT claim byte-overwriting guarantees for files stored on SSDs, cloud block storage, or database WAL logs.**

The following caveats MUST be documented in the deployment runbook:

1. **SSD wear-leveling:** Overwriting a file on an SSD does not guarantee the original blocks are overwritten. The SSD controller may write new data to different physical cells.
2. **Copy-on-write filesystems:** btrfs, ZFS, and APFS may retain the original data blocks after a file overwrite.
3. **PostgreSQL WAL:** Even after a row is deleted, its data may remain in WAL segments until they are recycled (default: days to weeks).
4. **OS page cache:** Deleted file data may remain in memory until the kernel reclaims it.
5. **Backup systems:** Any backup taken before deletion retains the data.

**Production deletion guarantee (recommended):**  
Use Google Cloud Storage (GCS) for document storage in production. GCS object deletion + bucket lifecycle policy provides stronger guarantees than local overwrite because:
- GCS infrastructure manages physical storage and prevents residual data exposure.
- GCS supports customer-managed encryption keys (CMEK) via Cloud KMS.
- Deletion is logged in Cloud Audit Logs.

**Local development:** File deletion is best-effort. This is acceptable for development environments but MUST NOT be claimed as "secure erasure" in any user-facing documentation.

### D.3 Deletion Workflow

Retention-based deletion is a **manual or supervised process**, not an automatic cron job:

1. A retention audit job identifies records eligible for deletion (account closed AND retention period elapsed).
2. It generates a deletion report for admin review.
3. An authorized admin reviews and approves the deletion batch.
4. The deletion job executes after approval, logging each deletion to `audit_logs` BEFORE the file is removed.
5. Soft-deleted rows in `partner_documents` and `merchant_documents` have `deleted_at` set.
6. Physical file deletion occurs after the soft-delete and audit log commit.

---

## E. Encryption Design

### E.1 Algorithm Specification

| Parameter | Value |
|---|---|
| Algorithm | AES-256-GCM |
| Key size | 256 bits (32 bytes) |
| Nonce | 96 bits (12 bytes), cryptographically random per encryption (`crypto.randomBytes(12)`) |
| Auth tag | 128 bits (16 bytes) |
| Storage format | `v1:<base64(nonce \|\| ciphertext \|\| authTag)>` |
| Key storage | `FIELD_ENCRYPTION_KEY` env var (base64-encoded 32 bytes). Never in source control. Production: Google Secret Manager. |

### E.2 Key Version Prefix

The storage format includes a version prefix (`v1:`) to support key rotation without breaking existing encrypted values:

- When decrypting: strip the `v1:` prefix, decode base64, extract first 12 bytes as nonce, last 16 bytes as auth tag, middle bytes as ciphertext.
- When a new key version is introduced (`v2:`): on the next write for that record, re-encrypt with the new key and update the stored value.
- Dual-read: the decryption service checks the prefix and uses the corresponding key version. Old values remain readable until they are updated.

### E.3 Fail Closed on Missing Key

If `FIELD_ENCRYPTION_KEY` is absent or malformed (not valid 32-byte base64) at startup, the NestJS `EncryptionModule` MUST throw during module initialization:

```typescript
@Module({})
export class EncryptionModule implements OnModuleInit {
  onModuleInit() {
    const key = process.env.FIELD_ENCRYPTION_KEY;
    if (!key) throw new Error('FIELD_ENCRYPTION_KEY is not set. Service cannot start.');
    const decoded = Buffer.from(key, 'base64');
    if (decoded.length !== 32) throw new Error('FIELD_ENCRYPTION_KEY must be 32 bytes (256 bits).');
  }
}
```

This prevents the service from starting in production with a missing or weak key.

### E.4 UNIQUE Constraint Problem and HMAC Solution

**Problem:** AES-256-GCM uses a random nonce per encryption. The same plaintext PAN encrypted twice produces different ciphertexts. A database UNIQUE constraint on the ciphertext column cannot detect duplicate PANs.

**Solution:** Use a separate HMAC-keyed deduplication column:

```sql
-- Added by Migration 003
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS pan_hmac VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS idx_merchants_pan_hmac ON merchants (pan_hmac) WHERE pan_hmac IS NOT NULL;

ALTER TABLE merchants ADD COLUMN IF NOT EXISTS bank_account_hmac VARCHAR(64);
```

**HMAC computation:**
```typescript
import { createHmac } from 'crypto';

function computeFieldHmac(value: string): string {
  return createHmac('sha256', process.env.FIELD_HMAC_KEY!)
    .update(value.toLowerCase().trim())  // Normalize before HMAC
    .digest('hex');
}
```

- `FIELD_HMAC_KEY`: separate 32-byte secret from `FIELD_ENCRYPTION_KEY`. Stored in env / Secret Manager.
- The HMAC is deterministic and indexable.
- The HMAC does not reveal the plaintext (HMAC-SHA256 with a secret key is not reversible without the key).
- Duplicate detection: `SELECT id FROM merchants WHERE pan_hmac = $1` before INSERT.

> [!IMPORTANT]
> `FIELD_HMAC_KEY` MUST be distinct from `FIELD_ENCRYPTION_KEY`. Using the same key for both purposes is a cryptographic anti-pattern.

### E.5 Fields to Encrypt at Application Layer

| Table | Column | Encrypt? | HMAC for dedup? |
|---|---|---|---|
| `merchants` | `pan_number` | ✅ Yes | ✅ Yes |
| `merchants` | `bank_account_number` | ✅ Yes | ✅ Yes |
| `merchants` | `bank_ifsc` | No (not sensitive identifier) | No |
| `merchants` | `bank_beneficiary_name` | No (not sensitive identifier) | No |
| `partners` | `bank_account_number` | ✅ Yes | ✅ Yes |
| `partners` | `bank_ifsc` | No | No |
| `partners` | `bank_beneficiary_name` | No | No |

The frozen schema stores these in VARCHAR plaintext columns. Application-layer encryption stores the ciphertext string in the same VARCHAR columns. The `pan_hmac` and `bank_account_hmac` columns are added by Migration 003.

### E.6 Data Minimization for Aadhaar

> [!CAUTION]
> Collecting and storing Aadhaar numbers requires explicit legal authorization under the Aadhaar (Targeted Delivery of Financial and Other Subsidies, Benefits and Services) Act 2016. Unauthorized collection of Aadhaar numbers can result in criminal liability.

**Phase 2 policy:**
- **Do NOT collect full Aadhaar numbers** without a verified legal requirement and UIDAI authorization.
- If Aadhaar-based verification is required, integrate with a **licensed UIDAI Authentication Service Agency (ASA)** or use **DigiLocker** for document verification without storing the number.
- The current Phase 2 merchant registration flow MUST NOT include an Aadhaar number field unless this authorization is confirmed.
- If stored at all: collect only the **masked Aadhaar** (last 4 digits visible), never the full 12-digit number.

**Admin interface masking:**
- PAN: display as `ABCDE1234F` → `ABCDE****F` in admin UI.
- Bank account: display last 4 digits only.
- All masking is applied at the API response layer, not the database layer.

---

## F. Compliance and Regulatory Rules

### F.1 Service Eligibility Configuration

Partner service eligibility rules MUST be configurable via a server-side configuration file:

**`config/partner-service-eligibility.json`:**
```json
{
  "FOOD_DELIVERY": {
    "requiredDocuments": ["DRIVING_LICENSE", "VEHICLE_RC", "PAN", "BANK_ACCOUNT", "PROFILE_PHOTO"],
    "allowedVehicleTypes": ["BICYCLE", "MOTORCYCLE", "SCOOTER"],
    "backgroundCheckRequired": true,
    "minimumAge": 18,
    "legalNote": "No specific transport permit required for bicycle/scooter food delivery in most Indian states."
  },
  "GROCERY_DELIVERY": {
    "requiredDocuments": ["DRIVING_LICENSE", "VEHICLE_RC", "PAN", "BANK_ACCOUNT", "PROFILE_PHOTO"],
    "allowedVehicleTypes": ["BICYCLE", "MOTORCYCLE", "SCOOTER", "AUTO_RICKSHAW"],
    "backgroundCheckRequired": true,
    "minimumAge": 18,
    "legalNote": "Auto-rickshaw use for delivery may require goods carrier permit. Flag for legal review."
  },
  "RIDE_HAILING_CAB": {
    "requiredDocuments": ["DRIVING_LICENSE", "VEHICLE_RC", "COMMERCIAL_PERMIT", "PAN", "BANK_ACCOUNT", "PROFILE_PHOTO"],
    "allowedVehicleTypes": ["CAB_SEDAN", "CAB_HATCHBACK", "CAB_SUV"],
    "backgroundCheckRequired": true,
    "minimumAge": 21,
    "legalNote": "Requires LMV-TR endorsement on license (CMV Rules 1989). Commercial passenger permit required. State-level aggregator license may apply."
  },
  "RIDE_HAILING_AUTO": {
    "requiredDocuments": ["DRIVING_LICENSE", "VEHICLE_RC", "COMMERCIAL_PERMIT", "PAN", "BANK_ACCOUNT", "PROFILE_PHOTO"],
    "allowedVehicleTypes": ["AUTO_RICKSHAW"],
    "backgroundCheckRequired": true,
    "minimumAge": 21,
    "legalNote": "Auto permit requirements vary by state RTO. Flag for legal review in each operating city."
  },
  "BIKE_TAXI": {
    "requiredDocuments": ["DRIVING_LICENSE", "VEHICLE_RC", "PAN", "BANK_ACCOUNT", "PROFILE_PHOTO"],
    "allowedVehicleTypes": ["MOTORCYCLE", "SCOOTER"],
    "backgroundCheckRequired": true,
    "minimumAge": 18,
    "legalNote": "LEGAL STATUS VARIES BY STATE. Permitted: Goa, Karnataka, some NE states. BANNED: Delhi, Tamil Nadu, Assam (as of 2026). Do NOT activate bike taxi in a state without legal clearance.",
    "requiresLegalClearanceByCity": true
  }
}
```

**Separation of concerns:**
- **Platform business rules** (minimum documents, background check): modifiable by admin configuration reload.
- **Legally verified requirements** (minimum age, state-specific bans): require legal sign-off and code review to change.

### F.2 Activation Restriction

**No partner service and no merchant account may be automatically activated after document upload.**

Activation sequence:
1. Partner/merchant submits documents → status transitions to `DOCS_SUBMITTED` / `SUBMITTED`.
2. Admin reviews documents → status transitions to `UNDER_REVIEW`.
3. Admin explicitly approves → status transitions to `APPROVED` / `LIVE`.
4. The application backend enforces this sequence via state machine — no API call can skip from `SUBMITTED` directly to `LIVE` / `APPROVED`.

### F.3 State Machine Enforcement

All status transitions MUST be enforced server-side with an explicit allowlist:

```typescript
const MERCHANT_TRANSITIONS: Record<MerchantStatus, MerchantStatus[]> = {
  REGISTERED:          ['SUBMITTED'],
  SUBMITTED:           ['UNDER_REVIEW'],
  UNDER_REVIEW:        ['DOCUMENTS_REQUIRED', 'APPROVED', 'REJECTED'],
  DOCUMENTS_REQUIRED:  ['SUBMITTED'],  // Resubmission
  APPROVED:            ['LIVE', 'REJECTED'],
  REJECTED:            ['SUBMITTED'],  // Appeals / resubmission
  LIVE:                ['PAUSED', 'SUSPENDED', 'BLOCKED'],
  PAUSED:              ['LIVE', 'SUSPENDED', 'BLOCKED'],
  SUSPENDED:           ['LIVE', 'BLOCKED'],
  BLOCKED:             [],  // Terminal — only reversible by super-admin API
};
```

Any attempt to set a status not in the allowed next-states list MUST be rejected with HTTP 422.

---

## G. Document Upload and Outlet Lifecycles

### G.1 Upload Ticket Lifecycle

```
                    ┌─────────────────────────────────────────────┐
                    │                                             │
 Client requests    │  POST /v1/documents/upload-ticket           │
 upload ticket      │  → Creates ticket (PENDING_LINK)            │
                    │  → Returns { ticketId, uploadUrl (signed) } │
                    └────────────────┬────────────────────────────┘
                                     │
                    ┌────────────────▼────────────────────────────┐
                    │  Client uploads file to uploadUrl           │
                    │  → Storage service validates content        │
                    │  → Ticket status: PENDING_LINK              │
                    └────────────────┬────────────────────────────┘
                                     │
                    ┌────────────────▼────────────────────────────┐
                    │  Client links ticket to KYC document        │
                    │  PATCH /v1/partners/me/documents            │
                    │  → { ticketId, documentType }               │
                    │  → Ticket status: LINKED                    │
                    │  → partner_documents row created            │
                    └────────────────┬────────────────────────────┘
                                     │
                           ┌─────────┴──────────┐
                           │                    │
              ┌────────────▼─────────┐  ┌───────▼────────────────────┐
              │ Linked successfully  │  │ expires_at elapsed          │
              │ Ticket: LINKED       │  │ without linking             │
              │ NEVER deleted        │  │ → Cron marks ORPHANED       │
              └──────────────────────┘  │ → File deleted              │
                                        │ → Ticket: ORPHANED          │
                                        └────────────────────────────┘
```

**Ticket expiry:** 1 hour from creation. Configurable via `UPLOAD_TICKET_TTL_SECONDS` env var.

**Linking validation:**
- The `ticketId` must belong to `uploader_user_id = current authenticated user`.
- The `documentType` must be in the allowlist for the entity type.
- The ticket must be in `PENDING_LINK` status.
- If a current document of the same type already exists: supersede it (see §B.3).

### G.2 Document Resubmission Flow

When an admin requests additional documents or rejects with feedback:

1. Admin sets merchant status to `DOCUMENTS_REQUIRED` with `rejection_reason`.
2. Merchant receives notification (push + in-app).
3. Merchant uploads new document via upload ticket flow.
4. Merchant links new ticket → old document superseded, new document created with `is_current = TRUE`.
5. Merchant submits again → status transitions back to `SUBMITTED`.
6. Admin reviews again.

### G.3 Outlet Administrative Lifecycle

Outlets in the frozen schema have only `is_open BOOLEAN` for operational state. Phase 2 adds `outlet_status VARCHAR(32)` for administrative control.

| `outlet_status` | `is_open` | Meaning |
|---|---|---|
| `PENDING_APPROVAL` | FALSE (forced) | New outlet awaiting admin review |
| `ACTIVE` | TRUE or FALSE | Normal operation; merchant controls `is_open` |
| `ACTIVE` | FALSE | Temporarily closed by merchant |
| `PAUSED` | FALSE (forced) | Temporarily paused by admin (e.g., compliance review) |
| `SUSPENDED` | FALSE (forced) | Suspended by admin for policy violation |
| `BLOCKED` | FALSE (forced) | Permanently blocked; requires super-admin to unblock |

**Business rule:** When `outlet_status != 'ACTIVE'`, the `is_open` value is ignored by the customer-facing ordering API. The outlet is treated as closed regardless of `is_open`.

**Outlet creation:** New outlets created by merchants start in `PENDING_APPROVAL`. The admin panel shows a queue of pending outlet approvals. Outlet is not visible to customers until `ACTIVE`.

---

## H. Workstream Ownership and Implementation Sequence

### H.1 Workstream Summary

| # | Workstream | Owner | Depends on |
|---|---|---|---|
| WS1 | Migration 003 — Schema additions | Backend Lead | — |
| WS2 | Storage service (upload tickets, file validation) | Backend Lead | WS1 |
| WS3 | Partner onboarding and KYC backend | Backend Lead | WS1, WS2 |
| WS4 | Merchant onboarding and KYC backend (extend existing) | Backend Lead | WS1, WS2 |
| WS5 | Admin panel — KYC review queues and approval UI | Frontend Lead | WS3, WS4 |
| WS6 | Flutter mobile — partner registration and document upload | Mobile Lead | WS3 |
| WS7 | Flutter mobile — merchant registration and document upload | Mobile Lead | WS4 |
| WS8 | Integration tests, audit tests, security tests | QA Lead | WS1–WS7 |

### H.2 Exact Implementation Sequence

**Phase A — Foundation (no parallelism until complete):**
1. Write and apply `database/migrations/003_phase2_kyc_and_onboarding.sql` (WS1).
2. Write and apply `003_phase2_kyc_rollback.sql` as companion (WS1).
3. Implement `apps/api/src/storage/` module: upload ticket creation, streaming file write, content validation, orphan cleanup cron (WS2).
4. Write unit + integration tests for storage service (WS2).

**Phase B — Backend services (parallelizable after Phase A):**
5. Implement `apps/api/src/partner/` module: registration, document submission, service application, status state machine (WS3).
6. Extend `apps/api/src/merchant/` module: document submission, status state machine, `DOCUMENTS_REQUIRED` and `BLOCKED` states (WS4).
7. Implement encryption service with HMAC deduplication (WS3/WS4 shared).
8. Implement audit service: transactional audit log insertion for all KYC state changes (WS3/WS4 shared).

**Phase C — Admin frontend (after Phase B):**
9. Extend `apps/admin` with KYC review queue pages for partners and merchants (WS5).
10. Implement document viewer (authenticated streaming endpoint → admin preview) (WS5).
11. Implement approval/rejection/documents-required actions with reason capture (WS5).
12. Implement outlet approval queue (WS5).

**Phase D — Mobile (parallelizable with Phase C, after Phase B):**
13. Replace placeholder `partner_registration_screen.dart` with full registration + document upload wizard (WS6).
14. Extend `merchant_registration_screen.dart` to wire real API calls and upload tickets (WS7).
15. Implement real-time status polling (or push notification) for registration outcome (WS6, WS7).

**Phase E — Integration and acceptance (after Phases C and D):**
16. Run full backend test suite with Migration 003 applied.
17. Run audit tamper tests against live PostgreSQL.
18. Run encryption roundtrip tests.
19. Run mobile widget + integration tests.
20. Verify complete partner onboarding flow end-to-end (registration → document upload → admin approval → active).
21. Verify complete merchant onboarding flow end-to-end.
22. Update `PHASE_2_FINAL_ACCEPTANCE_REPORT.md`.

---

## I. Test and Acceptance Criteria

### I.1 Backend Unit Tests

| Test | Assertion |
|---|---|
| Path containment validation | Input `../../etc/passwd` → throws ForbiddenException |
| Symlink check | Symlink at storage path → throws ForbiddenException |
| Upload size limit | File > 10 MB → stream aborted, 413 response |
| Magic byte check | `.pdf` with JPEG magic bytes → rejected |
| PDF structural validation | Corrupted PDF → rejected |
| AES-256-GCM roundtrip | Encrypt then decrypt PAN → original value |
| HMAC deduplication | Same PAN → same HMAC → duplicate detected |
| Encryption fail-closed | Missing `FIELD_ENCRYPTION_KEY` → module init throws |
| State machine enforcement | Invalid status transition → HTTP 422 |
| Upload ticket expiry | `expires_at` elapsed + status `PENDING_LINK` → orphan cleanup deletes file |
| Audit log immutability | UPDATE on `audit_logs` → exception from trigger |
| Transactional audit | Domain change fails → no audit log written |

### I.2 Integration Tests (require live PostgreSQL)

| Test | Assertion |
|---|---|
| Migration 003 applies cleanly | No errors; rollback applies cleanly |
| Unique current document | Two current docs of same type → second insert raises unique index violation |
| Partner registration → document upload → admin approval | Full state transition sequence completes |
| Merchant registration → resubmission → approval | DOCUMENTS_REQUIRED → SUBMITTED → APPROVED |
| Outlet approval | New outlet starts as PENDING_APPROVAL, not visible to customers |
| Encryption persistence | Encrypted PAN survives PostgreSQL restart |
| Audit log append-only (via app DB role) | UPDATE on `audit_logs` via `allgo_app` role → exception |

### I.3 Mobile Acceptance Tests (Flutter)

| Test | Assertion |
|---|---|
| Partner registration form validation | Required fields enforced before API call |
| Document upload picker | File picker opens; file sent to upload ticket endpoint |
| Upload progress indicator | Progress displayed during upload |
| Registration status screen | Shows current approval status from backend |
| Merchant wizard step validation | Cannot proceed to next step without required input |

### I.4 Acceptance Gates (all must pass before Phase 2 sign-off)

- [ ] Migration 003 applies and rolls back without data loss on a fresh database.
- [ ] All backend unit tests pass (`npm run test -w @allgo/api`).
- [ ] All integration tests pass against live PostgreSQL.
- [ ] Audit tamper tests confirm immutability trigger blocks mutation.
- [ ] Encryption roundtrip test passes with 32-byte key.
- [ ] HMAC deduplication prevents duplicate PANs.
- [ ] Partner end-to-end flow: registration → document upload → admin approval → `APPROVED` status.
- [ ] Merchant end-to-end flow: registration → document submission → `DOCUMENTS_REQUIRED` → resubmission → admin approval → `LIVE`.
- [ ] Outlet creation starts as `PENDING_APPROVAL`; becomes `ACTIVE` only after admin approval.
- [ ] Orphan upload cleanup deletes expired unlinked files and does not touch linked files.
- [ ] Admin panel KYC review queue displays correct data.
- [ ] Admin document viewer streams files to authorized admin only.
- [ ] Flutter partner registration wizard makes real API calls (no hardcoded data).
- [ ] Flutter merchant registration wizard resubmission flow works.
- [ ] `PHASE_2_FINAL_ACCEPTANCE_REPORT.md` produced with real execution evidence.

---

## J. Legal and Compliance Assumptions Requiring Review

> [!CAUTION]
> The following items require review by a qualified Indian legal professional before AllGo goes to production. These are engineering design assumptions, not legal advice.

| # | Item | Assumption made | Required action |
|---|---|---|---|
| L1 | Aadhaar collection | Do NOT collect full Aadhaar numbers without UIDAI authorization | Confirm with legal: Does AllGo need UIDAI ASA license? Use DigiLocker if possible. |
| L2 | Bike taxi legality | Permitted only in states where explicitly legal (Goa, Karnataka). Banned in Delhi, Tamil Nadu, others. | Legal clearance required for each city before enabling bike taxi service. |
| L3 | Auto-rickshaw commercial permit | Varies by state RTO | Legal review for each operating city. |
| L4 | Cab aggregator license | Required by Motor Vehicles (Amendment) Act 2019 for cab aggregators | Confirm aggregator licensing before cab ride-hailing launch. |
| L5 | PAN retention period | 7 years per Income Tax Act 1961 | Legal confirmation of exact requirement for a platform intermediary. |
| L6 | FSSAI license retention | 5 years per FSSAI Act | Legal confirmation. |
| L7 | Bank account retention | 5 years per RBI PA/PG guidelines | Legal confirmation; depends on whether AllGo is classified as a PA. |
| L8 | DPDP Act 2023 compliance | Minimum retention for profile photos: 1 year after closure | Legal review of DPDP obligations for a marketplace platform. |
| L9 | Secure erasure claims | No byte-level guarantees on SSD; production should use GCS lifecycle | Do not make data-erasure guarantees to users without infrastructure verification. |
| L10 | Masked Aadhaar display | Only last 4 digits visible | Confirm this is sufficient for all use cases. |

---

## K. Phase 0 Frozen Asset Inventory

The following files are **permanently frozen** and MUST NOT be modified under any circumstance without explicit owner authorization:

| File / Directory | Frozen since | Why |
|---|---|---|
| `docs/` | Phase 0 | Architecture documentation baseline |
| `infra/terraform/` | Phase 0 | Infrastructure-as-code baseline |
| `database/migrations/001_initial_schema.sql` | Phase 0 | Foundation schema |
| `database/migrations/002_postgis_indexes.sql` | Phase 0 | PostGIS index baseline |
| `database/seeds/` | Phase 0 | Seed data baseline |
| `scripts/cost-calculator.ts` | Phase 0 | Cost modeling baseline |

**Migration 003 is the ONLY authorized schema modification for Phase 2.** All alterations to Phase 0 tables (such as the `merchants` status constraint extension) MUST be done via `ALTER TABLE` in Migration 003, never by editing `001_initial_schema.sql`.

---

## L. Schema Change Summary Requiring Owner Sign-Off

The following alterations in Migration 003 touch Phase 0 tables. While they are non-destructive (additive or constraint extensions), they require explicit owner acknowledgement before Migration 003 is finalized:

| Change | Table affected | Type | Risk level |
|---|---|---|---|
| DROP + ADD CHECK constraint | `merchants` | Constraint extension (adds `DOCUMENTS_REQUIRED`, `BLOCKED`) | Low — no data change, extends allowed values |
| ADD COLUMN `outlet_status` + CHECK | `outlets` | Additive | Low — existing rows default to `ACTIVE` |
| ADD COLUMN `reason` | `audit_logs` | Additive | Very low |
| ADD COLUMN `deleted_at` to `partner_documents` | `partner_documents` | Additive | Very low |
| ADD multiple columns to `partner_documents` | `partner_documents` | Additive | Very low |
| ADD trigger `trg_prevent_audit_log_mutation` | `audit_logs` | New trigger | Medium — prevents any future UPDATE/DELETE on this table |
| Recommend changing `ON DELETE CASCADE` to `ON DELETE RESTRICT` | `partner_documents` | FK constraint change | Medium — changes deletion behavior; existing CASCADE FK dropped and replaced |

---

## Status

```
PHASE 2 PREFLIGHT — READY FOR OWNER AUTHORIZATION
```

**No blockers discovered that prevent Phase 2 implementation.** All identified design tensions and legal assumptions have been documented with explicit flags. The following items require owner decisions before migration 003 is finalized:

1. ✅ Confirm extension of `merchants.status` CHECK constraint to include `DOCUMENTS_REQUIRED` and `BLOCKED`.
2. ✅ Confirm changing `partner_documents` FK from `ON DELETE CASCADE` to `ON DELETE RESTRICT`.
3. ✅ Confirm immutability trigger on `audit_logs` is authorized.
4. ✅ Acknowledge Aadhaar legal review requirement (no Aadhaar collection until legal clearance).
5. ✅ Acknowledge bike taxi city-by-city legal clearance requirement.
6. ✅ Confirm document storage root path for local development (`DOCUMENT_STORAGE_ROOT` env var).
7. ✅ Confirm whether Aadhaar / DigiLocker integration is in Phase 2 scope or deferred to Phase 3.

---

*Document end. Awaiting explicit owner authorization to begin Phase 2 implementation.*
