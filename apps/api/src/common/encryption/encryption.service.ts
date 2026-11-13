import { Injectable, OnModuleInit, BadRequestException } from '@nestjs/common';
import crypto from 'node:crypto';

@Injectable()
export class EncryptionService implements OnModuleInit {
  private encryptionKey: Buffer | null = null;
  private hmacKey: Buffer | null = null;
  private readonly defaultVersion = 'v1';

  onModuleInit() {
    this.initializeKeys();
  }

  /**
   * Initialize cryptographic keys from environment or deterministic test keys.
   * Fails closed if keys are malformed or missing in production.
   */
  public initializeKeys() {
    const rawKey = process.env.FIELD_ENCRYPTION_KEY;
    const rawHmacKey = process.env.FIELD_HMAC_KEY;
    const isProduction = process.env.NODE_ENV === 'production';

    if (rawKey) {
      const decoded = Buffer.from(rawKey, 'base64');
      if (decoded.length !== 32) {
        throw new Error('FIELD_ENCRYPTION_KEY must be exactly 32 bytes (256 bits) encoded in base64');
      }
      this.encryptionKey = decoded;
    } else if (isProduction) {
      throw new Error('FATAL: FIELD_ENCRYPTION_KEY environment variable is missing in production');
    } else {
      // Deterministic dev/test fallback key (32 bytes)
      this.encryptionKey = crypto.createHash('sha256').update('allgo_dev_field_encryption_key_32_bytes').digest();
    }

    if (rawHmacKey) {
      const decodedHmac = Buffer.from(rawHmacKey, 'base64');
      if (decodedHmac.length !== 32) {
        throw new Error('FIELD_HMAC_KEY must be exactly 32 bytes (256 bits) encoded in base64');
      }
      this.hmacKey = decodedHmac;
    } else if (isProduction) {
      throw new Error('FATAL: FIELD_HMAC_KEY environment variable is missing in production');
    } else {
      // Deterministic dev/test fallback HMAC key (32 bytes - distinct from encryption key)
      this.hmacKey = crypto.createHash('sha256').update('allgo_dev_field_hmac_key_distinct_32_bytes').digest();
    }
  }

  /**
   * Encrypt sensitive string data using AES-256-GCM.
   * Returns formatted string: "v1:<base64(iv || ciphertext || authTag)>"
   */
  encrypt(plaintext: string): string {
    if (!plaintext) {
      return plaintext;
    }

    // Enforce data minimization: refuse to encrypt full 12-digit Aadhaar numbers
    if (/^\d{12}$/.test(plaintext.replace(/\s+/g, ''))) {
      throw new BadRequestException('Collection and storage of full Aadhaar numbers is strictly prohibited under Phase 2 data minimization policies.');
    }

    if (!this.encryptionKey) {
      throw new Error('Encryption service failed closed: No encryption key loaded.');
    }

    // 96-bit (12-byte) cryptographically secure random nonce
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    // 128-bit (16-byte) authentication tag
    const authTag = cipher.getAuthTag();

    // Package: IV (12) + Ciphertext (N) + AuthTag (16)
    const payload = Buffer.concat([iv, ciphertext, authTag]);
    return `${this.defaultVersion}:${payload.toString('base64')}`;
  }

  /**
   * Decrypt AES-256-GCM encrypted payload.
   */
  decrypt(encryptedValue: string): string {
    if (!encryptedValue) {
      return encryptedValue;
    }

    if (!encryptedValue.startsWith(`${this.defaultVersion}:`)) {
      // If unversioned or unexpected prefix, fail closed
      throw new Error(`Unsupported encryption version or corrupted payload: ${encryptedValue.slice(0, 10)}`);
    }

    if (!this.encryptionKey) {
      throw new Error('Encryption service failed closed: No encryption key loaded.');
    }

    const base64Data = encryptedValue.slice(this.defaultVersion.length + 1);
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length < 28) { // 12 bytes IV + 16 bytes AuthTag minimum
      throw new Error('Corrupted encrypted payload: payload too short.');
    }

    const iv = buffer.subarray(0, 12);
    const authTag = buffer.subarray(buffer.length - 16);
    const ciphertext = buffer.subarray(12, buffer.length - 16);

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  /**
   * Compute deterministic HMAC-SHA256 for sensitive field deduplication.
   * Normalizes value (trimmed, lowercased) before hashing.
   */
  computeHmac(value: string): string {
    if (!value) return '';
    if (!this.hmacKey) {
      throw new Error('Encryption service failed closed: No HMAC key loaded.');
    }

    const normalized = value.trim().toLowerCase();
    return crypto.createHmac('sha256', this.hmacKey).update(normalized).digest('hex');
  }

  /**
   * Mask PAN (e.g. ABCDE1234F -> ABCDE****F)
   */
  maskPan(pan: string): string {
    if (!pan || pan.length < 10) return pan;
    return `${pan.slice(0, 5)}****${pan.slice(9)}`;
  }

  /**
   * Mask Bank Account (e.g. 50100234567890 -> **********7890)
   */
  maskBankAccount(accountNumber: string): string {
    if (!accountNumber || accountNumber.length < 4) return accountNumber;
    const visibleSuffix = accountNumber.slice(-4);
    return '*'.repeat(Math.max(4, accountNumber.length - 4)) + visibleSuffix;
  }

  /**
   * Mask UPI (e.g. merchant@icici -> m***@icici)
   */
  maskUpi(upiId: string): string {
    if (!upiId || !upiId.includes('@')) return upiId;
    const parts = upiId.split('@');
    const handle = parts[0] || '';
    const vpa = parts[1] || '';
    if (handle.length <= 2) return `${handle[0] || '*'}*@${vpa}`;
    return `${handle[0]}${'*'.repeat(handle.length - 2)}${handle.slice(-1)}@${vpa}`;
  }
}
