-- ============================================================================
-- AllGo Database Migration 004: Phase 3 Catalog, Food Menus, Multi-Outlet Overrides
-- & Merchant Operating Hours
-- Additive migration for products, categories, variants, food option groups,
-- outlet-level overrides, weekly operating hours, and special closures.
-- ============================================================================

BEGIN;

-- 1. CATEGORIES ENHANCEMENTS (Hierarchical Subcategories & Images)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

-- 2. PRODUCTS / ITEMS ENHANCEMENTS (Status, Pricing Rules, Dietary Attributes, Images, Barcode)
ALTER TABLE items ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
ALTER TABLE items ADD COLUMN IF NOT EXISTS sale_price_inr DECIMAL(10,2);
ALTER TABLE items ADD COLUMN IF NOT EXISTS product_status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE items ADD COLUMN IF NOT EXISTS admin_status VARCHAR(32) NOT NULL DEFAULT 'APPROVED';
ALTER TABLE items ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS dietary_flags JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE items ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Constraints on Items
ALTER TABLE items DROP CONSTRAINT IF EXISTS chk_item_sale_price;
ALTER TABLE items ADD CONSTRAINT chk_item_sale_price 
    CHECK (sale_price_inr IS NULL OR sale_price_inr <= base_price_inr);

ALTER TABLE items DROP CONSTRAINT IF EXISTS chk_item_product_status;
ALTER TABLE items ADD CONSTRAINT chk_item_product_status 
    CHECK (product_status IN ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'));

ALTER TABLE items DROP CONSTRAINT IF EXISTS chk_item_admin_status;
ALTER TABLE items ADD CONSTRAINT chk_item_admin_status 
    CHECK (admin_status IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED'));

CREATE INDEX IF NOT EXISTS idx_items_active_browsing 
    ON items (category_id, display_order) 
    WHERE is_active = TRUE AND product_status = 'ACTIVE' AND admin_status = 'APPROVED' AND deleted_at IS NULL;

-- 3. PRODUCT VARIANTS ENHANCEMENTS (SKU, Types, Sale Price, Display Order)
ALTER TABLE item_variants ADD COLUMN IF NOT EXISTS sku VARCHAR(100);
ALTER TABLE item_variants ADD COLUMN IF NOT EXISTS variant_type VARCHAR(50) NOT NULL DEFAULT 'SIZE';
ALTER TABLE item_variants ADD COLUMN IF NOT EXISTS sale_price_inr DECIMAL(10,2);
ALTER TABLE item_variants ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE item_variants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE item_variants DROP CONSTRAINT IF EXISTS chk_variant_type;
ALTER TABLE item_variants ADD CONSTRAINT chk_variant_type 
    CHECK (variant_type IN ('SIZE', 'WEIGHT', 'PORTION', 'QUANTITY', 'OTHER'));

-- 4. FOOD MENU OPTION GROUPS & ADD-ONS
CREATE TABLE IF NOT EXISTS item_option_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    min_selections INTEGER NOT NULL DEFAULT 0,
    max_selections INTEGER NOT NULL DEFAULT 1,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_option_group_selections CHECK (min_selections >= 0 AND max_selections >= min_selections)
);

CREATE INDEX IF NOT EXISTS idx_option_groups_item ON item_option_groups(item_id, display_order);

CREATE TABLE IF NOT EXISTS item_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    option_group_id UUID NOT NULL REFERENCES item_option_groups(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price_inr DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_option_price CHECK (price_inr >= 0.00)
);

CREATE INDEX IF NOT EXISTS idx_options_group ON item_options(option_group_id, display_order);

-- 5. OUTLET-LEVEL PRODUCT OVERRIDES & MULTI-OUTLET GOVERNANCE
CREATE TABLE IF NOT EXISTS outlet_item_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    custom_price_inr DECIMAL(10,2),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (outlet_id, item_id),
    CONSTRAINT chk_custom_price CHECK (custom_price_inr IS NULL OR custom_price_inr >= 0.00)
);

CREATE INDEX IF NOT EXISTS idx_outlet_overrides_lookup ON outlet_item_overrides(outlet_id, item_id);

-- 6. MERCHANT OPERATING HOURS & SPECIAL CLOSURES
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata';
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS is_temporarily_closed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS temporary_closure_reason TEXT;
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS reopens_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS outlet_operating_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL,
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    is_overnight BOOLEAN NOT NULL DEFAULT FALSE,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_day_of_week CHECK (day_of_week BETWEEN 0 AND 6)
);

CREATE INDEX IF NOT EXISTS idx_operating_hours_outlet_day ON outlet_operating_hours(outlet_id, day_of_week);

CREATE TABLE IF NOT EXISTS outlet_special_closures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    closure_date DATE NOT NULL,
    reason VARCHAR(255) NOT NULL,
    is_full_day BOOLEAN NOT NULL DEFAULT TRUE,
    open_time TIME,
    close_time TIME,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (outlet_id, closure_date)
);

CREATE INDEX IF NOT EXISTS idx_special_closures_date ON outlet_special_closures(outlet_id, closure_date);

-- 7. COMPATIBILITY VIEWS
CREATE OR REPLACE VIEW product_categories AS SELECT * FROM categories;
CREATE OR REPLACE VIEW products AS SELECT * FROM items;
CREATE OR REPLACE VIEW product_variants AS SELECT * FROM item_variants;
CREATE OR REPLACE VIEW product_option_groups AS SELECT * FROM item_option_groups;
CREATE OR REPLACE VIEW product_options AS SELECT * FROM item_options;
CREATE OR REPLACE VIEW outlet_products AS SELECT * FROM outlet_item_overrides;

COMMIT;
