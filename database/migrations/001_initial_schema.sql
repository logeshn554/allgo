-- ==============================================================================
-- Migration 001: Initial Normalized Schema for AllGo Super-App
-- Platform: PostgreSQL 15 + PostGIS 3.x
-- Scope: Multi-vertical delivery & mobility, bilingual catalog, Section 5A/5B
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. USERS, ROLES & AUTHENTICATION
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    full_name VARCHAR(255),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    default_language VARCHAR(10) NOT NULL DEFAULT 'en',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_user_status CHECK (status IN ('ACTIVE', 'SUSPENDED', 'BLOCKED', 'PENDING_VERIFICATION'))
);

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(32) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(128) NOT NULL,
    fcm_token TEXT,
    platform VARCHAR(32) NOT NULL,
    refresh_token_hash VARCHAR(255),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_device_platform CHECK (platform IN ('ANDROID', 'IOS', 'WEB')),
    UNIQUE (user_id, device_id)
);

CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(32) NOT NULL DEFAULT 'HOME',
    recipient_name VARCHAR(255) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    landmark TEXT,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    location geometry(Point, 4326) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_address_label CHECK (label IN ('HOME', 'WORK', 'OTHER'))
);

-- 3. GEOGRAPHY, SERVICE ZONES & WAITLIST (Zero Hardcoding)
CREATE TABLE IF NOT EXISTS states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL,
    state_code INTEGER UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'NOT_LAUNCHED',
    mobility_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_state_status CHECK (status IN ('NOT_LAUNCHED', 'PILOT', 'LIVE', 'SUSPENDED'))
);

CREATE TABLE IF NOT EXISTS cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id UUID NOT NULL REFERENCES states(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'NOT_LAUNCHED',
    timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_city_status CHECK (status IN ('NOT_LAUNCHED', 'PILOT', 'LIVE', 'SUSPENDED'))
);

CREATE TABLE IF NOT EXISTS city_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id UUID UNIQUE NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    mode_b_max_merchant_distance_km DECIMAL(6,2) NOT NULL DEFAULT 1.5,
    jit_dispatch_lead_time_minutes INTEGER NOT NULL DEFAULT 7,
    unbatching_delay_threshold_minutes INTEGER NOT NULL DEFAULT 12,
    checkout_quote_ttl_seconds INTEGER NOT NULL DEFAULT 600,
    mode_b_customer_discount_inr DECIMAL(10,2) NOT NULL DEFAULT 25.00,
    mode_b_courier_extra_pickup_inr DECIMAL(10,2) NOT NULL DEFAULT 20.00,
    mode_b_max_combined_weight_kg DECIMAL(6,2) NOT NULL DEFAULT 12.0,
    mode_b_max_combined_volume_liters DECIMAL(6,2) NOT NULL DEFAULT 30.0,
    merchant_accept_timeout_seconds INTEGER NOT NULL DEFAULT 180,
    customer_cancel_free_window_seconds INTEGER NOT NULL DEFAULT 60,
    surge_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.0,
    platform_fee_inr DECIMAL(10,2) NOT NULL DEFAULT 5.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id UUID NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    polygon geometry(Polygon, 4326) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (city_id, code)
);

CREATE TABLE IF NOT EXISTS waitlist_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,
    location geometry(Point, 4326),
    postal_code VARCHAR(20),
    city_name VARCHAR(100),
    state_name VARCHAR(100),
    notified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. MERCHANTS, OUTLETS & CATALOGS
CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    business_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    merchant_type VARCHAR(32) NOT NULL,
    pan_number VARCHAR(20) NOT NULL,
    gstin VARCHAR(20),
    fssai_license_number VARCHAR(30),
    status VARCHAR(32) NOT NULL DEFAULT 'REGISTERED',
    bank_account_number VARCHAR(50),
    bank_ifsc VARCHAR(20),
    bank_beneficiary_name VARCHAR(255),
    bank_penny_drop_verified BOOLEAN NOT NULL DEFAULT FALSE,
    commission_rate_percentage DECIMAL(5,2) NOT NULL DEFAULT 15.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_merchant_type CHECK (merchant_type IN ('RESTAURANT', 'CLOUD_KITCHEN', 'GROCERY_STORE', 'DARK_STORE', 'HOME_SELLER')),
    CONSTRAINT chk_merchant_status CHECK (status IN ('REGISTERED', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'LIVE', 'PAUSED', 'SUSPENDED'))
);

