import assert from 'node:assert';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { EncryptionService } from '../../services/api/dist/common/encryption/encryption.service.js';
import { StorageService } from '../../services/api/dist/storage/storage.service.js';
import { MockDatabaseService } from '../helpers/test-doubles.ts';

describe('Checkpoint 2: Storage, Upload Tickets, File Validation & Encryption Security', () => {
  let encryptionService: EncryptionService;
  let storageService: StorageService;
  let mockDb: MockDatabaseService;
  let tempStorageDir: string;

  beforeEach(() => {
    // 1. Initialize Encryption
    encryptionService = new EncryptionService();
    encryptionService.initializeKeys();

    // 2. Initialize isolated temporary storage directory
    tempStorageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'allgo-test-storage-'));
    mockDb = new MockDatabaseService();
    storageService = new StorageService(mockDb as any);
    storageService.setStorageRootForTesting(tempStorageDir);
  });

  afterEach(() => {
    // Clean up temporary storage directory
    if (fs.existsSync(tempStorageDir)) {
      fs.rmSync(tempStorageDir, { recursive: true, force: true });
    }
  });

  describe('Part A: AES-256-GCM Field Encryption, HMAC & Data Minimization', () => {
    it('should encrypt and decrypt sensitive fields correctly (roundtrip)', () => {
      const pan = 'ABCDE1234F';
      const bankAccount = '50100234567890';

      const encryptedPan = encryptionService.encrypt(pan);
      const encryptedBank = encryptionService.encrypt(bankAccount);

      assert.ok(encryptedPan.startsWith('v1:'), 'Ciphertext must carry version prefix');
      assert.notStrictEqual(encryptedPan, pan, 'Ciphertext must not match plaintext');

      const decryptedPan = encryptionService.decrypt(encryptedPan);
      const decryptedBank = encryptionService.decrypt(encryptedBank);

      assert.strictEqual(decryptedPan, pan);
      assert.strictEqual(decryptedBank, bankAccount);
    });

    it('should use a unique random 96-bit nonce for each encryption operation', () => {
      const plaintext = 'ABCDE1234F';
      const enc1 = encryptionService.encrypt(plaintext);
      const enc2 = encryptionService.encrypt(plaintext);

      assert.notStrictEqual(
        enc1,
        enc2,
        'Two encryptions of same plaintext must produce different ciphertexts',
      );
      assert.strictEqual(encryptionService.decrypt(enc1), plaintext);
      assert.strictEqual(encryptionService.decrypt(enc2), plaintext);
    });

    it('should reject tampered or corrupted ciphertext (GCM auth tag verification)', () => {
      const enc = encryptionService.encrypt('SECRET_DATA_123');
      const parts = enc.split(':');
      const buffer = Buffer.from(parts[1], 'base64');

      // Flip a bit in the middle of ciphertext
      buffer[15] ^= 0xff;
      const tampered = `v1:${buffer.toString('base64')}`;

      assert.throws(() => {
        encryptionService.decrypt(tampered);
      }, /Unsupported state or unable to authenticate data|Corrupted/);
    });

    it('should compute deterministic HMAC-SHA256 for field deduplication', () => {
      const pan = 'ABCDE1234F';
      const hmac1 = encryptionService.computeHmac(pan);
      const hmac2 = encryptionService.computeHmac('  abcde1234f  '); // Case and whitespace normalization

      assert.ok(hmac1.length === 64, 'HMAC must be 64-char hex SHA-256');
      assert.strictEqual(
        hmac1,
        hmac2,
        'HMAC should normalize case and whitespace for deduplication',
      );
    });

    it('should enforce data minimization by rejecting full 12-digit Aadhaar numbers', () => {
      assert.throws(() => {
        encryptionService.encrypt('123456789012');
      }, /Aadhaar numbers is strictly prohibited/);

      assert.throws(() => {
        encryptionService.encrypt('1234 5678 9012');
      }, /Aadhaar numbers is strictly prohibited/);
    });

    it('should mask sensitive identifiers according to display policy', () => {
      assert.strictEqual(encryptionService.maskPan('ABCDE1234F'), 'ABCDE****F');
      assert.strictEqual(encryptionService.maskBankAccount('50100234567890'), '**********7890');
      assert.strictEqual(encryptionService.maskUpi('merchant@icici'), 'm******t@icici');
    });
  });

  describe('Part B: Path Containment, Symlink Detection & Filesystem Security', () => {
    it('should resolve safe storage keys within storage root', () => {
      const key = `${crypto.randomUUID()}.pdf`;
      const resolved = storageService.resolveAndValidatePath(key);

      assert.strictEqual(path.dirname(resolved), tempStorageDir);
      assert.strictEqual(path.basename(resolved), key);
    });

    it('should reject path traversal attempts (relative dot-dot and root escapes)', () => {
      assert.throws(() => {
        storageService.resolveAndValidatePath('../../etc/passwd');
      }, /Path traversal attempt detected/);

      assert.throws(() => {
        storageService.resolveAndValidatePath('..\\..\\Windows\\System32\\cmd.exe');
      }, /Path traversal attempt detected/);

      assert.throws(() => {
        storageService.resolveAndValidatePath('subfolder/../../secret.txt');
      }, /Path traversal attempt detected/);
    });

    it('should reject symbolic links at storage paths', () => {
      const realFile = path.join(tempStorageDir, 'real-target.txt');
      fs.writeFileSync(realFile, 'real-content');

      const symlinkKey = 'symlink-test.pdf';
      const symlinkPath = path.join(tempStorageDir, symlinkKey);

      try {
        fs.symlinkSync(realFile, symlinkPath);
        assert.throws(() => {
          storageService.resolveAndValidatePath(symlinkKey);
        }, /Symbolic links are strictly prohibited/);
      } catch (err: any) {
        // On Windows without Developer Mode, symlink creation might require admin privileges.
        // If system refuses creation, test is satisfied.
        if (err.code !== 'EPERM') throw err;
      }
    });
  });

  describe('Part C: File Validation (Magic Bytes, Structural Check & Size Limits)', () => {
    it('should reject empty files and files exceeding 5 MB', () => {
      assert.throws(() => {
        storageService.validateFileContent(Buffer.alloc(0), 'application/pdf');
      }, /Empty file received/);

      const oversized = Buffer.alloc(5 * 1024 * 1024 + 1);
      assert.throws(() => {
        storageService.validateFileContent(oversized, 'application/pdf');
      }, /exceeds 5 MB limit/);
    });

    it('should validate valid PDF files and reject corrupted ones', () => {
      // Valid minimal PDF
      const validPdf = Buffer.from(
        '%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\nstartxref\n99\n%%EOF',
      );
      assert.doesNotThrow(() => {
        storageService.validateFileContent(validPdf, 'application/pdf');
      });

      // Invalid magic bytes
      const fakePdf = Buffer.from('NOT_A_PDF_FILE');
      assert.throws(() => {
        storageService.validateFileContent(fakePdf, 'application/pdf');
      }, /magic bytes mismatch/);

      // Missing EOF marker
      const truncatedPdf = Buffer.from('%PDF-1.4\nsome content without end');
      assert.throws(() => {
        storageService.validateFileContent(truncatedPdf, 'application/pdf');
      }, /missing %%EOF/);
    });

    it('should validate valid JPEG files and reject corrupted ones', () => {
      // Valid minimal JPEG: FF D8 FF ... FF D9
      const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0xff, 0xd9]);
      assert.doesNotThrow(() => {
        storageService.validateFileContent(validJpeg, 'image/jpeg');
      });

      // Bad magic bytes
      const badJpeg = Buffer.from([0x00, 0x00, 0x00, 0xff, 0xd9]);
      assert.throws(() => {
        storageService.validateFileContent(badJpeg, 'image/jpeg');
      }, /magic bytes mismatch/);

      // Missing EOI
      const truncatedJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      assert.throws(() => {
        storageService.validateFileContent(truncatedJpeg, 'image/jpeg');
      }, /missing EOI marker/);
    });

    it('should validate valid PNG files and reject corrupted ones', () => {
      // Valid minimal PNG: 89 50 4E 47 0D 0A 1A 0A ... IEND ...
      const validPng = Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        Buffer.from('IEND\xaeB`\x82'),
      ]);
      assert.doesNotThrow(() => {
        storageService.validateFileContent(validPng, 'image/png');
      });

      // Bad PNG signature
      const badPng = Buffer.from('FAKE_PNG_HEADER');
      assert.throws(() => {
        storageService.validateFileContent(badPng, 'image/png');
      }, /magic bytes mismatch/);
    });
  });

  describe('Part D: Upload Ticket Lifecycle, Ownership & Anti-Orphan Cleanup', () => {
    const testUserId = 'usr_test_partner_01';
    const unauthorizedUserId = 'usr_attacker_99';

    it('should create upload ticket with PENDING_LINK status and 1-hour expiry', async () => {
      const ticket = await storageService.createTicket(testUserId, {
        documentType: 'DRIVING_LICENSE',
        mimeType: 'application/pdf',
        fileSizeBytes: 2048,
      });

      assert.ok(ticket.id);
      assert.strictEqual(ticket.uploader_user_id, testUserId);
      assert.strictEqual(ticket.status, 'PENDING_LINK');
      assert.strictEqual(ticket.scan_status, 'UNSCANNED');
      assert.ok(ticket.expires_at > new Date());
    });

    it('should reject file upload when requested by unauthorized user', async () => {
      const ticket = await storageService.createTicket(testUserId, {
        documentType: 'DRIVING_LICENSE',
        mimeType: 'application/pdf',
        fileSizeBytes: 1024,
      });

      const validPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');

      await assert.rejects(async () => {
        await storageService.saveUploadedFile(ticket.id, unauthorizedUserId, validPdf);
      }, /Ticket does not belong to authenticated user/);
    });

    it('should store file, integrate ClamAV fail-closed, and update file metadata', async () => {
      const ticket = await storageService.createTicket(testUserId, {
        documentType: 'DRIVING_LICENSE',
        mimeType: 'application/pdf',
        fileSizeBytes: 1024,
      });

      const validPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
      const updated = await storageService.saveUploadedFile(ticket.id, testUserId, validPdf);

      assert.strictEqual(updated.id, ticket.id);
      assert.strictEqual(updated.file_size_bytes, validPdf.length);

      // Verify file exists on disk
      const diskPath = storageService.resolveAndValidatePath(ticket.storage_key);
      assert.ok(fs.existsSync(diskPath));
      assert.strictEqual(fs.readFileSync(diskPath).length, validPdf.length);

      // When ClamAV is offline in local dev, scan status must fail closed (SKIPPED_UNAVAILABLE)
      assert.strictEqual(updated.scan_status, 'SKIPPED_UNAVAILABLE');
    });

    it('should quarantine and delete infected file when ClamAV detects malware (EICAR)', async () => {
      const ticket = await storageService.createTicket(testUserId, {
        documentType: 'DRIVING_LICENSE',
        mimeType: 'application/pdf',
        fileSizeBytes: 1024,
      });

      // Mock ClamAV detecting EICAR signature
      const originalScan = storageService.scanFileWithClamAv.bind(storageService);
      storageService.scanFileWithClamAv = async () => ({
        clean: false,
        error: 'stream: Win.Test.EICAR_HDB-1 FOUND',
      });

      const validPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');

      try {
        await assert.rejects(async () => {
          await storageService.saveUploadedFile(ticket.id, testUserId, validPdf);
        }, /Malware detected/);

        // Verify infected file was unlinked and removed from disk immediately
        const diskPath = storageService.resolveAndValidatePath(ticket.storage_key);
        assert.ok(!fs.existsSync(diskPath), 'Infected file must be deleted from disk');
        assert.strictEqual(ticket.status, 'FAILED');
        assert.strictEqual(ticket.scan_status, 'INFECTED');
      } finally {
        storageService.scanFileWithClamAv = originalScan;
      }
    });

    it('should link upload ticket to domain entity (partner or merchant)', async () => {
      const ticket = await storageService.createTicket(testUserId, {
        documentType: 'DRIVING_LICENSE',
        mimeType: 'application/pdf',
        fileSizeBytes: 1024,
      });

      const validPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
      await storageService.saveUploadedFile(ticket.id, testUserId, validPdf);

      const linked = await storageService.linkTicket(
        ticket.id,
        testUserId,
        'partner',
        'partner_uuid_001',
      );

      assert.strictEqual(linked.status, 'LINKED');
      assert.strictEqual(linked.linked_entity_type, 'partner');
      assert.strictEqual(linked.linked_entity_id, 'partner_uuid_001');
    });

    it('should clean up expired unlinked tickets without touching linked documents', async () => {
      // 1. Create expired unlinked ticket
      const orphanTicket = await storageService.createTicket(testUserId, {
        documentType: 'PAN',
        mimeType: 'application/pdf',
        fileSizeBytes: 1024,
      });
      const validPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
      await storageService.saveUploadedFile(orphanTicket.id, testUserId, validPdf);
      // Simulate expired ticket
      orphanTicket.expires_at = new Date(Date.now() - 1000);

      // 2. Create linked ticket (must NOT be deleted)
      const linkedTicket = await storageService.createTicket(testUserId, {
        documentType: 'DRIVING_LICENSE',
        mimeType: 'application/pdf',
        fileSizeBytes: 1024,
      });
      await storageService.saveUploadedFile(linkedTicket.id, testUserId, validPdf);
      await storageService.linkTicket(linkedTicket.id, testUserId, 'partner', 'partner_uuid_001');
      linkedTicket.expires_at = new Date(Date.now() - 1000); // even if expired, linked docs are never deleted!

      const orphanPath = storageService.resolveAndValidatePath(orphanTicket.storage_key);
      const linkedPath = storageService.resolveAndValidatePath(linkedTicket.storage_key);

      assert.ok(fs.existsSync(orphanPath));
      assert.ok(fs.existsSync(linkedPath));

      // Run cleanup
      const result = await storageService.cleanupOrphanUploads();

      assert.strictEqual(result.cleanedCount, 1);
      assert.strictEqual(orphanTicket.status, 'ORPHANED');
      assert.ok(!fs.existsSync(orphanPath), 'Orphan file must be deleted');
      assert.ok(fs.existsSync(linkedPath), 'Linked file must NEVER be deleted by orphan cleanup');
    });
  });
});
