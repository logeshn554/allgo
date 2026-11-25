import crypto from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const BACKUP_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes ambiguous 0/O, 1/I

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

export function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/=+$/, '').replace(/[\s-]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) {
      throw new Error(`Invalid Base32 character: ${char}`);
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

export function generateTotpSecret(byteLength = 20): string {
  return base32Encode(crypto.randomBytes(byteLength));
}

export function generateTotpCode(
  secret: string,
  timestampMs: number = Date.now(),
  stepSeconds = 30,
  digits = 6,
): string {
  const key = base32Decode(secret);
  const counter = Math.floor(timestampMs / 1000 / stepSeconds);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const binary =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);

  const otp = binary % 10 ** digits;
  return String(otp).padStart(digits, '0');
}

export function verifyTotpCode(
  secret: string,
  code: string,
  window = 1,
  timestampMs: number = Date.now(),
  stepSeconds = 30,
): boolean {
  const cleaned = (code || '').trim().replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleaned)) {
    return false;
  }

  const candidateBuf = Buffer.from(cleaned, 'utf8');
  for (let delta = -window; delta <= window; delta++) {
    const expected = generateTotpCode(
      secret,
      timestampMs + delta * stepSeconds * 1000,
      stepSeconds,
      6,
    );
    const expectedBuf = Buffer.from(expected, 'utf8');
    if (
      expectedBuf.length === candidateBuf.length &&
      crypto.timingSafeEqual(expectedBuf, candidateBuf)
    ) {
      return true;
    }
  }
  return false;
}

export function buildOtpAuthUri(params: {
  secret: string;
  accountName: string;
  issuer?: string;
}): string {
  const issuer = params.issuer || 'AllGo';
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(params.accountName)}`;
  const query = new URLSearchParams({
    secret: params.secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${label}?${query.toString()}`;
}

export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    let part1 = '';
    let part2 = '';
    for (let j = 0; j < 4; j++) {
      part1 += BACKUP_CODE_CHARS[crypto.randomInt(0, BACKUP_CODE_CHARS.length)];
      part2 += BACKUP_CODE_CHARS[crypto.randomInt(0, BACKUP_CODE_CHARS.length)];
    }
    codes.push(`${part1}-${part2}`);
  }
  return codes;
}

export function normalizeBackupCode(code: string): string {
  return (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function hashBackupCode(code: string, pepper: string): string {
  const normalized = normalizeBackupCode(code);
  return crypto.createHmac('sha256', pepper).update(normalized).digest('hex');
}

export function verifyAndConsumeBackupCode(
  code: string,
  storedHashes: string[],
  pepper: string,
): { valid: boolean; remainingHashes: string[] } {
  const normalized = normalizeBackupCode(code);
  if (normalized.length < 6 || !Array.isArray(storedHashes) || storedHashes.length === 0) {
    return { valid: false, remainingHashes: storedHashes || [] };
  }

  const incomingHash = crypto.createHmac('sha256', pepper).update(normalized).digest('hex');
  const incomingBuf = Buffer.from(incomingHash, 'utf8');

  let matchedIndex = -1;
  for (let i = 0; i < storedHashes.length; i++) {
    const targetBuf = Buffer.from(storedHashes[i] || '', 'utf8');
    if (
      targetBuf.length === incomingBuf.length &&
      crypto.timingSafeEqual(targetBuf, incomingBuf)
    ) {
      matchedIndex = i;
      break;
    }
  }

  if (matchedIndex === -1) {
    return { valid: false, remainingHashes: storedHashes };
  }

  const remainingHashes = storedHashes.filter((_, idx) => idx !== matchedIndex);
  return { valid: true, remainingHashes };
}
