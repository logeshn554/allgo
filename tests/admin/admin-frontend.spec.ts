import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const ROOT_DIR = path.resolve(import.meta.dirname, '../../');
const ADMIN_DIR = path.join(ROOT_DIR, 'apps/admin');

describe('Phase 1 Admin: Next.js Web Console Foundation & Security Guards', () => {
  describe('Workspace Scaffolding & Configuration', () => {
    it('should have a valid package.json with Next.js, React, and @allgo/* workspace packages', () => {
      const pkgPath = path.join(ADMIN_DIR, 'package.json');
      assert.ok(fs.existsSync(pkgPath));
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      assert.strictEqual(pkg.name, '@allgo/admin');
      assert.strictEqual(pkg.dependencies['@allgo/common'], 'workspace:*');
      assert.strictEqual(pkg.dependencies['@allgo/api-client'], 'workspace:*');
      assert.strictEqual(pkg.dependencies['@allgo/env'], 'workspace:*');
      assert.strictEqual(pkg.dependencies['@allgo/ui'], 'workspace:*');
      assert.ok(pkg.dependencies['next']);
      assert.ok(pkg.dependencies['react']);
      assert.ok(pkg.dependencies['react-dom']);
    });

    it('should have valid Next.js and TypeScript configurations', () => {
      const tsconfigPath = path.join(ADMIN_DIR, 'tsconfig.json');
      const nextConfigPath = path.join(ADMIN_DIR, 'next.config.ts');

      assert.ok(fs.existsSync(tsconfigPath));
      assert.ok(fs.existsSync(nextConfigPath));

      const nextConfig = fs.readFileSync(nextConfigPath, 'utf-8');
      assert.match(nextConfig, /NEXT_PUBLIC_API_URL/i);
    });
  });

  describe('API Client & Authentication Context (apps/admin/lib & data/api)', () => {
    it('should provide typed API client with X-AllGo-Role header via @allgo/api-client', () => {
      const baseClientPath = path.join(ADMIN_DIR, 'data/api/base-client.ts');
      const facadePath = path.join(ADMIN_DIR, 'lib/api-client.ts');
      assert.ok(fs.existsSync(baseClientPath));
      assert.ok(fs.existsSync(facadePath));

      const baseContent = fs.readFileSync(baseClientPath, 'utf-8');
      assert.match(baseContent, /@allgo\/api-client/);
      assert.match(baseContent, /'X-AllGo-Role':\s*'ADMIN'/);

      const facadeContent = fs.readFileSync(facadePath, 'utf-8');
      assert.match(facadeContent, /sendOtp/);
      assert.match(facadeContent, /verifyOtp/);
      assert.match(facadeContent, /listUsers/);
      assert.match(facadeContent, /updateUserStatus/);
    });

    it('should provide AuthContext with session management', () => {
      const authPath = path.join(ADMIN_DIR, 'lib/auth-context.tsx');
      assert.ok(fs.existsSync(authPath));
      const content = fs.readFileSync(authPath, 'utf-8');
      assert.match(content, /AuthProvider|useAuth/);
    });
  });

  describe('Admin Screens & Protected Navigation (apps/admin/app)', () => {
    it('should implement phone OTP admin login page', () => {
      const loginPath = path.join(ADMIN_DIR, 'app/(auth)/login/page.tsx');
      const loginCardPath = path.join(ADMIN_DIR, 'components/auth/LoginCard.tsx');
      const useLoginFlowPath = path.join(ADMIN_DIR, 'components/auth/use-login-flow.ts');
      assert.ok(fs.existsSync(loginPath));
      assert.ok(fs.existsSync(loginCardPath));
      assert.ok(fs.existsSync(useLoginFlowPath));
      const cardContent = fs.readFileSync(loginCardPath, 'utf-8');
      assert.match(cardContent, /OtpVerifyStep/);
      assert.match(cardContent, /useLoginFlow/);
      const flowContent = fs.readFileSync(useLoginFlowPath, 'utf-8');
      assert.match(flowContent, /authApi/);
    });

    it('should enforce role-based access control in admin layout', () => {
      const layoutPath = path.join(ADMIN_DIR, 'app/(admin)/layout.tsx');
      assert.ok(fs.existsSync(layoutPath));
      const content = fs.readFileSync(layoutPath, 'utf-8');

      assert.match(content, /403 Forbidden/i);
      assert.match(content, /mandatory ADMIN role required/i);
      assert.match(content, /redirect\(['"]\/login['"]\)/);
    });

    it('should enforce server-side route protection via Next.js proxy.ts', () => {
      const proxyPath = path.join(ADMIN_DIR, 'proxy.ts');
      assert.ok(fs.existsSync(proxyPath));
      const content = fs.readFileSync(proxyPath, 'utf-8');

      assert.match(content, /pathname\.startsWith\('\/admin'\)/);
      assert.match(content, /allgo_admin_token/);
      assert.match(content, /NextResponse\.redirect/);
      assert.match(content, /matcher:\s*\[[^\]]*'\/admin\/:path\*'/);
    });

    it('should implement user registry and account status administration', () => {
      const usersPath = path.join(ADMIN_DIR, 'app/(admin)/admin/users/page.tsx');
      const detailPath = path.join(ADMIN_DIR, 'app/(admin)/admin/users/[id]/page.tsx');

      assert.ok(fs.existsSync(usersPath));
      assert.ok(fs.existsSync(detailPath));

      const usersContent = fs.readFileSync(usersPath, 'utf-8');
      assert.match(usersContent, /adminApi/);
      assert.match(usersContent, /StatusBadge/);

      const detailContent = fs.readFileSync(detailPath, 'utf-8');
      assert.match(detailContent, /updateUserStatus|assignRole|revokeRole/);
    });
  });

  describe('Phase 2 Admin: Merchant Onboarding & Compliance Review Console', () => {
    it('should provide typed API client methods for merchant administration', () => {
      const clientPath = path.join(ADMIN_DIR, 'data/api/merchants.api.ts');
      assert.ok(fs.existsSync(clientPath));
      const content = fs.readFileSync(clientPath, 'utf-8');

      assert.match(content, /listMerchants/);
      assert.match(content, /getMerchant/);
      assert.match(content, /updateMerchantStatus/);
      assert.match(content, /\/v1\/admin\/merchants/);
    });

    it('should include Merchant Approvals in navigation sidebar', () => {
      const sidebarPath = path.join(ADMIN_DIR, 'components/app-sidebar.tsx');
      assert.ok(fs.existsSync(sidebarPath));
      const content = fs.readFileSync(sidebarPath, 'utf-8');

      assert.match(content, /Merchant/i);
      assert.match(content, /\/admin\/merchants/);
    });

    it('should implement merchant applications list and dossier review screens', () => {
      const listPath = path.join(ADMIN_DIR, 'app/(admin)/admin/merchants/page.tsx');
      const dossierPath = path.join(ADMIN_DIR, 'app/(admin)/admin/merchants/[id]/page.tsx');
      assert.ok(fs.existsSync(listPath));
      assert.ok(fs.existsSync(dossierPath));
    });
  });

  describe('Phase 2 Admin: Partner Onboarding & Independent Services Review Console', () => {
    it('should provide typed API client methods for partner administration', () => {
      const clientPath = path.join(ADMIN_DIR, 'data/api/partners.api.ts');
      assert.ok(fs.existsSync(clientPath));
      const content = fs.readFileSync(clientPath, 'utf-8');

      assert.match(content, /listPartners/);
      assert.match(content, /updatePartnerStatus/);
      assert.match(content, /updatePartnerServiceStatus/);
      assert.match(content, /\/v1\/admin\/partners/);
    });

    it('should include Partner Approvals in navigation sidebar', () => {
      const sidebarPath = path.join(ADMIN_DIR, 'components/app-sidebar.tsx');
      assert.ok(fs.existsSync(sidebarPath));
      const content = fs.readFileSync(sidebarPath, 'utf-8');

      assert.match(content, /Partner/i);
      assert.match(content, /\/admin\/partners/);
    });

    it('should implement partner queue and dossier screens', () => {
      const listPath = path.join(ADMIN_DIR, 'app/(admin)/admin/partners/page.tsx');
      const dossierPath = path.join(ADMIN_DIR, 'app/(admin)/admin/partners/[id]/page.tsx');
      assert.ok(fs.existsSync(listPath));
      assert.ok(fs.existsSync(dossierPath));
    });
  });
});
