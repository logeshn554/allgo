-- ==============================================================================
-- Migration 002: PostGIS Spatial GiST & Composite BTree Performance Indexes
-- Platform: PostgreSQL 15 + PostGIS 3.x
-- Scope: High-frequency geospatial matching, dispatch optimization, order query indexing
-- ==============================================================================

-- 1. SPATIAL GIST INDEXES
-- Fast point-in-polygon zone containment queries
CREATE INDEX IF NOT EXISTS idx_zones_polygon_gist 
    ON zones USING gist (polygon);

-- Dispatch proximity queries for outlets
CREATE INDEX IF NOT EXISTS idx_outlets_location_gist 
    ON outlets USING gist (location);

-- Customer delivery address spatial lookups
CREATE INDEX IF NOT EXISTS idx_addresses_location_gist 
    ON addresses USING gist (location);

-- Location history breadcrumb lookups & dispute route playback
CREATE INDEX IF NOT EXISTS idx_partner_location_history_location_gist 
    ON partner_location_history USING gist (location);

-- Partner dispatch job pickup & drop spatial lookups
CREATE INDEX IF NOT EXISTS idx_partner_jobs_pickup_gist 
    ON partner_jobs USING gist (pickup_location);

CREATE INDEX IF NOT EXISTS idx_partner_jobs_drop_gist 
    ON partner_jobs USING gist (drop_location);

-- Delivery leg stops spatial coordinates
CREATE INDEX IF NOT EXISTS idx_delivery_leg_stops_location_gist 
    ON delivery_leg_stops USING gist (location);


-- 2. DISPATCH & PARTNER FEED INDEXES (Section 5B)
CREATE INDEX IF NOT EXISTS idx_partner_jobs_partner_status 
    ON partner_jobs (partner_id, status);

CREATE INDEX IF NOT EXISTS idx_partner_jobs_status_type_offered 
    ON partner_jobs (status, job_type, offered_at);

CREATE INDEX IF NOT EXISTS idx_partner_modes_online_mode 
    ON partner_modes (is_online, current_mode, active_vertical_lock);

CREATE INDEX IF NOT EXISTS idx_partners_status_active 
    ON partners (status, equipment_verified);

CREATE INDEX IF NOT EXISTS idx_partner_location_recorded 
    ON partner_location_history (partner_id, recorded_at DESC);


-- 3. SECTION 5A ORDER & CHECKOUT DECOMPOSITION INDEXES
CREATE INDEX IF NOT EXISTS idx_sub_orders_group_status 
    ON sub_orders (order_group_id, status);

CREATE INDEX IF NOT EXISTS idx_sub_orders_outlet_status 
    ON sub_orders (outlet_id, status);

CREATE INDEX IF NOT EXISTS idx_order_groups_customer_status 
    ON order_groups (customer_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_groups_number 
    ON order_groups (order_group_number);

CREATE INDEX IF NOT EXISTS idx_delivery_legs_group_status 
    ON delivery_legs (order_group_id, status);

CREATE INDEX IF NOT EXISTS idx_delivery_legs_partner_status 
    ON delivery_legs (partner_id, status);

CREATE INDEX IF NOT EXISTS idx_delivery_leg_stops_leg_seq 
    ON delivery_leg_stops (delivery_leg_id, stop_sequence ASC);

CREATE INDEX IF NOT EXISTS idx_order_items_sub_order 
    ON order_items (sub_order_id);

CREATE INDEX IF NOT EXISTS idx_order_events_group_created 
    ON order_events (order_group_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_customer_status 
    ON checkout_sessions (customer_id, status, expires_at);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_session_expires 
    ON inventory_reservations (checkout_session_id, expires_at);


-- 4. BILINGUAL CATALOG & INVENTORY INDEXES
CREATE INDEX IF NOT EXISTS idx_item_translations_item_lang 
    ON item_translations (item_id, language_code);

CREATE INDEX IF NOT EXISTS idx_items_category_active 
    ON items (category_id, is_active);

CREATE INDEX IF NOT EXISTS idx_inventory_outlet_stock 
    ON inventory (outlet_id, is_in_stock, stock_quantity);

CREATE INDEX IF NOT EXISTS idx_outlets_zone_open 
    ON outlets (zone_id, is_open);


-- 5. DOUBLE-ENTRY LEDGER & FINANCIAL AUDIT INDEXES
CREATE INDEX IF NOT EXISTS idx_ledger_entries_wallet_created 
    ON ledger_entries (wallet_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_suborder_account 
    ON ledger_entries (sub_order_id, account_type);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_tx_ref 
    ON ledger_entries (transaction_reference);

CREATE INDEX IF NOT EXISTS idx_payments_group_status 
    ON payments (order_group_id, status);

CREATE INDEX IF NOT EXISTS idx_payouts_recipient_status 
    ON payouts (recipient_type, recipient_id, status);

CREATE INDEX IF NOT EXISTS idx_tax_invoices_suborder 
    ON tax_invoices (sub_order_id);

CREATE INDEX IF NOT EXISTS idx_devices_user_active 
    ON devices (user_id, last_active_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity 
    ON audit_logs (entity_type, entity_id, created_at DESC);