CREATE TABLE IF NOT EXISTS outlets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE RESTRICT,
    outlet_name VARCHAR(255) NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    postal_code VARCHAR(20) NOT NULL,
    location geometry(Point, 4326) NOT NULL,
    is_open BOOLEAN NOT NULL DEFAULT TRUE,
    default_prep_time_minutes INTEGER NOT NULL DEFAULT 15,
    packaging_fee_inr DECIMAL(10,2) NOT NULL DEFAULT 10.00,
    phone VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS catalogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    vertical_type VARCHAR(32) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_catalog_vertical CHECK (vertical_type IN ('FOOD', 'GROCERY', 'PARCEL', 'RIDE', 'HIRE_DRIVER', 'HOME_MADE'))
);

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_id UUID NOT NULL REFERENCES catalogs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    sku VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price_inr DECIMAL(10,2) NOT NULL,
    is_veg BOOLEAN NOT NULL DEFAULT TRUE,
    is_perishable BOOLEAN NOT NULL DEFAULT FALSE,
    preparation_time_minutes INTEGER NOT NULL DEFAULT 10,
    image_url TEXT,
    hsn_sac_code VARCHAR(20),
    gst_rate_percentage DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS item_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    language_code VARCHAR(10) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (item_id, language_code),
    CONSTRAINT chk_translation_lang CHECK (language_code IN ('en', 'ta', 'hi'))
);

CREATE TABLE IF NOT EXISTS item_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    variant_name VARCHAR(100) NOT NULL,
    additional_price_inr DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER NOT NULL DEFAULT 0,
    is_in_stock BOOLEAN NOT NULL DEFAULT TRUE,
    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (outlet_id, item_id)
);

CREATE TABLE IF NOT EXISTS inventory_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checkout_session_id UUID NOT NULL,
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE RESTRICT,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'RESERVED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_reservation_status CHECK (status IN ('RESERVED', 'COMMITTED', 'RELEASED'))
);

-- 5. PARTNERS, VEHICLES, DOCUMENTS & GENERIC DISPATCH FEED (Section 5B)
CREATE TABLE IF NOT EXISTS partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(32) NOT NULL DEFAULT 'REGISTERED',
    background_checked BOOLEAN NOT NULL DEFAULT FALSE,
    equipment_verified BOOLEAN NOT NULL DEFAULT FALSE,
    bank_account_number VARCHAR(50),
    bank_ifsc VARCHAR(20),
    bank_beneficiary_name VARCHAR(255),
    cash_in_hand_inr DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    cash_in_hand_limit_inr DECIMAL(10,2) NOT NULL DEFAULT 2000.00,
    rating_average DECIMAL(3,2) NOT NULL DEFAULT 5.00,
    rating_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_partner_status CHECK (status IN ('REGISTERED', 'DOCS_SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ACTIVE', 'SUSPENDED', 'BLOCKED'))
);

CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(32) NOT NULL,
    registration_number VARCHAR(30) UNIQUE NOT NULL,
    make_model VARCHAR(100) NOT NULL,
    rc_verified BOOLEAN NOT NULL DEFAULT FALSE,
    insurance_verified BOOLEAN NOT NULL DEFAULT FALSE,
    commercial_permit_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_vehicle_type CHECK (vehicle_type IN ('BICYCLE', 'MOTORCYCLE', 'SCOOTER', 'AUTO_RICKSHAW', 'CAB_SEDAN', 'CAB_HATCHBACK', 'CAB_SUV'))
);

CREATE TABLE IF NOT EXISTS partner_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    document_number VARCHAR(100),
    file_url TEXT NOT NULL,
    verification_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    rejection_reason TEXT,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_doc_status CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED'))
);

CREATE TABLE IF NOT EXISTS partner_modes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID UNIQUE NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    current_mode VARCHAR(32) NOT NULL DEFAULT 'DELIVERIES_ONLY',
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    active_vertical_lock VARCHAR(32),
    last_mode_switch_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_partner_mode CHECK (current_mode IN ('DELIVERIES_ONLY', 'RIDES_ONLY', 'ALL_JOBS')),
    CONSTRAINT chk_vertical_lock CHECK (active_vertical_lock IS NULL OR active_vertical_lock IN ('FOOD', 'GROCERY', 'PARCEL', 'RIDE', 'HIRE_DRIVER', 'HOME_MADE'))
);

