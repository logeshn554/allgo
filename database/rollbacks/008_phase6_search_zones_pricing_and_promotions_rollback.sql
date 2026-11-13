-- ============================================================================
-- ALLGO DATABASE ROLLBACK 008: PHASE 6 SEARCH, ZONES, PRICING & PROMOTIONS
-- ============================================================================

BEGIN;

DROP INDEX IF EXISTS idx_categories_name_trgm;
DROP INDEX IF EXISTS idx_merchants_name_trgm;
DROP INDEX IF EXISTS idx_outlets_name_trgm;
DROP INDEX IF EXISTS idx_items_barcode;
DROP INDEX IF EXISTS idx_items_name_trgm;

DROP TABLE IF EXISTS promotion_pricing_audit_logs;

DROP INDEX IF EXISTS idx_coupons_outlet;
DROP INDEX IF EXISTS idx_coupons_auto_applied;

ALTER TABLE coupons DROP COLUMN IF EXISTS title;
ALTER TABLE coupons DROP COLUMN IF EXISTS total_redeemed_count;
ALTER TABLE coupons DROP COLUMN IF EXISTS max_total_redemptions;
ALTER TABLE coupons DROP COLUMN IF EXISTS new_customer_only;
ALTER TABLE coupons DROP COLUMN IF EXISTS is_auto_applied;
ALTER TABLE coupons DROP COLUMN IF EXISTS category_id;
ALTER TABLE coupons DROP COLUMN IF EXISTS outlet_id;

DROP TABLE IF EXISTS customer_search_history;
DROP TABLE IF EXISTS outlet_zone_assignments;
DROP TABLE IF EXISTS zone_service_settings;

COMMIT;
