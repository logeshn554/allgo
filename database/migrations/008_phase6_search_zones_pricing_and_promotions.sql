-- ============================================================================
-- ALLGO DATABASE MIGRATION 008: PHASE 6 SEARCH, ZONES, PRICING & PROMOTIONS
-- ============================================================================

BEGIN;

-- 1. POSTGRESQL EXTENSIONS FOR SEARCH & TRUNCATED TRIGRAM MATCHING
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. ZONE SERVICE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS zone_service_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    vertical_type VARCHAR(32) NOT NULL,
    is_service_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    min_order_value_inr DECIMAL(10,2) NOT NULL DEFAULT 99.00,
    base_delivery_fee_inr DECIMAL(10,2) NOT NULL DEFAULT 30.00,
    per_km_fee_inr DECIMAL(10,2) NOT NULL DEFAULT 10.00,
    free_delivery_distance_km DECIMAL(6,2) NOT NULL DEFAULT 3.00,
    max_service_radius_km DECIMAL(6,2) NOT NULL DEFAULT 15.00,
    surge_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    surge_reason TEXT,
    is_surge_active BOOLEAN NOT NULL DEFAULT FALSE,
    surge_expires_at TIMESTAMPTZ,
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_zone_vertical CHECK (vertical_type IN ('FOOD', 'GROCERY', 'PARCEL', 'RIDE', 'HIRE_DRIVER', 'HOME_MADE')),
    CONSTRAINT chk_zone_surge_multiplier CHECK (surge_multiplier >= 1.00 AND surge_multiplier <= 3.00),
    CONSTRAINT chk_zone_min_order CHECK (min_order_value_inr >= 0.00),
    UNIQUE (zone_id, vertical_type)
);

CREATE INDEX IF NOT EXISTS idx_zone_service_lookup ON zone_service_settings(zone_id, vertical_type, is_service_enabled);

-- 3. OUTLET-ZONE ASSIGNMENTS (Multi-zone support & Primary zone)
CREATE TABLE IF NOT EXISTS outlet_zone_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (outlet_id, zone_id)
);

CREATE INDEX IF NOT EXISTS idx_outlet_zones ON outlet_zone_assignments(outlet_id, zone_id);

-- 4. CUSTOMER SEARCH HISTORY
CREATE TABLE IF NOT EXISTS customer_search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query_text VARCHAR(255) NOT NULL,
    vertical_type VARCHAR(32),
    filters_applied JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_search_history ON customer_search_history(customer_id, created_at DESC);

-- 5. EXTEND COUPONS / PROMOTIONAL ENGINE
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE CASCADE;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS is_auto_applied BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS new_customer_only BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS max_total_redemptions INTEGER;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS total_redeemed_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS title VARCHAR(120);

CREATE INDEX IF NOT EXISTS idx_coupons_auto_applied ON coupons(is_auto_applied, is_active, valid_until);
CREATE INDEX IF NOT EXISTS idx_coupons_outlet ON coupons(outlet_id);

-- 6. DYNAMIC PRICING & PROMOTION AUDIT LOG
CREATE TABLE IF NOT EXISTS promotion_pricing_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    target_type VARCHAR(32) NOT NULL, -- 'ZONE_SURGE', 'DYNAMIC_PRICING', 'PROMOTION'
    target_id UUID,
    action VARCHAR(32) NOT NULL, -- 'CREATED', 'UPDATED', 'SURGE_ACTIVATED', 'SURGE_DEACTIVATED', 'DELETED'
    previous_state JSONB,
    new_state JSONB,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_audit_target_type CHECK (target_type IN ('ZONE_SURGE', 'DYNAMIC_PRICING', 'PROMOTION', 'SERVICE_ZONE'))
);

CREATE INDEX IF NOT EXISTS idx_promo_audit_target ON promotion_pricing_audit_logs(target_type, target_id, created_at DESC);

-- 7. FULL-TEXT & TRIGRAM SEARCH INDEXES
-- Trigram index on items.name for fuzzy typing
CREATE INDEX IF NOT EXISTS idx_items_name_trgm ON items USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_items_barcode ON items(barcode) WHERE barcode IS NOT NULL;

-- Trigram index on outlets.outlet_name
CREATE INDEX IF NOT EXISTS idx_outlets_name_trgm ON outlets USING gin (outlet_name gin_trgm_ops);

-- Trigram index on merchants.business_name
CREATE INDEX IF NOT EXISTS idx_merchants_name_trgm ON merchants USING gin (business_name gin_trgm_ops);

-- Trigram index on categories.name
CREATE INDEX IF NOT EXISTS idx_categories_name_trgm ON categories USING gin (name gin_trgm_ops);

COMMIT;
