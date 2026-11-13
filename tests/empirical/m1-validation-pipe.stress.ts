import 'reflect-metadata';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { SendOtpDto } from '../../apps/api/dist/auth/dto/send-otp.dto.js';
import { VerifyOtpDto } from '../../apps/api/dist/auth/dto/verify-otp.dto.js';
import { RefreshTokenDto } from '../../apps/api/dist/auth/dto/refresh-token.dto.js';

describe('M1 Empirical Stress Test: ValidationPipe Adversarial Payloads', () => {
  let pipe: ValidationPipe;

  beforeEach(() => {
    pipe = new ValidationPipe({ whitelist: true, transform: true });
  });

  describe('2.1 Malformed Phone Number Payloads in SendOtpDto', () => {
    const malformedPhones = [
      { name: 'empty string', phone: '' },
      { name: 'missing country code', phone: '9876543210' },
      { name: 'starts with 1', phone: '+911234567890' },
      { name: 'starts with 5', phone: '+915999999999' },
      { name: '9 digits after +91', phone: '+91987654321' },
      { name: '11 digits after +91', phone: '+9198765432100' },
      { name: 'US country code', phone: '+14155552671' },
      { name: 'spaces in phone', phone: '+91 98765 43210' },
      { name: 'hyphens in phone', phone: '+91-9876543210' },
      { name: 'leading whitespace', phone: ' +919876543210' },
      { name: 'trailing whitespace', phone: '+919876543210 ' },
      { name: 'alphanumeric phone', phone: '+9198765abcde' },
      { name: 'number type instead of string', phone: 9876543210 },
      { name: 'boolean type', phone: true },
      { name: 'null value', phone: null },
      { name: 'array value', phone: ['+919876543210'] },
      { name: 'object value', phone: { number: '+919876543210' } },
    ];

    for (const testCase of malformedPhones) {
      it(`should reject ${testCase.name} with BadRequestException on SendOtpDto`, async () => {
        await assert.rejects(
          () => pipe.transform({ phone: testCase.phone }, { type: 'body', metatype: SendOtpDto }),
          (err: any) => {
            assert.ok(err instanceof BadRequestException, `Expected BadRequestException for ${testCase.name}`);
            const response = err.getResponse();
            assert.ok(response, 'Response body must exist');
            return true;
          }
        );
      });

      it(`should reject ${testCase.name} with BadRequestException on VerifyOtpDto`, async () => {
        await assert.rejects(
          () => pipe.transform({ phone: testCase.phone, code: '123456' }, { type: 'body', metatype: VerifyOtpDto }),
          (err: any) => {
            assert.ok(err instanceof BadRequestException, `Expected BadRequestException for ${testCase.name}`);
            return true;
          }
        );
      });
    }
  });

  describe('2.2 SQL and Script Injection Payloads', () => {
    const injectionPayloads = [
      { name: 'SQL Injection: simple tautology in phone', phone: "'+919876543210' OR '1'='1" },
      { name: 'SQL Injection: stacked query in phone', phone: '+919876543210; DROP TABLE users;--' },
      { name: 'SQL Injection: union select in phone', phone: "'+91' UNION SELECT * FROM users--" },
      { name: 'XSS: script tags in phone', phone: '+919876543210<script>alert(1)</script>' },
      { name: 'XSS: image onerror in phone', phone: '+919876543210" onerror="alert(1)' },
      { name: 'Shell Injection: command substitution in phone', phone: '+919876543210; $(whoami)' },
      { name: 'CRLF Injection in phone', phone: '+919876543210\r\nSet-Cookie: admin=true' },
    ];

    for (const testCase of injectionPayloads) {
      it(`should block ${testCase.name} at ValidationPipe with BadRequestException`, async () => {
        await assert.rejects(
          () => pipe.transform({ phone: testCase.phone }, { type: 'body', metatype: SendOtpDto }),
          (err: any) => {
            assert.ok(err instanceof BadRequestException);
            return true;
          }
        );
      });
    }

    const codeInjections = [
      { name: 'SQL tautology in code', code: "123456' OR '1'='1" },
      { name: 'XSS in code', code: '<script>' },
      { name: 'Stacked query in code', code: "'; DROP TABLE otp_logs;--" },
      { name: 'Alphabetical characters in code', code: 'abcdef' },
      { name: '5 digits (too short)', code: '12345' },
      { name: '7 digits (too long)', code: '1234567' },
      { name: 'Numeric negative value', code: '-12345' },
      { name: 'Float value', code: '1234.5' },
    ];

    for (const testCase of codeInjections) {
      it(`should block ${testCase.name} in verify OTP with BadRequestException`, async () => {
        await assert.rejects(
          () =>
            pipe.transform(
              { phone: '+919876543210', code: testCase.code },
              { type: 'body', metatype: VerifyOtpDto }
            ),
          (err: any) => {
            assert.ok(err instanceof BadRequestException);
            return true;
          }
        );
      });
    }
  });

  describe('2.3 Boundary Phone Numbers (Valid Format)', () => {
    const validPhones = [
      { name: 'lowest valid mobile (starts with 6)', phone: '+916000000000' },
      { name: 'highest valid mobile (starts with 9)', phone: '+919999999999' },
      { name: 'mid-range mobile (starts with 7)', phone: '+917000000000' },
      { name: 'mid-range mobile (starts with 8)', phone: '+918000000000' },
    ];

    for (const testCase of validPhones) {
      it(`should accept ${testCase.name} at ValidationPipe without throwing`, async () => {
        const transformed = await pipe.transform(
          { phone: testCase.phone },
          { type: 'body', metatype: SendOtpDto }
        );
        assert.strictEqual(transformed.phone, testCase.phone);
      });
    }
  });

  describe('2.4 Platform Enum Whitelist Validation in VerifyOtpDto', () => {
    it('should reject invalid platform with BadRequestException', async () => {
      await assert.rejects(
        () =>
          pipe.transform(
            { phone: '+919876543210', code: '123456', platform: 'WINDOWS_PHONE_HACK' },
            { type: 'body', metatype: VerifyOtpDto }
          ),
        (err: any) => {
          assert.ok(err instanceof BadRequestException);
          const res = err.getResponse() as any;
          assert.ok(
            JSON.stringify(res.message).includes('platform must be one of the following values')
          );
          return true;
        }
      );
    });

    it('should accept valid platform ANDROID', async () => {
      const res = await pipe.transform(
        { phone: '+919876543210', code: '123456', platform: 'ANDROID' },
        { type: 'body', metatype: VerifyOtpDto }
      );
      assert.strictEqual(res.platform, 'ANDROID');
    });

    it('should accept valid platform IOS', async () => {
      const res = await pipe.transform(
        { phone: '+919876543210', code: '123456', platform: 'IOS' },
        { type: 'body', metatype: VerifyOtpDto }
      );
      assert.strictEqual(res.platform, 'IOS');
    });

    it('should accept valid platform WEB', async () => {
      const res = await pipe.transform(
        { phone: '+919876543210', code: '123456', platform: 'WEB' },
        { type: 'body', metatype: VerifyOtpDto }
      );
      assert.strictEqual(res.platform, 'WEB');
    });
  });

  describe('2.5 RefreshTokenDto Validation', () => {
    it('should reject missing refreshToken with BadRequestException', async () => {
      await assert.rejects(
        () => pipe.transform({}, { type: 'body', metatype: RefreshTokenDto }),
        (err: any) => err instanceof BadRequestException
      );
    });

    it('should reject empty refreshToken string with BadRequestException', async () => {
      await assert.rejects(
        () => pipe.transform({ refreshToken: '' }, { type: 'body', metatype: RefreshTokenDto }),
        (err: any) => err instanceof BadRequestException
      );
    });

    it('should reject non-string refreshToken with BadRequestException', async () => {
      await assert.rejects(
        () => pipe.transform({ refreshToken: 123456 }, { type: 'body', metatype: RefreshTokenDto }),
        (err: any) => err instanceof BadRequestException
      );
    });
  });

  describe('2.6 Extra Fields Stripping via Whitelist', () => {
    it('should strip unwhitelisted fields from SendOtpDto', async () => {
      const payload = {
        phone: '+919876543210',
        deviceId: 'dev_valid_id',
        role: 'SUPER_ADMIN',
        isAdmin: true,
        bypassAuth: true,
        extraCredit: 1000000,
      };

      const transformed = await pipe.transform(payload, {
        type: 'body',
        metatype: SendOtpDto,
      });

      assert.strictEqual(transformed.phone, '+919876543210');
      assert.strictEqual(transformed.deviceId, 'dev_valid_id');
      assert.strictEqual((transformed as any).role, undefined);
      assert.strictEqual((transformed as any).isAdmin, undefined);
      assert.strictEqual((transformed as any).bypassAuth, undefined);
      assert.strictEqual((transformed as any).extraCredit, undefined);
    });

    it('should strip unwhitelisted fields from VerifyOtpDto', async () => {
      const payload = {
        phone: '+919876543210',
        code: '123456',
        platform: 'ANDROID',
        injectedSql: 'DROP TABLE users;',
        roles: ['ADMIN'],
      };

      const transformed = await pipe.transform(payload, {
        type: 'body',
        metatype: VerifyOtpDto,
      });

      assert.strictEqual(transformed.phone, '+919876543210');
      assert.strictEqual(transformed.code, '123456');
      assert.strictEqual(transformed.platform, 'ANDROID');
      assert.strictEqual((transformed as any).injectedSql, undefined);
      assert.strictEqual((transformed as any).roles, undefined);
    });

    it('should strip unwhitelisted fields from RefreshTokenDto', async () => {
      const payload = {
        refreshToken: 'valid-refresh-token-string',
        deviceId: 'dev_123',
        userId: 'injected_user_id',
        status: 'ACTIVE',
      };

      const transformed = await pipe.transform(payload, {
        type: 'body',
        metatype: RefreshTokenDto,
      });

      assert.strictEqual(transformed.refreshToken, 'valid-refresh-token-string');
      assert.strictEqual(transformed.deviceId, 'dev_123');
      assert.strictEqual((transformed as any).userId, undefined);
      assert.strictEqual((transformed as any).status, undefined);
    });
  });
});
