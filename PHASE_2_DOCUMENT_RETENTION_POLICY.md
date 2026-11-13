# ALLGO — PHASE 2 DOCUMENT RETENTION & DATA LIFECYCLE POLICY
## Regulatory Compliance, Retention Schedules, Soft-Deletion and Secure Sanitization

**Project:** AllGo — India Super App  
**Workspace:** `E:\allgo`  
**Date:** 2026-11-10  
**Status:** APPROVED ENGINEERING SPECIFICATION  

---

## 1. REGULATORY JURISDICTION & STATUTORY FRAMEWORK

AllGo operates within the jurisdiction of the Republic of India and adheres strictly to Indian statutory mandates governing identity retention, financial transactions, and transportation aggregator compliance:

1. **Prevention of Money Laundering Act (PMLA), 2002 & PML Rules (Rule 9):** Requires preservation of client identification records and transaction history for a minimum period of **five (5) years** after the business relationship has ended.
2. **Reserve Bank of India (RBI) KYC Master Direction (2016, as amended):** Mandates five-year retention of verified identity and payout account records for payout participants.
3. **Motor Vehicle Aggregator Guidelines (MoRTH, 2020):** Mandates preservation of driver partner records, commercial vehicle registration, driver police verification, and insurance certificates for at least **two (2) years** following contract termination.
4. **Food Safety and Standards (Licensing and Registration of Food Businesses) Regulations, 2011:** Mandates continuous verification and retention of FSSAI licenses, food premises hygiene certificates, and merchant declarations.
5. **Information Technology Act, 2000 & CERT-In Directives (April 2022):** Requires logging and audit preservation for all system and administrative transactions for a mandatory minimum of **180 days**.

---

## 2. DATA CATEGORIZATION & RETENTION SCHEDULES

| Record Category | Data Artifacts | Active Retention | Post-Termination Retention | Disposal / Sanitization Method |
| :--- | :--- | :--- | :--- | :--- |
| **Partner KYC Documents** | Driving License, Vehicle RC, Insurance, Police Verification | Active account lifetime | **5 years** from account deactivation or termination | Crypto-shredding + NIST SP 800-88 File Overwrite |
| **Partner Financial Details** | Bank Account (AES-256-GCM), IFSC, HMAC blind index | Active account lifetime | **5 years** (PMLA requirement) | Key destruction (Crypto-shredding) |
| **Merchant KYC Documents** | FSSAI License, GSTIN Certificate, Shop Act License | Active merchant lifetime | **5 years** from store closure | Secure binary unlink & zeroization |
| **Superseded Documents** | Historical versions of licenses / RCs replaced by newer versions | Archived immediately (`is_current = FALSE`) | **5 years** from date of supersession | Automated cron cleanup after 5 years |
| **Rejected Applications** | KYC documents uploaded by partners/merchants whose onboarding was rejected | **180 days** from date of rejection | **None** (Disposed after 180 days) | Unlink from storage and shred file |
| **Ephemeral Upload Tickets** | Temporary file slots created during upload flow | **15 minutes** | **None** (Immediate garbage collection) | Automated filesystem unlink via `StorageService.cleanOrphanTickets()` |
| **Immutable Audit Logs** | Admin actions, reasons, timestamps, status transitions | **Permanent** | **Indefinite (minimum 5 years)** | WORM (Write Once, Read Many) cloud backup |

---

## 3. SOFT-DELETION ARCHITECTURE & PRESERVATION OF CHAIN OF CUSTODY

### 3.1 Soft-Deletion via `deleted_at`
To prevent accidental hard deletion of regulatory KYC evidence:
- Both `partner_documents` and `merchant_documents` tables feature an explicit `deleted_at TIMESTAMPTZ` column.
- Application code queries filter out soft-deleted records (`WHERE deleted_at IS NULL`).
- Partial unique indexes (`uq_partner_current_doc` and `uq_merchant_current_doc`) include `WHERE deleted_at IS NULL`, allowing users to re-upload documents without constraint collisions while preserving the historical record.

### 3.2 Supersession Pointers
When an updated document is uploaded (e.g. an updated FSSAI renewal or driving license renewal):
1. The new document is inserted with `version = previous_version + 1`.
2. The previous document is marked `is_current = FALSE`.
3. The previous document's `superseded_by` foreign key is updated to point directly to the newly created document ID.
4. This maintains an unbroken cryptographic chain of custody from the initial registration through all regulatory renewals.

---

## 4. SECURE SANITIZATION AND CRYPTO-SHREDDING PROCEDURES

### 4.1 Ephemeral Storage Sanitization
Unlinked or expired files in `LOCAL_STORAGE_ROOT` are cleaned by the background task `cleanOrphanTickets()`:
1. Identifies tickets with `status = 'TICKET_CREATED'` and `expires_at < NOW()`.
2. If a partial file was written to disk, it is removed using `fs.unlinkSync`.
3. The ticket status in PostgreSQL is updated to `EXPIRED`.

### 4.2 Crypto-Shredding of Sensitive Identifiers
Sensitive payout data in the database is encrypted with AES-256-GCM using keys stored in Cloud KMS / Google Secret Manager. When a user exercises a statutory "Right to be Forgotten" upon the expiration of the 5-year PMLA retention window:
1. The specific database field encryption key or individual record initialization parameters are securely discarded.
2. The database rows containing `v1:<ciphertext>` become mathematically undecryptable, achieving instant, irreversible sanitization without modifying immutable audit log structures.

### 4.3 Physical File Sanitization
When a document exceeds its 5-year post-termination retention limit:
1. The file located at `storage_key` is overwritten with random bytes in accordance with NIST SP 800-88 Rev 1 (Clear/Purge) before unlinking.
2. The corresponding database record is updated with `deleted_at = NOW()` and `storage_key = NULL`.
3. An audit log entry is recorded with `reason: 'Statutory 5-year retention period expired. File sanitized.'`.
