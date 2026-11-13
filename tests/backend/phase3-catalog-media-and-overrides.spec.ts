import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CatalogMediaService } from '../../apps/api/dist/catalog/catalog-media.service.js';
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';

describe('Phase 3: Catalog Media Validation & Storage Security', () => {
  const dummyDb: any = { query: async () => ({ rows: [] }) };
  const mediaService = new CatalogMediaService(dummyDb);

  test('should validate and accept genuine JPEG buffer', () => {
    // JPEG magic bytes: FF D8 FF
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const res = mediaService.validateImage(jpegBuffer, 'image/jpeg');
    assert.equal(res.mimeType, 'image/jpeg');
    assert.equal(res.extension, 'jpg');
  });

  test('should validate and accept genuine PNG buffer', () => {
    // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    const res = mediaService.validateImage(pngBuffer, 'image/png');
    assert.equal(res.mimeType, 'image/png');
    assert.equal(res.extension, 'png');
  });

  test('should validate and accept genuine WEBP buffer', () => {
    // WEBP magic bytes: RIFF (4 bytes) + length (4 bytes) + WEBP (4 bytes)
    const webpBuffer = Buffer.concat([
      Buffer.from('RIFF'),
      Buffer.from([0x00, 0x00, 0x00, 0x00]),
      Buffer.from('WEBP'),
      Buffer.from('VP8 '),
    ]);
    const res = mediaService.validateImage(webpBuffer, 'image/webp');
    assert.equal(res.mimeType, 'image/webp');
    assert.equal(res.extension, 'webp');
  });

  test('should reject non-image file renamed to .jpg (magic bytes check)', () => {
    const fakeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00'); // Windows PE executable header
    assert.throws(
      () => mediaService.validateImage(fakeBuffer, 'image/jpeg'),
      BadRequestException
    );
  });

  test('should reject empty image buffer', () => {
    assert.throws(
      () => mediaService.validateImage(Buffer.alloc(0)),
      BadRequestException
    );
  });

  test('should reject image payload exceeding 5 MB limit', () => {
    const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 1);
    // Add JPEG magic bytes at start
    largeBuffer[0] = 0xff;
    largeBuffer[1] = 0xd8;
    largeBuffer[2] = 0xff;

    assert.throws(
      () => mediaService.validateImage(largeBuffer),
      PayloadTooLargeException
    );
  });

  test('should reject declared MIME type mismatch with actual magic bytes', () => {
    // Buffer is PNG, but client claims image/jpeg
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    assert.throws(
      () => mediaService.validateImage(pngBuffer, 'image/jpeg'),
      BadRequestException
    );
  });

  test('should reject directory traversal in catalog image delivery route', () => {
    const dummyRes: any = {
      setHeader: () => {},
      status: () => dummyRes,
      send: () => {},
    };

    assert.throws(
      () => mediaService.serveCatalogImage('../../../etc/passwd', dummyRes),
      BadRequestException
    );

    assert.throws(
      () => mediaService.serveCatalogImage('..\\..\\Windows\\System32\\cmd.exe', dummyRes),
      BadRequestException
    );

    assert.throws(
      () => mediaService.serveCatalogImage('private_kyc/doc.pdf', dummyRes),
      BadRequestException
    );
  });
});
