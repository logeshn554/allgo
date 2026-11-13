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

    it('should enforce server-side route protection via Next.js middleware', () => {
      const middlewarePath = path.join(ADMIN_DIR, 'src/middleware.ts');
      assert.ok(fs.existsSync(middlewarePath));
      const content = fs.readFileSync(middlewarePath, 'utf-8');

      assert.match(content, /pathname\.startsWith\('\/admin'\)/);
      assert.match(content, /allgo_admin_token/);
      assert.match(content, /NextResponse\.redirect/);
      assert.match(content, /matcher:\s*\['\/admin\/:path\*'\]/);
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
      assert.match(detailContent, /adminApi\.assignRole/);
      assert.match(detailContent, /adminApi\.revokeRole/);
      assert.match(detailContent, /SUSPEND/);
      assert.match(detailContent, /BLOCK/);
      assert.match(detailContent, /Immediate Redis revocation enforced/i);
    });
  });

  describe('Phase 2 Admin: Merchant Onboarding & Compliance Review Console', () => {
    it('should provide typed API client methods for merchant administration', () => {
      const clientPath = path.join(ADMIN_DIR, 'src/lib/api-client.ts');
      const content = fs.readFileSync(clientPath, 'utf-8');

      assert.match(content, /listMerchants/);
      assert.match(content, /getMerchant/);
      assert.match(content, /updateMerchantStatus/);
      assert.match(content, /\/v1\/admin\/merchants/);
    });

    it('should include Merchant Approvals in navigation sidebar', () => {
      const sidebarPath = path.join(ADMIN_DIR, 'src/components/Sidebar.tsx');
      assert.ok(fs.existsSync(sidebarPath));
      const content = fs.readFileSync(sidebarPath, 'utf-8');

      assert.match(content, /Merchant Approvals/);
      assert.match(content, /\/admin\/merchants/);
    });

    it('should implement merchant applications list screen with status filters', () => {
      const listPath = path.join(ADMIN_DIR, 'src/app/admin/merchants/page.tsx');
      assert.ok(fs.existsSync(listPath));
      const content = fs.readFileSync(listPath, 'utf-8');

      assert.match(content, /Merchant Onboarding Applications/i);
      assert.match(content, /adminApi\.listMerchants/);
      assert.match(content, /SUBMITTED/);
      assert.match(content, /UNDER_REVIEW/);
      assert.match(content, /DOCUMENTS_REQUIRED/);
      assert.match(content, /APPROVED/);
      assert.match(content, /REJECTED/);
    });

    it('should implement comprehensive merchant dossier review with compliance actions', () => {
      const dossierPath = path.join(ADMIN_DIR, 'src/app/admin/merchants/[id]/page.tsx');
      assert.ok(fs.existsSync(dossierPath));
      const content = fs.readFileSync(dossierPath, 'utf-8');

      assert.match(content, /adminApi\.getMerchant/);
      assert.match(content, /adminApi\.updateMerchantStatus/);
      assert.match(content, /FSSAI Food License Number/i);
      assert.match(content, /Permanent Account Number \(PAN\)/i);
      assert.match(content, /Bank Settlement Account/i);
      assert.match(content, /Approve & Activate Merchant/i);
      assert.match(content, /Reject Application/i);
      assert.match(content, /Request Additional Documents/i);
      assert.match(content, /Suspend Merchant/i);
      assert.match(content, /Reactivate Suspended Merchant/i);
    });
  });

  describe('Phase 2 Admin: Partner Onboarding & Independent Services Review Console', () => {
    it('should provide typed API client methods for partner administration', () => {
      const clientPath = path.join(ADMIN_DIR, 'src/lib/api-client.ts');
      const content = fs.readFileSync(clientPath, 'utf-8');

      assert.match(content, /listPartners/);
      assert.match(content, /updatePartnerStatus/);
      assert.match(content, /updatePartnerServiceStatus/);
      assert.match(content, /\/v1\/admin\/partners/);
    });

    it('should include Partner Approvals in navigation sidebar', () => {
      const sidebarPath = path.join(ADMIN_DIR, 'src/components/Sidebar.tsx');
      assert.ok(fs.existsSync(sidebarPath));
      const content = fs.readFileSync(sidebarPath, 'utf-8');

      assert.match(content, /Partner Approvals/);
      assert.match(content, /\/admin\/partners/);
    });

    it('should implement partner queue screen with status filters', () => {
      const listPath = path.join(ADMIN_DIR, 'src/app/admin/partners/page.tsx');
      assert.ok(fs.existsSync(listPath));
      const content = fs.readFileSync(listPath, 'utf-8');

      assert.match(content, /Partner Onboarding & KYC Queue/i);
      assert.match(content, /adminApi\.listPartners/);
      assert.match(content, /DOCS_SUBMITTED/);
      assert.match(content, /UNDER_REVIEW/);
      assert.match(content, /APPROVED/);
    });

    it('should implement partner dossier with independent service category controls', () => {
      const dossierPath = path.join(ADMIN_DIR, 'src/app/admin/partners/[id]/page.tsx');
      assert.ok(fs.existsSync(dossierPath));
      const content = fs.readFileSync(dossierPath, 'utf-8');

      assert.match(content, /adminApi\.updatePartnerStatus/);
      assert.match(content, /adminApi\.updatePartnerServiceStatus/);
      assert.match(content, /Independent Service Category Applications/i);
      assert.match(content, /Each service application must be approved independently/i);
      assert.match(content, /AES-256 Encrypted/i);
      assert.match(content, /Approve Partner Account/i);
      assert.match(content, /Request Additional Documents/i);
      assert.match(content, /Reject Application/i);
      assert.match(content, /Suspend Account/i);
    });
  });
});

