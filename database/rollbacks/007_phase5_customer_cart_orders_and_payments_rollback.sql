-- ==============================================================================
-- ALLGO DATABASE ROLLBACK 007
-- Phase 5: Customer Cart, Checkout, Food & Grocery Ordering, Payments & Refunds
-- ==============================================================================

BEGIN;

DROP TABLE IF EXISTS order_cancellations CASCADE;
DROP TABLE IF EXISTS coupon_redemptions CASCADE;
DROP TABLE IF EXISTS payment_transactions CASCADE;
DROP TABLE IF EXISTS order_item_customizations CASCADE;
DROP TABLE IF EXISTS customer_saved_addresses CASCADE;

ALTER TABLE delivery_jobs DROP COLUMN IF EXISTS sub_order_id;

ALTER TABLE sub_orders
    DROP COLUMN IF EXISTS delivery_fee_inr,
    DROP COLUMN IF EXISTS platform_fee_inr,
    DROP COLUMN IF EXISTS total_payable_inr,
    DROP COLUMN IF EXISTS delivery_job_id,
    DROP COLUMN IF EXISTS delivery_address_snapshot,
    DROP COLUMN IF EXISTS delivery_instructions,
    DROP COLUMN IF EXISTS customer_notes,
    DROP COLUMN IF EXISTS cancellation_reason,
    DROP COLUMN IF EXISTS cancelled_by,
    DROP COLUMN IF EXISTS cancelled_at,
    DROP COLUMN IF EXISTS rejected_reason,
    DROP COLUMN IF EXISTS rejected_at;

ALTER TABLE cart_items
    DROP COLUMN IF EXISTS selected_options,
    DROP COLUMN IF EXISTS special_instructions;

DELETE FROM coupons WHERE code IN ('ALLGO50', 'FEAST20', 'FLAT50');

COMMIT;
