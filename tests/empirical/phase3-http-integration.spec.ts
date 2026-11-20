import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../apps/api/dist/app.module.js';
import { DatabaseService } from '../../apps/api/dist/database/database.service.js';
import { ConfigService } from '../../apps/api/dist/config/config.service.js';

describe('Phase 3 Real HTTP Integration Suite (NestJS HTTP Server on Live PostgreSQL & Redis)', () => {
  let app: any;
  let baseUrl: string;
  let db: DatabaseService;
  const testPort = 4010;

  const merchantUserId = '00000000-0000-0000-0000-000000000041';
  const adminUserId = '00000000-0000-0000-0000-000000000099';
  const jwtSecret = process.env.JWT_SECRET || 'dev_insecure_jwt_secret_min_32_chars_long!';

  let merchantToken: string;
  let adminToken: string;
  let merchantId: string;
  let outletId: string;
  let categoryId: string;
  let createdProductId: string;

  let isLiveAvailable = false;
  before(async () => {
    try {
      const probeDb = new DatabaseService(new ConfigService());
      await probeDb.onModuleInit();
      await probeDb.query("SELECT 1;");
      await probeDb.onModuleDestroy();
      isLiveAvailable = true;
    } catch {
      isLiveAvailable = false;
    }
    if (!isLiveAvailable) {
      return;
    }

    // Bootstrap NestJS application
    app = await NestFactory.create(AppModule, { logger: false });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.listen(testPort);
    baseUrl = `http://127.0.0.1:${testPort}`;

    db = app.get(DatabaseService);
    const configService = app.get(ConfigService);

    // Generate valid tokens using actual application JWT secret
    merchantToken = jwt.sign(
      { userId: merchantUserId, roles: ['MERCHANT_ADMIN', 'CUSTOMER'], status: 'ACTIVE' },
      configService.jwtSecret,
      { expiresIn: '1h' }
    );
    adminToken = jwt.sign(
      { userId: adminUserId, roles: ['ADMIN'], status: 'ACTIVE' },
      configService.jwtSecret,
      { expiresIn: '1h' }
    );

    // Seed test users and assign authoritative roles
    await db.query(`
      INSERT INTO users (id, phone, full_name, status, firebase_uid)
      VALUES 
        ('${merchantUserId}', '+919876540001', 'HTTP Test Merchant Owner', 'ACTIVE', 'fb-http-merch-1'),
        ('${adminUserId}', '+919876540099', 'HTTP Test Admin', 'ACTIVE', 'fb-http-admin-1')
      ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE';

      INSERT INTO user_roles (user_id, role_id)
      SELECT '${merchantUserId}', id FROM roles WHERE name IN ('MERCHANT', 'MERCHANT_ADMIN')
      ON CONFLICT DO NOTHING;

      INSERT INTO user_roles (user_id, role_id)
      SELECT '${adminUserId}', id FROM roles WHERE name = 'ADMIN'
      ON CONFLICT DO NOTHING;
    `);

    // Clean previous records in reverse dependency order
    try {
      await db.query(`DELETE FROM outlet_item_overrides WHERE outlet_id IN (SELECT id FROM outlets WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id = '${merchantUserId}'));`);
      await db.query(`DELETE FROM outlet_operating_hours WHERE outlet_id IN (SELECT id FROM outlets WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id = '${merchantUserId}'));`);
      await db.query(`DELETE FROM item_options WHERE option_group_id IN (SELECT id FROM item_option_groups WHERE item_id IN (SELECT id FROM items WHERE category_id IN (SELECT id FROM categories WHERE catalog_id IN (SELECT id FROM catalogs WHERE outlet_id IN (SELECT id FROM outlets WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id = '${merchantUserId}'))))));`);
      await db.query(`DELETE FROM item_option_groups WHERE item_id IN (SELECT id FROM items WHERE category_id IN (SELECT id FROM categories WHERE catalog_id IN (SELECT id FROM catalogs WHERE outlet_id IN (SELECT id FROM outlets WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id = '${merchantUserId}')))));`);
      await db.query(`DELETE FROM item_variants WHERE item_id IN (SELECT id FROM items WHERE category_id IN (SELECT id FROM categories WHERE catalog_id IN (SELECT id FROM catalogs WHERE outlet_id IN (SELECT id FROM outlets WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id = '${merchantUserId}')))));`);
      await db.query(`DELETE FROM inventory WHERE outlet_id IN (SELECT id FROM outlets WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id = '${merchantUserId}'));`);
      await db.query(`DELETE FROM items WHERE category_id IN (SELECT id FROM categories WHERE catalog_id IN (SELECT id FROM catalogs WHERE outlet_id IN (SELECT id FROM outlets WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id = '${merchantUserId}'))));`);
      await db.query(`DELETE FROM categories WHERE catalog_id IN (SELECT id FROM catalogs WHERE outlet_id IN (SELECT id FROM outlets WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id = '${merchantUserId}')));`);
      await db.query(`DELETE FROM catalogs WHERE outlet_id IN (SELECT id FROM outlets WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id = '${merchantUserId}'));`);
      await db.query(`DELETE FROM outlets WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id = '${merchantUserId}');`);
      await db.query(`DELETE FROM merchants WHERE owner_id = '${merchantUserId}';`);
    } catch (e) {
      console.error('Cleanup error:', e);
    }

    const merchRes = await db.query(
      `INSERT INTO merchants (owner_id, business_name, trade_name, merchant_type, pan_number, status)
       VALUES ($1, 'Royal Coastal Kitchen', 'Royal Coastal', 'RESTAURANT', 'ABCDE9999K', 'APPROVED')
       RETURNING id;`,
      [merchantUserId]
    );
    merchantId = merchRes.rows[0].id;

    const zoneRes = await db.query('SELECT id FROM zones LIMIT 1;');
    const zoneId = zoneRes.rows[0].id;

    const outletRes = await db.query(
      `INSERT INTO outlets (
         merchant_id, zone_id, outlet_name, address_line1, postal_code,
         location, phone, outlet_status, is_open
       ) VALUES ($1, $2, 'Royal Coastal Marina', 'Marina Beach Road', '600004', ST_SetSRID(ST_MakePoint(80.28, 13.04), 4326), '+919876540001', 'ACTIVE', TRUE)
       RETURNING id;`,
      [merchantId, zoneId]
    );
    outletId = outletRes.rows[0].id;

    try {
      const catRes = await db.query(
        `INSERT INTO catalogs (outlet_id, name, vertical_type, is_active)
         VALUES ($1, 'Royal Coastal Catalog', 'FOOD', TRUE)
         RETURNING id;`,
        [outletId]
      );
      const catalogId = catRes.rows[0].id;

      const categoryRes = await db.query(
        `INSERT INTO categories (catalog_id, name, display_order, is_active)
         VALUES ($1, 'Seafood Specialties', 1, TRUE)
         RETURNING id;`,
        [catalogId]
      );
      categoryId = categoryRes.rows[0].id;
      console.log('Seed SUCCESS: outletId =', outletId, 'categoryId =', categoryId);
    } catch (err: any) {
      console.error('Error in catalog/category seed:', err);
    }
  });

  after(async () => {
    if (!isLiveAvailable) { return; }
    try {
      await db.query(`DELETE FROM outlet_item_overrides WHERE outlet_id = '${outletId}';`);
      await db.query(`DELETE FROM outlet_operating_hours WHERE outlet_id = '${outletId}';`);
      await db.query(`DELETE FROM item_options WHERE option_group_id IN (SELECT id FROM item_option_groups WHERE item_id IN (SELECT id FROM items WHERE category_id = '${categoryId}'));`);
      await db.query(`DELETE FROM item_option_groups WHERE item_id IN (SELECT id FROM items WHERE category_id = '${categoryId}');`);
      await db.query(`DELETE FROM item_variants WHERE item_id IN (SELECT id FROM items WHERE category_id = '${categoryId}');`);
      await db.query(`DELETE FROM inventory WHERE outlet_id = '${outletId}';`);
      await db.query(`DELETE FROM items WHERE category_id = '${categoryId}';`);
      await db.query(`DELETE FROM categories WHERE id = '${categoryId}';`);
      await db.query(`DELETE FROM catalogs WHERE outlet_id = '${outletId}';`);
      await db.query(`DELETE FROM outlets WHERE id = '${outletId}';`);
      await db.query(`DELETE FROM merchants WHERE id = '${merchantId}';`);
    } catch {}
    if (app) {
      await app.close();
    }
  });

  // ==========================================
  // 1. Merchant HTTP Endpoints
  // ==========================================

  it('HTTP 1. POST /v1/merchants/outlets/:outletId/products should create product with validation', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip("Live PostgreSQL & Redis socket unreachable in sandbox");
      return;
    }
    const res = await fetch(`${baseUrl}/v1/merchants/outlets/${outletId}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${merchantToken}`,
        'X-AllGo-Role': 'MERCHANT_ADMIN',
      },
      body: JSON.stringify({
        name: 'Tawa Fried King Fish',
        categoryId,
        description: 'Fresh king fish steak marinated in coastal spices and shallow-fried',
        basePriceInr: 450.0,
        salePriceInr: 420.0,
        sku: 'FISH-TWA-001',
        isVeg: false,
        preparationTimeMinutes: 25,
        stockQuantity: 20,
      }),
    });

    const text = await res.text();
    assert.strictEqual(res.status, 201, `Failed to create product: ${text}`);
    const body = JSON.parse(text);
    assert.ok(body.id);
    assert.strictEqual(body.name, 'Tawa Fried King Fish');
    assert.strictEqual(body.basePriceInr, 450.0);
    assert.strictEqual(body.salePriceInr, 420.0);
    createdProductId = body.id;
  });

  it('HTTP 2. POST /v1/merchants/products/:id/variants should add variant to product', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip("Live PostgreSQL & Redis socket unreachable in sandbox");
      return;
    }
    const res = await fetch(`${baseUrl}/v1/merchants/products/${createdProductId}/variants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${merchantToken}`,
        'X-AllGo-Role': 'MERCHANT_ADMIN',
      },
      body: JSON.stringify({
        variantName: 'Double Portion (2 Steaks)',
        additionalPriceInr: 380.0,
        variantType: 'PORTION',
      }),
    });

    const text = await res.text();
    assert.strictEqual(res.status, 201, `Failed to create product: ${text}`);
    const body = JSON.parse(text);
    assert.ok(body.id);
    assert.strictEqual(body.variant_name, 'Double Portion (2 Steaks)');
    assert.strictEqual(body.additionalPriceInr, 380.0);
  });

  it('HTTP 3. PUT /v1/merchants/outlets/:outletId/operating-hours should configure schedule', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip("Live PostgreSQL & Redis socket unreachable in sandbox");
      return;
    }
    const res = await fetch(`${baseUrl}/v1/merchants/outlets/${outletId}/operating-hours`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${merchantToken}`,
        'X-AllGo-Role': 'MERCHANT_ADMIN',
      },
      body: JSON.stringify({
        intervals: [
          { dayOfWeek: 1, openTime: '11:00:00', closeTime: '23:00:00' },
          { dayOfWeek: 2, openTime: '11:00:00', closeTime: '23:00:00' },
          { dayOfWeek: 3, openTime: '11:00:00', closeTime: '23:00:00' },
          { dayOfWeek: 4, openTime: '11:00:00', closeTime: '23:00:00' },
          { dayOfWeek: 5, openTime: '11:00:00', closeTime: '23:00:00' },
          { dayOfWeek: 6, openTime: '11:00:00', closeTime: '23:00:00' },
          { dayOfWeek: 0, openTime: '11:00:00', closeTime: '23:00:00' },
        ],
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.length, 7);
  });

  // ==========================================
  // 2. Customer HTTP Endpoints
  // ==========================================

  it('HTTP 4. GET /v1/customer/outlets should list active outlets with calculated isOpen', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip("Live PostgreSQL & Redis socket unreachable in sandbox");
      return;
    }
    const res = await fetch(`${baseUrl}/v1/customer/outlets`);
    assert.strictEqual(res.status, 200);
    const outlets = await res.json();
    assert.ok(Array.isArray(outlets));
    const target = outlets.find((o: any) => o.id === outletId);
    assert.ok(target, 'Active test outlet must be returned to customer');
    assert.strictEqual(typeof target.isOpen, 'boolean');
    assert.strictEqual(target.outletName, 'Royal Coastal Marina');
  });

  it('HTTP 5. GET /v1/customer/outlets/:outletId/products should return active approved products', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip("Live PostgreSQL & Redis socket unreachable in sandbox");
      return;
    }
    const res = await fetch(`${baseUrl}/v1/customer/outlets/${outletId}/products`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.items);
    assert.ok(body.total >= 1);
    const fish = body.items.find((p: any) => p.id === createdProductId);
    assert.ok(fish);
    assert.strictEqual(fish.name, 'Tawa Fried King Fish');
    assert.strictEqual(fish.effectivePriceInr, 420.0);
  });

  it('HTTP 6. GET /v1/customer/products/:productId should return product with variants', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip("Live PostgreSQL & Redis socket unreachable in sandbox");
      return;
    }
    const res = await fetch(`${baseUrl}/v1/customer/products/${createdProductId}?outletId=${outletId}`);
    assert.strictEqual(res.status, 200);
    const prod = await res.json();
    assert.strictEqual(prod.id, createdProductId);
    assert.strictEqual(prod.variants.length, 1);
    assert.strictEqual(prod.variants[0].variantName, 'Double Portion (2 Steaks)');
  });

  // ==========================================
  // 3. Admin HTTP Moderation Endpoints
  // ==========================================

  it('HTTP 7. POST /v1/admin/catalog/products/:id/moderate should moderate product with reason', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip("Live PostgreSQL & Redis socket unreachable in sandbox");
      return;
    }
    // 1. Reject
    const rejectRes = await fetch(`${baseUrl}/v1/admin/catalog/products/${createdProductId}/moderate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
        'X-AllGo-Role': 'ADMIN',
      },
      body: JSON.stringify({
        adminStatus: 'REJECTED',
        rejectionReason: 'Image does not meet quality guidelines',
      }),
    });
    assert.strictEqual(rejectRes.status, 201);
    const rejectedBody = await rejectRes.json();
    assert.strictEqual(rejectedBody.admin_status, 'REJECTED');

    // 2. Customer browse must now hide the rejected product
    const custRes = await fetch(`${baseUrl}/v1/customer/outlets/${outletId}/products`);
    const custBody = await custRes.json();
    const hidden = custBody.items.find((p: any) => p.id === createdProductId);
    assert.strictEqual(hidden, undefined, 'Rejected product must not be exposed to customers');

    // 3. Approve back
    const approveRes = await fetch(`${baseUrl}/v1/admin/catalog/products/${createdProductId}/moderate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
        'X-AllGo-Role': 'ADMIN',
      },
      body: JSON.stringify({
        adminStatus: 'APPROVED',
      }),
    });
    assert.strictEqual(approveRes.status, 201);
  });
});