CREATE TABLE IF NOT EXISTS partner_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type VARCHAR(32) NOT NULL,
    entity_id UUID NOT NULL,
    partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'OFFERED',
    pickup_location geometry(Point, 4326) NOT NULL,
    drop_location geometry(Point, 4326) NOT NULL,
    pickup_address TEXT NOT NULL,
    drop_address TEXT NOT NULL,
    estimated_earnings_inr DECIMAL(10,2) NOT NULL,
    offered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_job_type CHECK (job_type IN ('DELIVERY_LEG', 'PARCEL', 'RIDE', 'HIRE_BOOKING')),
    CONSTRAINT chk_job_status CHECK (status IN ('OFFERED', 'ACCEPTED', 'ARRIVED_PICKUP', 'IN_PROGRESS', 'ARRIVED_DROPOFF', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'REJECTED'))
);

CREATE TABLE IF NOT EXISTS partner_location_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    active_job_id UUID REFERENCES partner_jobs(id) ON DELETE SET NULL,
    location geometry(Point, 4326) NOT NULL,
    speed_kph DECIMAL(5,2),
    bearing DECIMAL(5,2),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. CARTS, CHECKOUT SESSIONS & ORDER DECOMPOSITION (Section 5A)
CREATE TABLE IF NOT EXISTS carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE RESTRICT,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    variant_id UUID REFERENCES item_variants(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_cart_quantity CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS checkout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    delivery_address_id UUID NOT NULL REFERENCES addresses(id) ON DELETE RESTRICT,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    selected_fulfillment_mode VARCHAR(32) NOT NULL DEFAULT 'SEPARATE',
    total_item_amount_inr DECIMAL(10,2) NOT NULL,
    total_delivery_fee_inr DECIMAL(10,2) NOT NULL,
    total_packaging_fee_inr DECIMAL(10,2) NOT NULL,
    platform_fee_inr DECIMAL(10,2) NOT NULL,
    total_tax_inr DECIMAL(10,2) NOT NULL,
    total_discount_inr DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    final_payable_amount_inr DECIMAL(10,2) NOT NULL,
    idempotency_key VARCHAR(128) UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_session_status CHECK (status IN ('ACTIVE', 'CONVERTED', 'EXPIRED', 'CANCELLED')),
    CONSTRAINT chk_session_mode CHECK (selected_fulfillment_mode IN ('SEPARATE', 'DELIVER_TOGETHER'))
);

CREATE TABLE IF NOT EXISTS order_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    checkout_session_id UUID NOT NULL REFERENCES checkout_sessions(id) ON DELETE RESTRICT,
    order_group_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PLACED',
    fulfillment_mode VARCHAR(32) NOT NULL DEFAULT 'SEPARATE',
    total_items_amount_inr DECIMAL(10,2) NOT NULL,
    total_delivery_fees_inr DECIMAL(10,2) NOT NULL,
    total_packaging_fees_inr DECIMAL(10,2) NOT NULL,
    platform_fee_inr DECIMAL(10,2) NOT NULL,
    total_tax_amount_inr DECIMAL(10,2) NOT NULL,
    total_discount_amount_inr DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_paid_amount_inr DECIMAL(10,2) NOT NULL,
    delivery_address_id UUID NOT NULL REFERENCES addresses(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_group_status CHECK (status IN ('PLACED', 'CONFIRMED', 'COMPLETED', 'PARTIALLY_CANCELLED', 'CANCELLED', 'FAILED')),
    CONSTRAINT chk_group_fulfillment CHECK (fulfillment_mode IN ('SEPARATE', 'DELIVER_TOGETHER'))
);

