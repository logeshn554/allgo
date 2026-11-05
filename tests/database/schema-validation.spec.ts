import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT_DIR = path.resolve(import.meta.dirname, '../../');
const DB_DIR = path.join(ROOT_DIR, 'database');
const MIGRATIONS_DIR = path.join(DB_DIR, 'migrations');
const SEEDS_DIR = path.join(DB_DIR, 'seeds');

describe('Database Schema, PostGIS Migrations & Dev Seed Validation', () => {
  describe('File Existence', () => {
    const requiredFiles = [
      'migrations/001_initial_schema.sql',
      'migrations/002_postgis_indexes.sql',
      'seeds/dev_seed_chennai.sql',
      'schema.prisma',
    ];

    for (const relPath of requiredFiles) {
      it(`should have file: database/${relPath}`, () => {
        const filePath = path.join(DB_DIR, relPath);
        assert.ok(fs.existsSync(filePath), `database/${relPath} must exist`);
      });
    }
  });

  describe('database/migrations/001_initial_schema.sql DDL Completeness', () => {
    it('should create required PostgreSQL extensions and core tables', () => {
      const filePath = path.join(MIGRATIONS_DIR, '001_initial_schema.sql');
      assert.ok(fs.existsSync(filePath), '001_initial_schema.sql must exist');
      const sql = fs.readFileSync(filePath, 'utf-8');

      // PostGIS and UUID extension
      assert.match(sql, /CREATE\s+EXTENSION\s+(IF\s+NOT\s+EXISTS\s+)?["']?postgis["']?/i, 'Must enable PostGIS extension');
      assert.match(sql, /CREATE\s+EXTENSION\s+(IF\s+NOT\s+EXISTS\s+)?["']?uuid-ossp["']?|gen_random_uuid\(\)/i, 'Must support UUID generation');

      // Required core tables
      const expectedTables = [
        'users',
        'roles',
        'user_roles',
        'devices',
        'addresses',
        'states',
        'cities',
        'city_settings',
        'zones',
        'waitlist_entries',
        'merchants',
        'outlets',
        'catalogs',
        'categories',
        'items',
        'item_translations',
        'item_variants',
        'inventory',
        'inventory_reservations',
        'partners',
        'vehicles',
        'partner_documents',
        'partner_modes',
        'partner_jobs',
        'partner_location_history',
        'carts',
        'cart_items',
        'checkout_sessions',
        'order_groups',
        'sub_orders',
        'order_items',
        'order_events',
        'delivery_legs',
        'delivery_leg_stops',
        'wallets',
        'ledger_entries',
        'payments',
        'refunds',
        'discount_allocations',
        'refund_allocations',
        'payouts',
        'tax_rules',
        'tax_invoices',
        'ratings',
        'coupons',
        'support_tickets',
        'audit_logs',
      ];

      for (const table of expectedTables) {
        const tablePattern = new RegExp(`CREATE\\s+TABLE\\s+(IF\\s+NOT\\s+EXISTS\\s+)?["']?${table}["']?\\s*\\(`, 'i');
        assert.match(sql, tablePattern, `Must create table "${table}"`);
      }
    });

    it('should configure PostGIS spatial types on zones, outlets, and partner locations', () => {
      const filePath = path.join(MIGRATIONS_DIR, '001_initial_schema.sql');
      const sql = fs.readFileSync(filePath, 'utf-8');

      assert.match(sql, /geometry\s*\(\s*Polygon\s*(,\s*4326\s*)?\)/i, 'zones table must use PostGIS Polygon geometry with SRID 4326');
      assert.match(sql, /geometry\s*\(\s*Point\s*(,\s*4326\s*)?\)/i, 'outlets and partner location history must use PostGIS Point geometry with SRID 4326');
    });

    it('should implement Section 5A order hierarchy, Section 5B jobs, and double-entry ledger constraints', () => {
      const filePath = path.join(MIGRATIONS_DIR, '001_initial_schema.sql');
      const sql = fs.readFileSync(filePath, 'utf-8');

      // Section 5A hierarchy: order_groups -> sub_orders -> delivery_legs
      assert.match(sql, /order_groups/i, 'Order hierarchy must include order_groups');
      assert.match(sql, /sub_orders/i, 'Order hierarchy must include sub_orders');
      assert.match(sql, /delivery_legs/i, 'Order hierarchy must include delivery_legs');
      assert.match(sql, /delivery_leg_stops/i, 'Delivery legs must include delivery_leg_stops');

      // Fulfillment modes
      assert.match(sql, /SEPARATE/i, 'Must support Mode A SEPARATE fulfillment');
      assert.match(sql, /DELIVER_TOGETHER/i, 'Must support Mode B DELIVER_TOGETHER fulfillment');

      // Section 5B partner feed
      assert.match(sql, /partner_jobs/i, 'Must support generic partner_jobs feed');

      // Bilingual item translations table
      assert.match(sql, /item_translations/i, 'Must have item_translations table');
      assert.match(sql, /language_code/i, 'item_translations must have language_code column');

      // Double-entry ledger table structure
      assert.match(sql, /ledger_entries/i, 'Must have double-entry ledger_entries table');
      assert.match(sql, /credit|debit/i, 'Ledger entries must support credit and debit operations');

      // Dynamic tax engine tables
      assert.match(sql, /tax_rules/i, 'Must have dynamic tax_rules table');
      assert.match(sql, /tax_invoices/i, 'Must have tax_invoices table');
    });
  });

  describe('database/migrations/002_postgis_indexes.sql Index Coverage', () => {
    it('should define GiST spatial indexes and performance composite btree indexes', () => {
      const filePath = path.join(MIGRATIONS_DIR, '002_postgis_indexes.sql');
      assert.ok(fs.existsSync(filePath), '002_postgis_indexes.sql must exist');
      const sql = fs.readFileSync(filePath, 'utf-8');

      // GiST spatial indexes
      assert.match(sql, /USING\s+gist\s*\([^)]*polygon[^)]*\)/i, 'Must create GiST spatial index on zones polygon');
      assert.match(sql, /USING\s+gist\s*\([^)]*location[^)]*\)/i, 'Must create GiST spatial index on spatial location column');

      // Composite B-Tree indexes for dispatch and ordering
      assert.match(sql, /CREATE\s+INDEX[\s\S]*?ON\s+partner_jobs/i, 'Must index partner_jobs for dispatch querying');
      assert.match(sql, /CREATE\s+INDEX[\s\S]*?ON\s+sub_orders/i, 'Must index sub_orders');
      assert.match(sql, /CREATE\s+INDEX[\s\S]*?ON\s+order_groups/i, 'Must index order_groups');
      assert.match(sql, /CREATE\s+INDEX[\s\S]*?ON\s+delivery_legs/i, 'Must index delivery_legs');
      assert.match(sql, /CREATE\s+INDEX[\s\S]*?ON\s+inventory_reservations/i, 'Must index inventory_reservations for TTL expiry');
      assert.match(sql, /CREATE\s+INDEX[\s\S]*?ON\s+item_translations/i, 'Must index item_translations for fast lookup');
    });
  });

  describe('database/seeds/dev_seed_chennai.sql Seed Data Requirements', () => {
    it('should strictly begin with mandatory non-production disclaimer header', () => {
      const filePath = path.join(SEEDS_DIR, 'dev_seed_chennai.sql');
      assert.ok(fs.existsSync(filePath), 'dev_seed_chennai.sql must exist');
      const sql = fs.readFileSync(filePath, 'utf-8').trimStart();

      const expectedHeader = '-- DEV ENVIRONMENT ONLY - NOT FOR PRODUCTION USE';
      assert.ok(
        sql.startsWith(expectedHeader),
        `dev_seed_chennai.sql must start with exactly: "${expectedHeader}"`
      );
    });

    it('should seed Tamil Nadu state, Chennai city, service zones, sample merchants, and Tamil translations', () => {
      const filePath = path.join(SEEDS_DIR, 'dev_seed_chennai.sql');
      const sql = fs.readFileSync(filePath, 'utf-8');

      // Tamil Nadu state code 33 (GST state code)
      assert.match(sql, /Tamil\s+Nadu/i, 'Must seed Tamil Nadu state');
      assert.match(sql, /33/, 'Must include Tamil Nadu GST state code 33');

      // Chennai city
      assert.match(sql, /Chennai/i, 'Must seed Chennai city');

      // PostGIS Polygon service zones in Chennai
      assert.match(sql, /ST_GeomFromText\s*\(\s*['"]POLYGON/i, 'Must seed Chennai service zones with PostGIS polygons');

      // Sample merchants across verticals (Food & Grocery)
      assert.match(sql, /merchants/i, 'Must seed sample merchants');
      assert.match(sql, /outlets/i, 'Must seed merchant outlets');

      // Bilingual item translations with Tamil ('ta') and English ('en')
      assert.match(sql, /['"]ta['"]/i, 'Must seed Tamil translations (ta)');
      assert.match(sql, /['"]en['"]/i, 'Must seed English translations (en)');
    });
  });

  describe('database/schema.prisma Declarative Model Completeness', () => {
    it('should define valid Prisma schema with postgresql datasource and client generator', () => {
      const filePath = path.join(DB_DIR, 'schema.prisma');
      assert.ok(fs.existsSync(filePath), 'schema.prisma must exist');
      const prisma = fs.readFileSync(filePath, 'utf-8');

      assert.match(prisma, /datasource\s+db\s*\{[\s\S]*?provider\s*=\s*["']postgresql["'][\s\S]*?\}/, 'Must configure postgresql datasource');
      assert.match(prisma, /generator\s+client\s*\{[\s\S]*?provider\s*=\s*["']prisma-client-js["'][\s\S]*?\}/, 'Must configure prisma-client-js generator');
    });

    it('should define Prisma models matching all relational tables and PostGIS types', () => {
      const filePath = path.join(DB_DIR, 'schema.prisma');
      const prisma = fs.readFileSync(filePath, 'utf-8');

      const expectedModels = [
        'User',
        'Role',
        'UserRole',
        'Device',
        'Address',
        'State',
        'City',
        'CitySetting',
        'Zone',
        'WaitlistEntry',
        'Merchant',
        'Outlet',
        'Catalog',
        'Category',
        'Item',
        'ItemTranslation',
        'ItemVariant',
        'Inventory',
        'InventoryReservation',
        'Partner',
        'Vehicle',
        'PartnerDocument',
        'PartnerMode',
        'PartnerJob',
        'PartnerLocationHistory',
        'Cart',
        'CartItem',
        'CheckoutSession',
        'OrderGroup',
        'SubOrder',
        'OrderItem',
        'OrderEvent',
        'DeliveryLeg',
        'DeliveryLegStop',
        'Wallet',
        'LedgerEntry',
        'Payment',
        'Refund',
        'DiscountAllocation',
        'RefundAllocation',
        'Payout',
        'TaxRule',
        'TaxInvoice',
        'Rating',
        'Coupon',
        'SupportTicket',
        'AuditLog',
      ];

      for (const model of expectedModels) {
        const modelPattern = new RegExp(`model\\s+${model}\\s*\\{`, 'm');
        assert.match(prisma, modelPattern, `Must define Prisma model "${model}"`);
      }

      // Check for PostGIS geometry support in Prisma
      assert.match(prisma, /Unsupported\("geometry\(/i, 'Prisma schema must represent PostGIS geometry types');
    });
  });
});
