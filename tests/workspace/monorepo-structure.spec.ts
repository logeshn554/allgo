import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, it } from 'node:test';
import { pathToFileURL } from 'node:url';

const ROOT_DIR = path.resolve(import.meta.dirname, '../../');
const COMMON_INDEX_PATH = path.join(ROOT_DIR, 'packages/common/src/index.ts');
const COMMON_MODULE_URL = pathToFileURL(COMMON_INDEX_PATH).href;

describe('Monorepo Structure & Core Workspace Scaffolding', () => {
  describe('Root Configuration', () => {
    it('should have a valid root package.json configured for pnpm and turbo', () => {
      const pkgPath = path.join(ROOT_DIR, 'package.json');
      assert.ok(fs.existsSync(pkgPath), 'package.json must exist at root');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      assert.strictEqual(pkg.private, true, 'root package.json must be private');
      assert.match(pkg.packageManager || '', /^pnpm@/, 'packageManager must use pnpm');
      assert.ok(pkg.devDependencies?.turbo, 'turbo must be in root devDependencies');
      assert.ok(
        pkg.devDependencies?.['@biomejs/biome'],
        '@biomejs/biome must be in root devDependencies',
      );
      assert.ok(pkg.devDependencies?.husky, 'husky must be in root devDependencies');
    });

    it('should configure pnpm-workspace.yaml with apps, services, and packages', () => {
      const pnpmWorkspacePath = path.join(ROOT_DIR, 'pnpm-workspace.yaml');
      assert.ok(fs.existsSync(pnpmWorkspacePath), 'pnpm-workspace.yaml must exist');
      const content = fs.readFileSync(pnpmWorkspacePath, 'utf-8');
      assert.match(content, /"apps\/\*"|apps\/\*/);
      assert.match(content, /"services\/\*"|services\/\*/);
      assert.match(content, /"packages\/\*"|packages\/\*/);
    });

    it('should have valid turbo.json, biome.json, and tsconfig.base.json', () => {
      assert.ok(fs.existsSync(path.join(ROOT_DIR, 'turbo.json')), 'turbo.json must exist');
      assert.ok(fs.existsSync(path.join(ROOT_DIR, 'biome.json')), 'biome.json must exist');
      const tsconfigPath = path.join(ROOT_DIR, 'tsconfig.base.json');
      assert.ok(fs.existsSync(tsconfigPath), 'tsconfig.base.json must exist');
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
      assert.ok(tsconfig.compilerOptions, 'compilerOptions must be defined in tsconfig.base.json');
    });

    it('should have grouped Dockerfiles, justfile, melos.yaml, and legacy cleanup applied', () => {
      for (const rel of [
        'justfile',
        'melos.yaml',
        'infrastructure/docker/node-service.Dockerfile',
        'infrastructure/docker/nextjs-app.Dockerfile',
        'infrastructure/docker/test-runner.Dockerfile',
        'packages/mobile_shared/pubspec.yaml',
        'apps/hub_mobile/pubspec.yaml',
      ]) {
        assert.ok(fs.existsSync(path.join(ROOT_DIR, rel)), `${rel} must exist`);
      }

      for (const removed of [
        'apps/mobile',
        'scratch',
        'Dockerfile.test-runner',
        'services/dispatch/Dockerfile',
        'apps/customer_mobile/.github',
      ]) {
        assert.strictEqual(
          fs.existsSync(path.join(ROOT_DIR, removed)),
          false,
          `${removed} must be removed`,
        );
      }
    });
  });

  describe('Workspace Packages, Services, and Apps Manifests', () => {
    const requiredPackages = [
      { dir: 'services/api', name: '@allgo/api', isAppOrService: true },
      { dir: 'services/dispatch', name: '@allgo/dispatch', isAppOrService: true },
      { dir: 'services/webhooks', name: '@allgo/webhooks', isAppOrService: true },
      { dir: 'apps/admin', name: '@allgo/admin', isAppOrService: true },
      { dir: 'apps/customer-web', name: '@allgo/customer-web', isAppOrService: true },
      { dir: 'apps/merchant-web', name: '@allgo/merchant-web', isAppOrService: true },
      { dir: 'apps/partner-web', name: '@allgo/partner-web', isAppOrService: true },
      { dir: 'apps/hub-web', name: '@allgo/hub-web', isAppOrService: true },
      { dir: 'packages/common', name: '@allgo/common', isAppOrService: false },
      { dir: 'packages/env', name: '@allgo/env', isAppOrService: false },
      { dir: 'packages/api-client', name: '@allgo/api-client', isAppOrService: false },
      { dir: 'packages/ui', name: '@allgo/ui', isAppOrService: false },
      {
        dir: 'packages/config-typescript',
        name: '@allgo/config-typescript',
        isAppOrService: false,
      },
    ];

    for (const pkgInfo of requiredPackages) {
      it(`should have package manifest for ${pkgInfo.name} at ${pkgInfo.dir}`, () => {
        const manifestPath = path.join(ROOT_DIR, pkgInfo.dir, 'package.json');
        assert.ok(fs.existsSync(manifestPath), `Manifest at ${manifestPath} must exist`);
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        assert.strictEqual(manifest.name, pkgInfo.name, `Package name must be ${pkgInfo.name}`);

        if (pkgInfo.isAppOrService) {
          assert.strictEqual(
            manifest.dependencies && manifest.dependencies['@allgo/common'],
            'workspace:*',
            `${pkgInfo.name} must depend on @allgo/common via pnpm "workspace:*"`,
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
          `OrderStatus.${status} must equal '${status}'`,
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