CREATE TABLE IF NOT EXISTS sub_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_group_id UUID NOT NULL REFERENCES order_groups(id) ON DELETE CASCADE,
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE RESTRICT,
    sub_order_number VARCHAR(50) UNIQUE NOT NULL,
    vertical_type VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PLACED',
    items_total_inr DECIMAL(10,2) NOT NULL,
    packaging_fee_inr DECIMAL(10,2) NOT NULL,
    merchant_commission_inr DECIMAL(10,2) NOT NULL,
    merchant_net_payout_inr DECIMAL(10,2) NOT NULL,
    tax_total_inr DECIMAL(10,2) NOT NULL,
    discount_allocated_inr DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    prep_time_minutes INTEGER NOT NULL DEFAULT 15,
    estimated_ready_at TIMESTAMPTZ,
    actual_ready_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_suborder_vertical CHECK (vertical_type IN ('FOOD', 'GROCERY', 'HOME_MADE')),
    CONSTRAINT chk_suborder_status CHECK (status IN ('CART', 'PLACED', 'PAYMENT_CONFIRMED', 'MERCHANT_ACCEPTED', 'PREPARING', 'READY', 'PARTNER_ASSIGNED', 'PARTNER_AT_STORE', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'ARRIVED', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'FAILED'))
);

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_order_id UUID NOT NULL REFERENCES sub_orders(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    item_name_snapshot VARCHAR(255) NOT NULL,
    unit_price_inr DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL,
    total_price_inr DECIMAL(10,2) NOT NULL,
    gst_rate_percentage DECIMAL(5,2) NOT NULL,
    gst_amount_inr DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_order_item_qty CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS order_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_group_id UUID NOT NULL REFERENCES order_groups(id) ON DELETE CASCADE,
    sub_order_id UUID REFERENCES sub_orders(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    from_status VARCHAR(32),
    to_status VARCHAR(32) NOT NULL,
    notes TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_legs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_group_id UUID NOT NULL REFERENCES order_groups(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
    fulfillment_mode VARCHAR(32) NOT NULL DEFAULT 'SEPARATE',
    status VARCHAR(32) NOT NULL DEFAULT 'OFFERED',
    courier_fee_inr DECIMAL(10,2) NOT NULL,
    courier_extra_pickup_bonus_inr DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    pickup_sequence_type VARCHAR(32) NOT NULL DEFAULT 'STANDARD',
    polyline_cache TEXT,
    handover_otp VARCHAR(6) NOT NULL,
    handover_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_leg_mode CHECK (fulfillment_mode IN ('SEPARATE', 'DELIVER_TOGETHER')),
    CONSTRAINT chk_leg_status CHECK (status IN ('OFFERED', 'ASSIGNED', 'ARRIVED_PICKUP', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'ARRIVED', 'DELIVERED', 'CANCELLED', 'FAILED'))
);

CREATE TABLE IF NOT EXISTS delivery_leg_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_leg_id UUID NOT NULL REFERENCES delivery_legs(id) ON DELETE CASCADE,
    sub_order_id UUID REFERENCES sub_orders(id) ON DELETE CASCADE,
    stop_type VARCHAR(32) NOT NULL,
    stop_sequence INTEGER NOT NULL,
    location geometry(Point, 4326) NOT NULL,
    address_text TEXT NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_stop_type CHECK (stop_type IN ('PICKUP', 'DROPOFF')),
    CONSTRAINT chk_stop_status CHECK (status IN ('PENDING', 'ARRIVED', 'COMPLETED', 'FAILED'))
);

-- 7. WALLETS, DOUBLE-ENTRY LEDGER, PAYMENTS & REFUNDS
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance_inr DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_wallet_balance_positive CHECK (balance_inr >= 0.00)
);

CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES wallets(id) ON DELETE RESTRICT,
    sub_order_id UUID REFERENCES sub_orders(id) ON DELETE RESTRICT,
    transaction_reference VARCHAR(100) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    direction VARCHAR(10) NOT NULL,
    amount_inr DECIMAL(12,2) NOT NULL,
    balance_after_inr DECIMAL(12,2),
    description TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_ledger_amount CHECK (amount_inr > 0.00),
    CONSTRAINT chk_ledger_direction CHECK (direction IN ('DEBIT', 'CREDIT')),
    CONSTRAINT chk_ledger_account CHECK (account_type IN (
        'CUSTOMER_WALLET',
        'MERCHANT_SETTLEMENT',
        'PARTNER_EARNINGS',
        'PLATFORM_COMMISSION',
        'PLATFORM_DELIVERY_FEES',
        'GATEWAY_ESCROW',
        'TAX_PAYABLE_GST',
        'TAX_WITHHELD_TCS',
        'TAX_WITHHELD_TDS'
    ))
);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_group_id UUID NOT NULL REFERENCES order_groups(id) ON DELETE RESTRICT,
    gateway_name VARCHAR(32) NOT NULL DEFAULT 'RAZORPAY',
    gateway_order_id VARCHAR(100) NOT NULL,
    gateway_payment_id VARCHAR(100),
    gateway_signature VARCHAR(255),
    payment_method VARCHAR(32) NOT NULL,
    amount_inr DECIMAL(10,2) NOT NULL,
    wallet_debited_amount_inr DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    error_code VARCHAR(100),
    error_description TEXT,
    captured_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_payment_method CHECK (payment_method IN ('UPI', 'CARD', 'NETBANKING', 'WALLET', 'COD', 'SPLIT')),
    CONSTRAINT chk_payment_status CHECK (status IN ('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED'))
);

CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    sub_order_id UUID REFERENCES sub_orders(id) ON DELETE RESTRICT,
    gateway_refund_id VARCHAR(100),
    destination VARCHAR(32) NOT NULL,
    amount_inr DECIMAL(10,2) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_refund_destination CHECK (destination IN ('ORIGINAL_METHOD', 'WALLET')),
    CONSTRAINT chk_refund_status CHECK (status IN ('PENDING', 'PROCESSED', 'FAILED'))
);

CREATE TABLE IF NOT EXISTS discount_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_group_id UUID NOT NULL REFERENCES order_groups(id) ON DELETE CASCADE,
    sub_order_id UUID NOT NULL REFERENCES sub_orders(id) ON DELETE CASCADE,
    coupon_code VARCHAR(50),
    discount_type VARCHAR(32) NOT NULL,
    allocated_amount_inr DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refund_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refund_id UUID NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,
    sub_order_id UUID NOT NULL REFERENCES sub_orders(id) ON DELETE CASCADE,
    allocated_amount_inr DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_type VARCHAR(32) NOT NULL,
    recipient_id UUID NOT NULL,
    payout_channel VARCHAR(32) NOT NULL DEFAULT 'RAZORPAYX',
    razorpayx_payout_id VARCHAR(100),
    gross_amount_inr DECIMAL(10,2) NOT NULL,
    net_amount_inr DECIMAL(10,2) NOT NULL,
    tds_amount_inr DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tcs_amount_inr DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(32) NOT NULL DEFAULT 'SCHEDULED',
    failure_reason TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_payout_recipient CHECK (recipient_type IN ('MERCHANT', 'PARTNER')),
    CONSTRAINT chk_payout_status CHECK (status IN ('SCHEDULED', 'PROCESSING', 'SUCCESS', 'FAILED'))
);

-- 8. TAX ENGINE, COMPLIANCE & INVOICES
CREATE TABLE IF NOT EXISTS tax_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vertical_type VARCHAR(32) NOT NULL,
    rule_name VARCHAR(100) NOT NULL,
    section_code VARCHAR(32) NOT NULL,
    gst_rate_percentage DECIMAL(5,2) NOT NULL,
    applies_to_delivery_fee BOOLEAN NOT NULL DEFAULT FALSE,
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_tax_vertical CHECK (vertical_type IN ('FOOD', 'GROCERY', 'PARCEL', 'RIDE', 'HIRE_DRIVER', 'HOME_MADE'))
);

CREATE TABLE IF NOT EXISTS tax_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_order_id UUID UNIQUE NOT NULL REFERENCES sub_orders(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    merchant_gstin VARCHAR(20),
    customer_gstin VARCHAR(20),
    taxable_value_inr DECIMAL(10,2) NOT NULL,
    cgst_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    cgst_amount_inr DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    sgst_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    sgst_amount_inr DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    igst_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    igst_amount_inr DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    invoice_url TEXT,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. RATINGS, COUPONS, SUPPORT & AUDIT LOGS
CREATE TABLE IF NOT EXISTS ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_group_id UUID NOT NULL REFERENCES order_groups(id) ON DELETE CASCADE,
    sub_order_id UUID REFERENCES sub_orders(id) ON DELETE CASCADE,
    delivery_leg_id UUID REFERENCES delivery_legs(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    target_type VARCHAR(32) NOT NULL,
    target_id UUID NOT NULL,
    score INTEGER NOT NULL,
    feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_rating_score CHECK (score >= 1 AND score <= 5),
    CONSTRAINT chk_rating_target CHECK (target_type IN ('MERCHANT', 'OUTLET', 'PARTNER', 'CUSTOMER'))
);

CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    vertical_type VARCHAR(32),
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    discount_percentage DECIMAL(5,2),
    flat_discount_inr DECIMAL(10,2),
    min_order_amount_inr DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    max_discount_inr DECIMAL(10,2),
    usage_limit_per_user INTEGER NOT NULL DEFAULT 1,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_coupon_vertical CHECK (vertical_type IS NULL OR vertical_type IN ('FOOD', 'GROCERY', 'PARCEL', 'RIDE', 'HIRE_DRIVER', 'HOME_MADE'))
);

CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    order_group_id UUID REFERENCES order_groups(id) ON DELETE SET NULL,
    sub_order_id UUID REFERENCES sub_orders(id) ON DELETE SET NULL,
    delivery_leg_id UUID REFERENCES delivery_legs(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    priority VARCHAR(32) NOT NULL DEFAULT 'MEDIUM',
    assigned_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_ticket_status CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    CONSTRAINT chk_ticket_priority CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    old_state JSONB,
    new_state JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
