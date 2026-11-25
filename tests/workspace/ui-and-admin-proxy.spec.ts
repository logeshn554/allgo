import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, it } from 'node:test';

const ROOT_DIR = path.resolve(import.meta.dirname, '../../');
const ADMIN_DIR = path.join(ROOT_DIR, 'apps/admin');
const UI_DIR = path.join(ROOT_DIR, 'packages/ui');

describe('Next.js Proxy, Route Groups & Shared UI Package (@allgo/ui)', () => {
  describe('apps/admin/proxy.ts conventions and configuration', () => {
    it('should have proxy.ts exporting default function and named proxy export', () => {
      const proxyPath = path.join(ADMIN_DIR, 'proxy.ts');
      assert.ok(fs.existsSync(proxyPath), 'proxy.ts must exist at apps/admin/proxy.ts');
      const content = fs.readFileSync(proxyPath, 'utf-8');

      assert.match(
        content,
        /export default function proxy\(/,
        'Must have default export proxy function',
      );
      assert.match(content, /export\s*\{\s*proxy\s*\}/, 'Must have named proxy export');
      assert.match(content, /export const config\s*=/, 'Must export config object');
      assert.match(
        content,
        /matcher:\s*\[[^\]]*['"]\/admin\/:path\*['"]/,
        'Must match /admin/:path* routes',
      );
    });

    it('should implement route protection redirecting to /login with redirect query param', () => {
      const proxyPath = path.join(ADMIN_DIR, 'proxy.ts');
      const content = fs.readFileSync(proxyPath, 'utf-8');

      assert.match(content, /request\.cookies\.get\(['"]allgo_admin_token['"]\)/);
      assert.match(content, /request\.cookies\.get\(['"]allgo_admin_role['"]\)/);
      assert.match(content, /NextResponse\.redirect/);
      assert.match(content, /loginUrl\.searchParams\.set\(['"]redirect['"]/);
    });

    it('should have no deprecated middleware.ts file in apps/admin', () => {
      const middlewarePath = path.join(ADMIN_DIR, 'middleware.ts');
      assert.strictEqual(
        fs.existsSync(middlewarePath),
        false,
        'middleware.ts should not exist in apps/admin',
      );
    });
  });

  describe('apps/admin/app Route Groups Layout & Structure', () => {
    it('should have (auth) route group with dedicated layout and login page', () => {
      const authLayout = path.join(ADMIN_DIR, 'app/(auth)/layout.tsx');
      const loginPage = path.join(ADMIN_DIR, 'app/(auth)/login/page.tsx');

      assert.ok(fs.existsSync(authLayout), 'app/(auth)/layout.tsx must exist');
      assert.ok(fs.existsSync(loginPage), 'app/(auth)/login/page.tsx must exist');

      const loginContent = fs.readFileSync(loginPage, 'utf-8');
      assert.match(loginContent, /LoginCard/, 'Login page must render LoginCard component');

      const loginCardPath = path.join(ADMIN_DIR, 'components/auth/LoginCard.tsx');
      assert.ok(fs.existsSync(loginCardPath), 'components/auth/LoginCard.tsx must exist');
      const loginCardContent = fs.readFileSync(loginCardPath, 'utf-8');
      assert.match(
        loginCardContent,
        /from '@allgo\/ui'/,
        'LoginCard must import components from @allgo/ui',
      );
    });

    it('should have (admin) route group with dedicated layout enforcing auth and role guard', () => {
      const adminLayout = path.join(ADMIN_DIR, 'app/(admin)/layout.tsx');
      assert.ok(fs.existsSync(adminLayout), 'app/(admin)/layout.tsx must exist');

      const layoutContent = fs.readFileSync(adminLayout, 'utf-8');
      assert.match(layoutContent, /403 Forbidden/, 'Admin layout must enforce 403 screen');
      assert.match(layoutContent, /AdminShell/, 'Admin layout must render AdminShell');

      const shellPath = path.join(ADMIN_DIR, 'components/AdminShell.tsx');
      assert.ok(fs.existsSync(shellPath), 'components/AdminShell.tsx must exist');
      const shellContent = fs.readFileSync(shellPath, 'utf-8');
      assert.match(shellContent, /SidebarProvider/, 'AdminShell must include SidebarProvider');
      assert.match(shellContent, /AppSidebar/, 'AdminShell must render AppSidebar');
      assert.match(shellContent, /Header/, 'AdminShell must render Header');
    });

    it('should contain all required admin sub-routes inside (admin)/admin/', () => {
      const requiredRoutes = [
        'dashboard',
        'orders',
        'dispatch',
        'merchants',
        'partners',
        'parcels',
        'mobility',
        'zones',
        'users',
        'finance',
        'support',
        'ratings',
        'catalog',
      ];

      for (const route of requiredRoutes) {
        const pagePath = path.join(ADMIN_DIR, `app/(admin)/admin/${route}/page.tsx`);
        assert.ok(
          fs.existsSync(pagePath),
          `Route page must exist: app/(admin)/admin/${route}/page.tsx`,
        );
      }
    });
  });

  describe('packages/ui Design System & Theme Reusability', () => {
    it('should have valid package.json with @allgo/ui and proper exports', () => {
      const pkgPath = path.join(UI_DIR, 'package.json');
      assert.ok(fs.existsSync(pkgPath), 'packages/ui/package.json must exist');

      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      assert.strictEqual(pkg.name, '@allgo/ui');
      assert.ok(pkg.exports['.'], 'Must export root "."');
      assert.ok(pkg.exports['./theme'], 'Must export "./theme"');
      assert.ok(pkg.exports['./icons'], 'Must export "./icons"');
      assert.ok(pkg.exports['./styles.css'], 'Must export "./styles.css"');
    });

    it('should export all essential UI components', () => {
      const indexPath = path.join(UI_DIR, 'src/index.ts');
      assert.ok(fs.existsSync(indexPath));
      const content = fs.readFileSync(indexPath, 'utf-8');

      const components = [
        'button',
        'card',
        'badge',
        'dialog',
        'sidebar',
        'table',
        'tabs',
        'input',
        'avatar',
        'status-badge',
        'separator',
        'tooltip',
      ];

      for (const comp of components) {
        assert.match(
          content,
          new RegExp(`export \\* from './components/${comp}'`),
          `Must re-export component: ${comp}`,
        );
      }
    });

    it('should export theme tokens and ThemeProvider', () => {
      const themeIndexPath = path.join(UI_DIR, 'src/theme/index.ts');
      assert.ok(fs.existsSync(themeIndexPath));
      const content = fs.readFileSync(themeIndexPath, 'utf-8');

      assert.match(content, /colors/);
      assert.match(content, /theme-provider/);

      const colorsPath = path.join(UI_DIR, 'src/theme/colors.ts');
      const colorsContent = fs.readFileSync(colorsPath, 'utf-8');
      assert.match(colorsContent, /allgoTheme/);
      assert.match(colorsContent, /brand/);
      assert.match(colorsContent, /verticals/);
    });

    it('should export HugeiconsIcon and icon components', () => {
      const iconsPath = path.join(UI_DIR, 'src/icons/index.ts');
      assert.ok(fs.existsSync(iconsPath));
      const content = fs.readFileSync(iconsPath, 'utf-8');

      assert.match(content, /HugeiconsIcon/);
      assert.match(content, /@hugeicons\/core-free-icons/);
    });

    it('should have apps/admin depend on @allgo/ui and transpile it', () => {
      const adminPkgPath = path.join(ADMIN_DIR, 'package.json');
      const adminPkg = JSON.parse(fs.readFileSync(adminPkgPath, 'utf-8'));
      assert.strictEqual(
        adminPkg.dependencies['@allgo/ui'],
        'workspace:*',
        'apps/admin must depend on @allgo/ui',
      );

      const nextConfigPath = path.join(ADMIN_DIR, 'next.config.ts');
      const nextConfigContent = fs.readFileSync(nextConfigPath, 'utf-8');
      assert.match(nextConfigContent, /@allgo\/ui/, 'next.config.ts must transpile @allgo/ui');
    });
  });
});
