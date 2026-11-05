import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = path.resolve(import.meta.dirname, '../../');
const ADMIN_DIR = path.join(ROOT_DIR, 'apps/admin');

describe('Phase 1 Admin: Next.js Web Console Foundation & Security Guards', () => {
  describe('Workspace Scaffolding & Configuration', () => {
    it('should have a valid package.json with Next.js, React, and @allgo/common', () => {
      const pkgPath = path.join(ADMIN_DIR, 'package.json');
      assert.ok(fs.existsSync(pkgPath));
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      assert.strictEqual(pkg.name, '@allgo/admin');
      assert.strictEqual(pkg.dependencies['@allgo/common'], '*');
      assert.ok(pkg.dependencies['next']);
      assert.ok(pkg.dependencies['react']);
      assert.ok(pkg.dependencies['react-dom']);
    });

    it('should have valid Next.js and TypeScript configurations', () => {
      const tsconfigPath = path.join(ADMIN_DIR, 'tsconfig.json');
      const nextConfigPath = path.join(ADMIN_DIR, 'next.config.mjs');

      assert.ok(fs.existsSync(tsconfigPath));
      assert.ok(fs.existsSync(nextConfigPath));

      const nextConfig = fs.readFileSync(nextConfigPath, 'utf-8');
      assert.match(nextConfig, /NEXT_PUBLIC_API_URL/i);
    });
  });

  describe('API Client & Authentication Context (apps/admin/src/lib)', () => {
    it('should provide typed API client with X-AllGo-Role header', () => {
      const clientPath = path.join(ADMIN_DIR, 'src/lib/api-client.ts');
      assert.ok(fs.existsSync(clientPath));
      const content = fs.readFileSync(clientPath, 'utf-8');

      assert.match(content, /'X-AllGo-Role': 'ADMIN'/);
      assert.match(content, /sendOtp/);
      assert.match(content, /verifyOtp/);
      assert.match(content, /listUsers/);
      assert.match(content, /updateUserStatus/);
    });

    it('should provide AuthContext with session management and admin role verification', () => {
      const authPath = path.join(ADMIN_DIR, 'src/lib/auth-context.tsx');
      assert.ok(fs.existsSync(authPath));
      const content = fs.readFileSync(authPath, 'utf-8');

      assert.match(content, /user\?\.roles\?\.includes\('ADMIN'\)/);
      assert.match(content, /allgo_admin_token/);
      assert.match(content, /logout/);
    });
  });

  describe('Admin Screens & Protected Navigation (apps/admin/src/app)', () => {
    it('should implement phone OTP admin login page', () => {
      const loginPath = path.join(ADMIN_DIR, 'src/app/login/page.tsx');
      assert.ok(fs.existsSync(loginPath));
      const content = fs.readFileSync(loginPath, 'utf-8');

      assert.match(content, /Admin Phone Number/i);
      assert.match(content, /Enter 6-Digit OTP Code/i);
      assert.match(content, /adminApi\.sendOtp/);
      assert.match(content, /login/);
    });

    it('should enforce role-based access control in admin layout', () => {
      const layoutPath = path.join(ADMIN_DIR, 'src/app/admin/layout.tsx');
      assert.ok(fs.existsSync(layoutPath));
      const content = fs.readFileSync(layoutPath, 'utf-8');

      assert.match(content, /403 Forbidden: Insufficient Privileges/i);
      assert.match(content, /mandatory ADMIN role required/i);
      assert.match(content, /router\.replace\('\/login'\)/);
    });

    it('should implement user registry and account status administration', () => {
      const usersPath = path.join(ADMIN_DIR, 'src/app/admin/users/page.tsx');
      const detailPath = path.join(ADMIN_DIR, 'src/app/admin/users/[id]/page.tsx');

      assert.ok(fs.existsSync(usersPath));
      assert.ok(fs.existsSync(detailPath));

      const usersContent = fs.readFileSync(usersPath, 'utf-8');
      assert.match(usersContent, /adminApi\.listUsers/);
      assert.match(usersContent, /StatusBadge/);

      const detailContent = fs.readFileSync(detailPath, 'utf-8');
      assert.match(detailContent, /adminApi\.updateUserStatus/);
      assert.match(detailContent, /SUSPEND/);
      assert.match(detailContent, /BLOCK/);
      assert.match(detailContent, /Immediate Redis revocation enforced/i);
    });
  });
});
