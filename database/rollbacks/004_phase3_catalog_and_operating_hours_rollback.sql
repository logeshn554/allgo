-- ============================================================================
-- AllGo Database Migration 004 Rollback: Phase 3 Catalog & Operating Hours
-- Safely tears down Phase 3 views, tables, indexes, and additive columns.
-- ============================================================================

BEGIN;

-- 1. DROP COMPATIBILITY VIEWS
DROP VIEW IF EXISTS outlet_products CASCADE;
DROP VIEW IF EXISTS product_options CASCADE;
DROP VIEW IF EXISTS product_option_groups CASCADE;
DROP VIEW IF EXISTS product_variants CASCADE;
DROP VIEW IF EXISTS products CASCADE;
DROP VIEW IF EXISTS product_categories CASCADE;

-- 2. DROP TABLES
DROP TABLE IF EXISTS outlet_special_closures CASCADE;
DROP TABLE IF EXISTS outlet_operating_hours CASCADE;
DROP TABLE IF EXISTS outlet_item_overrides CASCADE;
DROP TABLE IF EXISTS item_options CASCADE;
DROP TABLE IF EXISTS item_option_groups CASCADE;

-- 3. REMOVE OUTLETS ENHANCEMENTS
ALTER TABLE outlets DROP COLUMN IF EXISTS reopens_at;
ALTER TABLE outlets DROP COLUMN IF EXISTS temporary_closure_reason;
ALTER TABLE outlets DROP COLUMN IF EXISTS is_temporarily_closed;
ALTER TABLE outlets DROP COLUMN IF EXISTS timezone;

-- 4. REMOVE ITEM_VARIANTS ENHANCEMENTS
ALTER TABLE item_variants DROP CONSTRAINT IF EXISTS chk_variant_type;
ALTER TABLE item_variants DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE item_variants DROP COLUMN IF EXISTS display_order;
ALTER TABLE item_variants DROP COLUMN IF EXISTS sale_price_inr;
ALTER TABLE item_variants DROP COLUMN IF EXISTS variant_type;
ALTER TABLE item_variants DROP COLUMN IF EXISTS sku;

-- 5. REMOVE ITEMS ENHANCEMENTS
DROP INDEX IF EXISTS idx_items_active_browsing;
ALTER TABLE items DROP CONSTRAINT IF EXISTS chk_item_admin_status;
ALTER TABLE items DROP CONSTRAINT IF EXISTS chk_item_product_status;
ALTER TABLE items DROP CONSTRAINT IF EXISTS chk_item_sale_price;

ALTER TABLE items DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE items DROP COLUMN IF EXISTS images;
ALTER TABLE items DROP COLUMN IF EXISTS dietary_flags;
ALTER TABLE items DROP COLUMN IF EXISTS display_order;
ALTER TABLE items DROP COLUMN IF EXISTS rejection_reason;
ALTER TABLE items DROP COLUMN IF EXISTS admin_status;
ALTER TABLE items DROP COLUMN IF EXISTS product_status;
ALTER TABLE items DROP COLUMN IF EXISTS sale_price_inr;
ALTER TABLE items DROP COLUMN IF EXISTS barcode;

-- 6. REMOVE CATEGORIES ENHANCEMENTS
DROP INDEX IF EXISTS idx_categories_parent;
ALTER TABLE categories DROP COLUMN IF EXISTS description;
ALTER TABLE categories DROP COLUMN IF EXISTS image_url;
ALTER TABLE categories DROP COLUMN IF EXISTS parent_id;

COMMIT;
