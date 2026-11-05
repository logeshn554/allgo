import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT_DIR = path.resolve(import.meta.dirname, '../../');
const COMMON_INDEX_PATH = path.join(ROOT_DIR, 'packages/common/src/index.ts');
const COMMON_MODULE_URL = pathToFileURL(COMMON_INDEX_PATH).href;

describe('Monorepo Structure & Core Workspace Scaffolding', () => {
  describe('Root Configuration', () => {
    it('should have a valid root package.json with workspaces configured', () => {
      const pkgPath = path.join(ROOT_DIR, 'package.json');
      assert.ok(fs.existsSync(pkgPath), 'package.json must exist at root');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      assert.strictEqual(pkg.private, true, 'root package.json must be private');
      assert.ok(Array.isArray(pkg.workspaces), 'workspaces must be defined as an array');
      assert.ok(pkg.workspaces.includes('apps/*'), 'workspaces must include apps/*');
      assert.ok(pkg.workspaces.includes('packages/*'), 'workspaces must include packages/*');
    });

    it('should have a valid pnpm-workspace.yaml referencing apps and packages', () => {
      const pnpmWorkspacePath = path.join(ROOT_DIR, 'pnpm-workspace.yaml');
      assert.ok(fs.existsSync(pnpmWorkspacePath), 'pnpm-workspace.yaml must exist');
      const content = fs.readFileSync(pnpmWorkspacePath, 'utf-8');
      assert.match(content, /apps\/\*/, 'pnpm-workspace.yaml must include apps/*');
      assert.match(content, /packages\/\*/, 'pnpm-workspace.yaml must include packages/*');
    });

    it('should have a valid tsconfig.base.json', () => {
      const tsconfigPath = path.join(ROOT_DIR, 'tsconfig.base.json');
      assert.ok(fs.existsSync(tsconfigPath), 'tsconfig.base.json must exist');
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
      assert.ok(tsconfig.compilerOptions, 'compilerOptions must be defined in tsconfig.base.json');
    });
  });

  describe('Workspace Packages and Apps Manifests', () => {
    const requiredPackages = [
      { dir: 'apps/api', name: '@allgo/api' },
      { dir: 'apps/dispatch', name: '@allgo/dispatch' },
      { dir: 'apps/webhooks', name: '@allgo/webhooks' },
      { dir: 'apps/admin', name: '@allgo/admin' },
      { dir: 'packages/common', name: '@allgo/common' },
    ];

    for (const pkgInfo of requiredPackages) {
      it(`should have package manifest for ${pkgInfo.name} at ${pkgInfo.dir}`, () => {
        const manifestPath = path.join(ROOT_DIR, pkgInfo.dir, 'package.json');
        assert.ok(fs.existsSync(manifestPath), `Manifest at ${manifestPath} must exist`);
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        assert.strictEqual(manifest.name, pkgInfo.name, `Package name must be ${pkgInfo.name}`);

        if (pkgInfo.dir.startsWith('apps/')) {
          assert.ok(
            manifest.dependencies && manifest.dependencies['@allgo/common'],
            `${pkgInfo.name} must depend on @allgo/common`
          );
        } else if (pkgInfo.dir === 'packages/common') {
          assert.ok(manifest.main, '@allgo/common must define main');
          assert.ok(manifest.types, '@allgo/common must define types');
        }
      });
    }
  });

  describe('@allgo/common Domain Enums & Language Specifications', () => {
    it('should export VerticalType with all defined verticals', async () => {
      assert.ok(fs.existsSync(COMMON_INDEX_PATH), 'packages/common/src/index.ts must exist');
      const common = await import(COMMON_MODULE_URL);

      assert.ok(common.VerticalType, 'VerticalType enum must be exported');
      assert.strictEqual(common.VerticalType.FOOD, 'FOOD');
      assert.strictEqual(common.VerticalType.GROCERY, 'GROCERY');
      assert.strictEqual(common.VerticalType.PARCEL, 'PARCEL');
      assert.strictEqual(common.VerticalType.RIDE, 'RIDE');
      assert.strictEqual(common.VerticalType.HIRE_DRIVER, 'HIRE_DRIVER');
      assert.strictEqual(common.VerticalType.HOME_MADE, 'HOME_MADE');
    });

    it('should export OrderStatus with full lifecycle states', async () => {
      assert.ok(fs.existsSync(COMMON_INDEX_PATH), 'packages/common/src/index.ts must exist');
      const common = await import(COMMON_MODULE_URL);
      assert.ok(common.OrderStatus, 'OrderStatus enum must be exported');
      const expectedStatuses = [
        'CART',
        'PLACED',
        'PAYMENT_CONFIRMED',
        'MERCHANT_ACCEPTED',
        'PREPARING',
        'READY',
        'PARTNER_ASSIGNED',
        'PARTNER_AT_STORE',
        'PICKED_UP',
        'OUT_FOR_DELIVERY',
        'ARRIVED',
        'DELIVERED',
        'CANCELLED',
        'REFUNDED',
        'FAILED',
      ];
      for (const status of expectedStatuses) {
        assert.strictEqual(
          common.OrderStatus[status],
          status,
          `OrderStatus.${status} must equal '${status}'`
        );
      }
    });

    it('should export FulfillmentMode with SEPARATE and DELIVER_TOGETHER', async () => {
      assert.ok(fs.existsSync(COMMON_INDEX_PATH), 'packages/common/src/index.ts must exist');
      const common = await import(COMMON_MODULE_URL);
      assert.ok(common.FulfillmentMode, 'FulfillmentMode enum must be exported');
      assert.strictEqual(common.FulfillmentMode.SEPARATE, 'SEPARATE');
      assert.strictEqual(common.FulfillmentMode.DELIVER_TOGETHER, 'DELIVER_TOGETHER');
    });

    it('should export SupportedLanguages with en, ta, and hi', async () => {
      assert.ok(fs.existsSync(COMMON_INDEX_PATH), 'packages/common/src/index.ts must exist');
      const common = await import(COMMON_MODULE_URL);
      assert.ok(common.SupportedLanguages, 'SupportedLanguages must be exported');
      assert.strictEqual(common.SupportedLanguages.EN, 'en');
      assert.strictEqual(common.SupportedLanguages.TA, 'ta');
      assert.strictEqual(common.SupportedLanguages.HI, 'hi');

      assert.ok(common.LAUNCH_LANGUAGES, 'LAUNCH_LANGUAGES must be exported');
      assert.deepStrictEqual(Array.from(common.LAUNCH_LANGUAGES), ['en', 'ta']);

      assert.ok(common.NEXT_LANGUAGES, 'NEXT_LANGUAGES must be exported');
      assert.deepStrictEqual(Array.from(common.NEXT_LANGUAGES), ['hi']);
    });
  });
});
