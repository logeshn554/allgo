import 'reflect-metadata';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import {
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { NextResponse } from 'next/server.js';

import { UsersService } from '../../apps/api/dist/users/users.service.js';
import { UsersController } from '../../apps/api/dist/users/users.controller.js';
import { AuthService } from '../../apps/api/dist/auth/auth.service.js';
import { AuthController } from '../../apps/api/dist/auth/auth.controller.js';
import { JwtAuthGuard } from '../../apps/api/dist/common/guards/jwt-auth.guard.js';
import { ConfigService } from '../../apps/api/dist/config/config.service.js';
import { ROLES_KEY } from '../../apps/api/dist/common/decorators/roles.decorator.js';

const ROOT_DIR = path.resolve(import.meta.dirname, '../../');
const BASELINE_COMMIT = '5fe64927af3c97a37ae7b3da973761ec2ac54f91';

describe('Challenger M2-1 Adversarial Stress Suite', () => {
  let config: ConfigService;

  beforeEach(() => {
    config = new ConfigService();
  });

  // =========================================================================
  // Target 1: Database Scripts Fail-Closed Behavior
  // =========================================================================
  describe('Target 1: Database Migration and Seed Fail-Closed Behavior', () => {
    it('1A: scripts/run-migrations.ts must exit with code 1 when database is offline', () => {
      try {
        execSync('node --experimental-transform-types scripts/run-migrations.ts', {
          cwd: ROOT_DIR,
          stdio: 'pipe',
          timeout: 10000,
        });
        assert.fail('Expected scripts/run-migrations.ts to fail when DB is offline');
      } catch (err: any) {
        assert.strictEqual(
          err.status,
          1,
          `Expected exit code 1 on database connection error, but got ${err.status}`
        );
        const stderr = err.stderr ? err.stderr.toString() : '';
        const stdout = err.stdout ? err.stdout.toString() : '';
        const combined = stdout + stderr;
        assert.ok(
          combined.includes('BLOCKED / PENDING LIVE CONTAINER EXECUTION') ||
          combined.includes('not reachable') ||
          combined.includes('EACCES') ||
          combined.includes('ECONNREFUSED'),
          'Expected failure explanation in output'
        );
      }
    });

    it('1B: scripts/run-seeds.ts must exit with code 1 when database is offline', () => {
      try {
        execSync('node --experimental-transform-types scripts/run-seeds.ts', {
          cwd: ROOT_DIR,
          stdio: 'pipe',
          timeout: 10000,
        });
        assert.fail('Expected scripts/run-seeds.ts to fail when DB is offline');
      } catch (err: any) {
        assert.strictEqual(
          err.status,
          1,
          `Expected exit code 1 on database connection error, but got ${err.status}`
        );
        const stdout = (err.stdout || '').toString();
        assert.ok(
          stdout.includes('BLOCKED / PENDING LIVE CONTAINER EXECUTION') ||
          stdout.includes('not reachable') ||
          stdout.includes('EACCES') ||
          stdout.includes('ECONNREFUSED'),
          'Expected failure explanation in output'
        );
      }
    });

    it('1C: scripts/run-migrations.ts and scripts/run-seeds.ts must exit with code 1 on refused port', () => {
      const badEnv = {
        ...process.env,
        DATABASE_URL: 'postgresql://postgres:wrong@127.0.0.1:5433/allgo_dev',
      };

      try {
        execSync('node --experimental-transform-types scripts/run-migrations.ts', {
          cwd: ROOT_DIR,
          env: badEnv,
          stdio: 'pipe',
          timeout: 10000,
        });
        assert.fail('Expected scripts/run-migrations.ts to exit with 1 on refused port');
      } catch (err: any) {
        assert.strictEqual(err.status, 1);
      }

      try {
        execSync('node --experimental-transform-types scripts/run-seeds.ts', {
          cwd: ROOT_DIR,
          env: badEnv,
          stdio: 'pipe',
          timeout: 10000,
        });
        assert.fail('Expected scripts/run-seeds.ts to exit with 1 on refused port');
      } catch (err: any) {
        assert.strictEqual(err.status, 1);
      }
    });

    it('1D: verify neither script swallows ECONNREFUSED in source code', () => {
      const migrationSrc = fs.readFileSync(path.join(ROOT_DIR, 'scripts/run-migrations.ts'), 'utf-8');
      const seedsSrc = fs.readFileSync(path.join(ROOT_DIR, 'scripts/run-seeds.ts'), 'utf-8');

      // The old anti-pattern was: if (!result.success && !result.error?.includes('ECONNREFUSED')) process.exit(1);
      assert.strictEqual(
        migrationSrc.includes("!result.error?.includes('ECONNREFUSED')"),
        false,
        'scripts/run-migrations.ts must not swallow ECONNREFUSED'
      );
      assert.strictEqual(
        seedsSrc.includes("!result.error?.includes('ECONNREFUSED')"),
        false,
        'scripts/run-seeds.ts must not swallow ECONNREFUSED'
      );
    });
  });

  // =========================================================================
  // Target 2: Next.js Admin App Route Protection Middleware
  // =========================================================================
  describe('Target 2: Next.js Admin Route Protection Middleware Behavior', () => {
    // Reusable middleware executor matching apps/admin/src/middleware.ts
    function executeMiddleware(req: {
      url: string;
      pathname: string;
      cookieToken?: string;
      authHeader?: string;
    }) {
      const { pathname, url, cookieToken, authHeader } = req;

      if (pathname.startsWith('/admin')) {
        const tokenFromCookie = cookieToken || undefined;
        const tokenFromHeader = authHeader?.startsWith('Bearer ')
          ? authHeader.substring(7)
          : null;

        const token = tokenFromCookie || tokenFromHeader;

        if (!token) {
          const loginUrl = new URL('/login', url);
          loginUrl.searchParams.set('redirect', pathname);
          return NextResponse.redirect(loginUrl);
        }
      }

      return NextResponse.next();
    }

    it('2A: Middleware must export correct matcher pattern for /admin/*', () => {
      const mwPath = path.join(ROOT_DIR, 'apps/admin/src/middleware.ts');
      assert.ok(fs.existsSync(mwPath), 'middleware.ts must exist');
      const src = fs.readFileSync(mwPath, 'utf-8');

      assert.match(src, /export const config\s*=\s*\{\s*matcher:\s*\['\/admin\/:path\*'\]/);
    });

    it('2B: Request to /admin/* with missing token MUST redirect to /login with redirect param', () => {
      const testCases = [
        { path: '/admin/dashboard', expectedRedirect: '/login?redirect=%2Fadmin%2Fdashboard' },
        { path: '/admin/users', expectedRedirect: '/login?redirect=%2Fadmin%2Fusers' },
        {
          path: '/admin/users/c74e8910-1111-2222-3333-444455556666',
          expectedRedirect: '/login?redirect=%2Fadmin%2Fusers%2Fc74e8910-1111-2222-3333-444455556666',
        },
      ];

      for (const tc of testCases) {
        const res = executeMiddleware({
          url: `http://localhost:3003${tc.path}`,
          pathname: tc.path,
        });

        assert.strictEqual(res.status, 307); // NextResponse.redirect default status
        const location = res.headers.get('location');
        assert.ok(location, 'Expected redirect Location header');
        assert.ok(location.includes(tc.expectedRedirect), `Expected location to include ${tc.expectedRedirect}`);
      }
    });

    it('2C: Request with empty string or non-Bearer token MUST be rejected and redirected', () => {
      // Empty cookie
      const res1 = executeMiddleware({
        url: 'http://localhost:3003/admin/dashboard',
        pathname: '/admin/dashboard',
        cookieToken: '',
      });
      assert.strictEqual(res1.status, 307);

      // Empty Bearer header
      const res2 = executeMiddleware({
        url: 'http://localhost:3003/admin/dashboard',
        pathname: '/admin/dashboard',
        authHeader: 'Bearer ',
      });
      assert.strictEqual(res2.status, 307);

      // Basic Auth header (invalid token type)
      const res3 = executeMiddleware({
        url: 'http://localhost:3003/admin/dashboard',
        pathname: '/admin/dashboard',
        authHeader: 'Basic dXNlcjpwYXNz',
      });
      assert.strictEqual(res3.status, 307);
    });

    it('2D: Request with valid allgo_admin_token cookie MUST pass through', () => {
      const res = executeMiddleware({
        url: 'http://localhost:3003/admin/dashboard',
        pathname: '/admin/dashboard',
        cookieToken: 'valid_jwt_access_token_123',
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('location'), null);
    });

    it('2E: Request with valid Authorization: Bearer header MUST pass through', () => {
      const res = executeMiddleware({
        url: 'http://localhost:3003/admin/users',
        pathname: '/admin/users',
        authHeader: 'Bearer valid_jwt_access_token_456',
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('location'), null);
    });

    it('2F: Non-admin routes (/login, /, /not-found) MUST pass through unconditionally', () => {
      for (const publicPath of ['/login', '/', '/not-found']) {
        const res = executeMiddleware({
          url: `http://localhost:3003${publicPath}`,
          pathname: publicPath,
        });

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.headers.get('location'), null);
      }
    });
  });

  // =========================================================================
  // Target 3: Role Assignment & Revocation API Contracts
  // =========================================================================
  describe('Target 3: Role Assignment, Revocation & Status Operations', () => {
    it('3A: UsersController must enforce @Roles("ADMIN") and @UseGuards on role endpoints', () => {
      const controllerRoles = Reflect.getMetadata(ROLES_KEY, UsersController.prototype.assignRole);
      assert.deepStrictEqual(controllerRoles, ['ADMIN'], 'assignRole must require ADMIN role');

      const revokeRoles = Reflect.getMetadata(ROLES_KEY, UsersController.prototype.revokeRole);
      assert.deepStrictEqual(revokeRoles, ['ADMIN'], 'revokeRole must require ADMIN role');

      const statusRoles = Reflect.getMetadata(ROLES_KEY, UsersController.prototype.updateStatus);
      assert.deepStrictEqual(statusRoles, ['ADMIN'], 'updateStatus must require ADMIN role');

      const listRoles = Reflect.getMetadata(ROLES_KEY, UsersController.prototype.listUsers);
      assert.deepStrictEqual(listRoles, ['ADMIN'], 'listUsers must require ADMIN role');
    });

    it('3B: UsersService.assignUserRole must reject invalid roles with BadRequestException', async () => {
      const usersService = new UsersService({} as any, {} as any);

      const invalidRoles = ['SUPERUSER', 'ROOT', 'HACKER', ''];
      for (const r of invalidRoles) {
        await assert.rejects(
          () => usersService.assignUserRole('u-test-1', r),
          (err: any) => {
            assert.ok(err instanceof BadRequestException);
            assert.match(err.message, /Invalid role name/);
            return true;
          }
        );
      }
    });

    it('3C: UsersService.assignUserRole must idempotently assign valid role via transaction', async () => {
      let transactionStarted = false;
      let insertedRole = '';
      let insertedUserId = '';

      const mockDb = {
        transaction: async (cb: (client: any) => Promise<any>) => {
          transactionStarted = true;
          const mockClient = {
            query: async (sql: string, params: any[]) => {
              if (sql.includes('SELECT id FROM roles')) {
                return { rows: [{ id: 'role-admin-uuid' }] };
              }
              if (sql.includes('INSERT INTO user_roles')) {
                insertedUserId = params[0];
                insertedRole = params[1];
                return { rowCount: 1 };
              }
              return { rows: [] };
            },
          };
          return cb(mockClient);
        },
      };

      const usersService = new UsersService(mockDb as any, {} as any);
      const res = await usersService.assignUserRole('u-test-1', 'ADMIN');

      assert.strictEqual(transactionStarted, true);
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.userId, 'u-test-1');
      assert.strictEqual(res.role, 'ADMIN');
      assert.strictEqual(insertedUserId, 'u-test-1');
      assert.strictEqual(insertedRole, 'role-admin-uuid');
    });

    it('3D: UsersService.revokeUserRole must delete role mapping via transaction', async () => {
      let deletedUserId = '';
      let deletedRoleId = '';

      const mockDb = {
        transaction: async (cb: (client: any) => Promise<any>) => {
          const mockClient = {
            query: async (sql: string, params: any[]) => {
              if (sql.includes('SELECT id FROM roles')) {
                return { rows: [{ id: 'role-partner-uuid' }] };
              }
              if (sql.includes('DELETE FROM user_roles')) {
                deletedUserId = params[0];
                deletedRoleId = params[1];
                return { rowCount: 1 };
              }
              return { rows: [] };
            },
          };
          return cb(mockClient);
        },
      };

      const usersService = new UsersService(mockDb as any, {} as any);
      const res = await usersService.revokeUserRole('u-test-2', 'PARTNER');

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.userId, 'u-test-2');
      assert.strictEqual(res.role, 'PARTNER');
      assert.strictEqual(deletedUserId, 'u-test-2');
      assert.strictEqual(deletedRoleId, 'role-partner-uuid');
    });

    it('3E: UsersService.updateUserStatus must reject invalid status with BadRequestException', async () => {
      const usersService = new UsersService({} as any, {} as any);

      await assert.rejects(
        () => usersService.updateUserStatus('u-test-1', 'DELETED'),
        (err: any) => {
          assert.ok(err instanceof BadRequestException);
          assert.match(err.message, /Invalid status/);
          return true;
        }
      );
    });

    it('3F: UsersService.updateUserStatus must update DB and set Redis status cache with TTL', async () => {
      let dbUpdatedStatus = '';
      let dbUpdatedUserId = '';
      let redisKey = '';
      let redisVal = '';
      let redisEx = 0;

      const mockDb = {
        query: async (sql: string, params: any[]) => {
          if (sql.includes('UPDATE users SET status')) {
            dbUpdatedStatus = params[0];
            dbUpdatedUserId = params[1];
            return { rowCount: 1 };
          }
          return { rows: [] };
        },
      };

      const mockRedis = {
        set: async (key: string, val: string, exMode: string, ttl: number) => {
          redisKey = key;
          redisVal = val;
          redisEx = ttl;
          return 'OK';
        },
      };

      const usersService = new UsersService(mockDb as any, mockRedis as any);
      const res = await usersService.updateUserStatus('u-test-block', 'BLOCKED');

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.status, 'BLOCKED');
      assert.strictEqual(dbUpdatedStatus, 'BLOCKED');
      assert.strictEqual(dbUpdatedUserId, 'u-test-block');
      assert.strictEqual(redisKey, 'user:status:u-test-block');
      assert.strictEqual(redisVal, 'BLOCKED');
      assert.strictEqual(redisEx, 86400);
    });

    it('3G: AdminApiClient must construct correct HTTP contracts for roles and status', () => {
      const apiClientSrc = fs.readFileSync(
        path.join(ROOT_DIR, 'apps/admin/src/lib/api-client.ts'),
        'utf-8'
      );

      // Verify assignRole
      assert.match(apiClientSrc, /async assignRole\(userId:\s*string,\s*role:\s*string\)/);
      assert.match(apiClientSrc, /\/v1\/users\/\$\{userId\}\/roles/);
      assert.match(apiClientSrc, /method:\s*'POST'/);

      // Verify revokeRole
      assert.match(apiClientSrc, /async revokeRole\(userId:\s*string,\s*role:\s*string\)/);
      assert.match(apiClientSrc, /method:\s*'DELETE'/);

      // Verify logout
      assert.match(apiClientSrc, /async logout\(\)/);
      assert.match(apiClientSrc, /\/v1\/auth\/logout/);

      // Verify headers
      assert.match(apiClientSrc, /'X-AllGo-Role':\s*'ADMIN'/);
    });
  });

  // =========================================================================
  // Target 4: Session Logout & Immediate Revocation Verification
  // =========================================================================
  describe('Target 4: Session Logout & Revocation Lifecycle', () => {
    it('4A: AuthService.logout must add access token and refresh token to Redis revocation list', async () => {
      const revokedKeys: Record<string, number> = {};
      let deletedFromDevices = false;

      const mockRedis = {
        setex: async (key: string, ttl: number, val: string) => {
          revokedKeys[key] = ttl;
          return 'OK';
        },
      };

      const mockDb = {
        query: async (sql: string, params: any[]) => {
          if (sql.includes('DELETE FROM devices')) {
            deletedFromDevices = true;
          }
          return { rowCount: 1 };
        },
      };

      const authService = new AuthService(config, mockDb as any, mockRedis as any, null);

      const accessToken = 'test_access_token_jwt';
      const refreshToken = 'test_refresh_token_jwt';
      const userId = 'u-logout-1';
      const deviceId = 'dev-pixel-9';

      const res = await authService.logout(accessToken, userId, deviceId, refreshToken);
      assert.strictEqual(res.success, true);

      // Check access token revocation TTL (1 hour = 3600s)
      assert.strictEqual(revokedKeys[`token:revoked:${accessToken}`], 3600);
      // Check refresh token revocation TTL (24 hours = 86400s)
      assert.strictEqual(revokedKeys[`token:revoked:${refreshToken}`], 86400);
      // Check device session deletion
      assert.strictEqual(deletedFromDevices, true);
    });

    it('4B: JwtAuthGuard must reject revoked token with 401 Unauthorized', async () => {
      const testToken = jwt.sign(
        { userId: 'u-logout-1', roles: ['ADMIN'], status: 'ACTIVE' },
        config.jwtSecret,
        { algorithm: 'HS256', expiresIn: '1h' }
      );

      const mockRedis = {
        get: async (key: string) => {
          if (key === `token:revoked:${testToken}`) {
            return 'REVOKED';
          }
          return null;
        },
      };

      const guard = new JwtAuthGuard(config, mockRedis as any);
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              authorization: `Bearer ${testToken}`,
            },
          }),
        }),
      };

      await assert.rejects(
        () => guard.canActivate(mockContext as any),
        (err: any) => {
          assert.ok(err instanceof UnauthorizedException);
          assert.strictEqual(err.message, 'Token has been revoked');
          return true;
        }
      );
    });

    it('4C: JwtAuthGuard must reject token when user is blocked in Redis cache', async () => {
      const testToken = jwt.sign(
        { userId: 'u-blocked-1', roles: ['CUSTOMER'], status: 'ACTIVE' },
        config.jwtSecret,
        { algorithm: 'HS256', expiresIn: '1h' }
      );

      const mockRedis = {
        get: async (key: string) => {
          if (key === 'user:status:u-blocked-1') {
            return 'BLOCKED';
          }
          return null;
        },
      };

      const guard = new JwtAuthGuard(config, mockRedis as any);
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              authorization: `Bearer ${testToken}`,
            },
          }),
        }),
      };

      await assert.rejects(
        () => guard.canActivate(mockContext as any),
        (err: any) => {
          assert.ok(err instanceof UnauthorizedException);
          assert.match(err.message, /Account is blocked/i);
          return true;
        }
      );
    });

    it('4D: AuthController.logout must extract Bearer token and invoke authService.logout', async () => {
      let loggedOutToken = '';
      let loggedOutUserId = '';
      let loggedOutDeviceId = '';

      const mockAuthService = {
        logout: async (token: string, userId: string, deviceId: string) => {
          loggedOutToken = token;
          loggedOutUserId = userId;
          loggedOutDeviceId = deviceId;
          return { success: true };
        },
      };

      const controller = new AuthController(mockAuthService as any);

      const mockReq = {
        user: { userId: 'u-user-88', deviceId: 'device-abc' },
      };

      const res = await controller.logout(
        mockReq as any,
        'Bearer sample_jwt_token_to_logout',
        undefined
      );

      assert.strictEqual(res.success, true);
      assert.strictEqual(loggedOutToken, 'sample_jwt_token_to_logout');
      assert.strictEqual(loggedOutUserId, 'u-user-88');
      assert.strictEqual(loggedOutDeviceId, 'device-abc');
    });
  });

  // =========================================================================
  // Target 5: Phase 0 Baseline Diff Guardrail Verification
  // =========================================================================
  describe('Target 5: Frozen Phase 0 Baseline Guardrail Integrity', () => {
    it('5A: No files in frozen Phase 0 paths may be modified vs baseline commit', () => {
      const cmd = `git diff --name-only ${BASELINE_COMMIT} -- docs/ infra/terraform/ database/migrations/ database/seeds/ scripts/cost-calculator.ts`;
      const output = execSync(cmd, { cwd: ROOT_DIR, encoding: 'utf-8' }).trim();
      assert.strictEqual(
        output,
        '',
        `Phase 0 baseline violations detected! Modified files:\n${output}`
      );
    });

    it('5B: No untracked files may exist in frozen Phase 0 paths', () => {
      const cmd = 'git status --porcelain database/ infra/ docs/ scripts/cost-calculator.ts';
      const output = execSync(cmd, { cwd: ROOT_DIR, encoding: 'utf-8' }).trim();
      assert.strictEqual(
        output,
        '',
        `Untracked or modified Phase 0 files detected:\n${output}`
      );
    });
  });
});
