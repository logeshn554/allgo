import { Injectable, OnModuleInit } from '@nestjs/common';
import crypto from 'node:crypto';

export interface KmsEncryptResult {
  ciphertextBase64: string;
  kmsKeyId: string;
  version: string;
}

@Injectable()
export class CloudKmsService implements OnModuleInit {
  private masterKey: Buffer | null = null;
  private readonly defaultKeyId = 'projects/allgo-prod/locations/asia-south1/keyRings/kyc/cryptoKeys/kyc-doc-key';

  onModuleInit() {
    this.initializeKms();
  }

  public initializeKms() {
    const rawKey = process.env.KMS_MASTER_KEY || process.env.FIELD_ENCRYPTION_KEY;
    if (rawKey) {
      try {
        const decoded = Buffer.from(rawKey, 'base64');
        this.masterKey = decoded.length === 32 ? decoded : crypto.createHash('sha256').update(rawKey).digest();
      } catch {
        this.masterKey = crypto.createHash('sha256').update(rawKey).digest();
      }
    } else {
      this.masterKey = crypto.createHash('sha256').update('allgo_dev_kms_master_key_asia_south1_32b').digest();
    }
  }

  public getKeyId(): string {
    return process.env.KMS_KEY_ID || this.defaultKeyId;
  }

  public encryptDocumentPayload(buffer: Buffer, keyId?: string): Buffer {
    if (!this.masterKey) this.initializeKms();
    const effectiveKeyId = keyId || this.getKeyId();

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey!, iv);
    const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const header = Buffer.from(JSON.stringify({
      kmsKeyId: effectiveKeyId,
      alg: 'AES-256-GCM',
      v: 1,
    }), 'utf8');

    const headerLengthBuf = Buffer.alloc(4);
    headerLengthBuf.writeUInt32BE(header.length, 0);

    return Buffer.concat([
      Buffer.from('ALLGO_KMS:'),
      headerLengthBuf,
      header,
      iv,
      authTag,
      ciphertext,
    ]);
  }

  public decryptDocumentPayload(buffer: Buffer): Buffer {
    if (!this.masterKey) this.initializeKms();
    if (!buffer || buffer.length < 14) {
      return buffer;
    }
    const magic = buffer.subarray(0, 10).toString('utf8');
    if (magic !== 'ALLGO_KMS:') {
      // Not encrypted with KMS or raw buffer
      return buffer;
    }

    const headerLen = buffer.readUInt32BE(10);
    const ivStart = 14 + headerLen;
    // Header + 12 (IV) + 16 (AuthTag)
    if (buffer.length < ivStart + 28) {
      throw new Error('Malformed KMS payload: truncated payload bytes');
    }

    let header: any;
    try {
      const headerBytes = buffer.subarray(14, ivStart);
      header = JSON.parse(headerBytes.toString('utf8'));
    } catch {
      throw new Error('Malformed KMS payload header: invalid JSON');
    }

    if (!header || !header.kmsKeyId) {
      throw new Error('Malformed KMS payload header: missing keyId');
    }

    const iv = buffer.subarray(ivStart, ivStart + 12);
    const authTag = buffer.subarray(ivStart + 12, ivStart + 28);
    const ciphertext = buffer.subarray(ivStart + 28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey!, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }
}
