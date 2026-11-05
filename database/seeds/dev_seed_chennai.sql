-- DEV ENVIRONMENT ONLY - NOT FOR PRODUCTION USE
-- ==============================================================================
-- Development Seed Data: Chennai (Tamil Nadu, India)
-- GST State Code: 33 (Tamil Nadu)
-- Includes: State, City, PostGIS Zones, Pilot Merchants (Food + Grocery),
--           Bilingual Catalog (Tamil 'ta' + English 'en'), and Default Tax Rules.
-- ==============================================================================

-- 1. ROLES
INSERT INTO roles (id, name, description) VALUES
    ('00000000-0000-0000-0000-000000000001', 'CUSTOMER', 'End-consumer ordering food, grocery, and services'),
    ('00000000-0000-0000-0000-000000000002', 'PARTNER', 'Delivery courier and driver partner'),
    ('00000000-0000-0000-0000-000000000003', 'MERCHANT', 'Store and restaurant owner / outlet manager'),
    ('00000000-0000-0000-0000-000000000004', 'ADMIN', 'Platform operations and KYC reviewer'),
    ('00000000-0000-0000-0000-000000000005', 'SUPER_ADMIN', 'Platform engineering and financial administrator')
ON CONFLICT (name) DO NOTHING;

-- 2. GEOGRAPHY: TAMIL NADU & CHENNAI
INSERT INTO states (id, code, state_code, name, status, mobility_enabled) VALUES
    ('10000000-0000-0000-0000-000000000033', 'TN', 33, 'Tamil Nadu', 'PILOT', FALSE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO cities (id, state_id, name, slug, status, timezone) VALUES
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000033', 'Chennai', 'chennai', 'PILOT', 'Asia/Kolkata')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO city_settings (
    id, city_id, mode_b_max_merchant_distance_km, jit_dispatch_lead_time_minutes,
    unbatching_delay_threshold_minutes, checkout_quote_ttl_seconds,
    mode_b_customer_discount_inr, mode_b_courier_extra_pickup_inr,
    mode_b_max_combined_weight_kg, mode_b_max_combined_volume_liters,
    merchant_accept_timeout_seconds, customer_cancel_free_window_seconds,
    surge_multiplier, platform_fee_inr
) VALUES (
    '21000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    1.50, 7, 12, 600, 25.00, 20.00, 12.00, 30.00, 180, 60, 1.00, 5.00
) ON CONFLICT (city_id) DO NOTHING;

-- 3. SERVICE ZONES (CHENNAI POSTGIS POLYGONS)
INSERT INTO zones (id, city_id, name, code, polygon, is_active) VALUES
    (
        '30000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000001',
        'T. Nagar Commercial & Residential Zone',
        'TN_CHE_TNAGAR',
        ST_GeomFromText('POLYGON((80.2200 13.0300, 80.2450 13.0300, 80.2450 13.0550, 80.2200 13.0550, 80.2200 13.0300))', 4326),
        TRUE
    ),
    (
        '30000000-0000-0000-0000-000000000002',
        '20000000-0000-0000-0000-000000000001',
        'Adyar South Zone',
        'TN_CHE_ADYAR',
        ST_GeomFromText('POLYGON((80.2450 12.9900, 80.2700 12.9900, 80.2700 13.0200, 80.2450 13.0200, 80.2450 12.9900))', 4326),
        TRUE
    ),
    (
        '30000000-0000-0000-0000-000000000003',
        '20000000-0000-0000-0000-000000000001',
        'Velachery Tech Corridor Zone',
        'TN_CHE_VELACHERY',
        ST_GeomFromText('POLYGON((80.2050 12.9650, 80.2300 12.9650, 80.2300 12.9950, 80.2050 12.9950, 80.2050 12.9650))', 4326),
        TRUE
    ),
    (
        '30000000-0000-0000-0000-000000000004',
        '20000000-0000-0000-0000-000000000001',
        'Anna Nagar North Zone',
        'TN_CHE_ANNANAGAR',
        ST_GeomFromText('POLYGON((80.1950 13.0700, 80.2250 13.0700, 80.2250 13.1000, 80.1950 13.1000, 80.1950 13.0700))', 4326),
        TRUE
    )
ON CONFLICT (city_id, code) DO NOTHING;

-- 4. SAMPLE SEED USERS
INSERT INTO users (id, phone, email, full_name, status, firebase_uid, default_language) VALUES
    ('40000000-0000-0000-0000-000000000001', '+919840011111', 'admin.chennai@allgo.in', 'Chennai Operations Admin', 'ACTIVE', 'firebase_admin_001', 'en'),
    ('40000000-0000-0000-0000-000000000002', '+919840022222', 'karthik.customer@example.com', 'Karthik Subramanian', 'ACTIVE', 'firebase_cust_001', 'ta'),
    ('40000000-0000-0000-0000-000000000003', '+919840033333', 'selvam.partner@example.com', 'Selvam R (Courier Partner)', 'ACTIVE', 'firebase_part_001', 'ta'),
    ('40000000-0000-0000-0000-000000000004', '+919840044444', 'murugan.merchant@example.com', 'Murugan Idli Owner', 'ACTIVE', 'firebase_merch_001', 'ta')
ON CONFLICT (phone) DO NOTHING;

-- User Roles
INSERT INTO user_roles (user_id, role_id) VALUES
    ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004'),
    ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001'),
    ('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002'),
    ('40000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003')
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Wallets
INSERT INTO wallets (id, user_id, balance_inr, currency) VALUES
    ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 150.00, 'INR')
ON CONFLICT (user_id) DO NOTHING;

-- Delivery Customer Address
INSERT INTO addresses (
    id, user_id, label, recipient_name, recipient_phone,
    address_line1, address_line2, landmark, city, state, postal_code, location, is_default
) VALUES (
    '51000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000002',
    'HOME',
    'Karthik Subramanian',
    '+919840022222',
    'Flat 3B, Shanthi Nilayam, North Usman Road',
    'T. Nagar',
    'Opposite Panagal Park',
    'Chennai',
    'Tamil Nadu',
    '600017',
    ST_GeomFromText('POINT(80.2341 13.0418)', 4326),
    TRUE
) ON CONFLICT DO NOTHING;

-- 5. DELIVERY PARTNER SETUP (MODE B EQUIPMENT VERIFIED)
INSERT INTO partners (
    id, user_id, status, background_checked, equipment_verified,
    cash_in_hand_inr, cash_in_hand_limit_inr, rating_average, rating_count
) VALUES (
    '60000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000003',
    'ACTIVE',
    TRUE,
    TRUE,
    250.00,
    2000.00,
    4.90,
    142
) ON CONFLICT DO NOTHING;

INSERT INTO vehicles (
    id, partner_id, vehicle_type, registration_number, make_model,
    rc_verified, insurance_verified, commercial_permit_verified, is_active
) VALUES (
    '61000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    'MOTORCYCLE',
    'TN-09-CB-1234',
    'Hero Splendor Plus',
    TRUE,
    TRUE,
    TRUE,
    TRUE
) ON CONFLICT (registration_number) DO NOTHING;

INSERT INTO partner_modes (
    id, partner_id, current_mode, is_online, active_vertical_lock
) VALUES (
    '62000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    'DELIVERIES_ONLY',
    TRUE,
    NULL
) ON CONFLICT (partner_id) DO NOTHING;

-- 6. MERCHANTS & OUTLETS (FOOD & GROCERY PROXIMATE <= 1.5 KM FOR MODE B)
-- Merchant 1: Murugan Idli Shop (Food)
INSERT INTO merchants (
    id, owner_id, business_name, trade_name, merchant_type,
    pan_number, gstin, fssai_license_number, status,
    commission_rate_percentage, bank_penny_drop_verified
) VALUES (
    '70000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000004',
    'Murugan Idli Food Pvt Ltd',
    'Murugan Idli Shop T. Nagar',
    'RESTAURANT',
    'AABCM1234F',
    '33AABCM1234F1Z5',
    '12419008000456',
    'LIVE',
    15.00,
    TRUE
) ON CONFLICT DO NOTHING;

-- Outlet 1: Murugan Idli Shop T. Nagar
INSERT INTO outlets (
    id, merchant_id, zone_id, outlet_name, address_line1, address_line2,
    postal_code, location, is_open, default_prep_time_minutes, packaging_fee_inr, phone
) VALUES (
    '71000000-0000-0000-0000-000000000001',
    '70000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'Murugan Idli Shop - T. Nagar Outlet',
    'No. 46, GN Chetty Road',
    'T. Nagar',
    '600017',
    ST_GeomFromText('POINT(80.2337 13.0418)', 4326),
    TRUE,
    15,
    15.00,
    '+919840044444'
) ON CONFLICT DO NOTHING;

-- Merchant 2: Nilgiris Supermarket & Quick Commerce (Grocery)
INSERT INTO merchants (
    id, owner_id, business_name, trade_name, merchant_type,
    pan_number, gstin, fssai_license_number, status,
    commission_rate_percentage, bank_penny_drop_verified
) VALUES (
    '70000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000004',
    'Nilgiris Franchise Retail TN Pvt Ltd',
    'Nilgiris T. Nagar Dark Store',
    'GROCERY_STORE',
    'AABCN5678G',
    '33AABCN5678G1Z2',
    '12421008000789',
    'LIVE',
    10.00,
    TRUE
) ON CONFLICT DO NOTHING;

-- Outlet 2: Nilgiris T. Nagar Outlet (~250m from Murugan Idli Shop -> Mode B eligible)
INSERT INTO outlets (
    id, merchant_id, zone_id, outlet_name, address_line1, address_line2,
    postal_code, location, is_open, default_prep_time_minutes, packaging_fee_inr, phone
) VALUES (
    '71000000-0000-0000-0000-000000000002',
    '70000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001',
    'Nilgiris Quick Commerce - T. Nagar Hub',
    'No. 12, Thirumalai Pillai Road',
    'T. Nagar',
    '600017',
    ST_GeomFromText('POINT(80.2355 13.0430)', 4326),
    TRUE,
    5,
    10.00,
    '+919840055555'
) ON CONFLICT DO NOTHING;

-- 7. CATALOGS & CATEGORIES
-- Restaurant Catalog
INSERT INTO catalogs (id, outlet_id, name, vertical_type, is_active) VALUES
    ('80000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', 'Murugan Idli Traditional Menu', 'FOOD', TRUE),
    ('80000000-0000-0000-0000-000000000002', '71000000-0000-0000-0000-000000000002', 'Nilgiris Daily Express Catalog', 'GROCERY', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO categories (id, catalog_id, name, display_order, is_active) VALUES
    ('81000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 'Breakfast & Tiffin Specials', 1, TRUE),
    ('81000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000001', 'Beverages', 2, TRUE),
    ('81000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000002', 'Rice, Staples & Oils', 1, TRUE),
    ('81000000-0000-0000-0000-000000000004', '80000000-0000-0000-0000-000000000002', 'Dairy & Perishables', 2, TRUE)
ON CONFLICT DO NOTHING;

-- 8. CATALOG ITEMS & BILINGUAL TRANSLATIONS (TAMIL 'ta' & ENGLISH 'en')
-- Item 1: Ghee Podi Idli (Food)
INSERT INTO items (
    id, category_id, sku, name, description, base_price_inr,
    is_veg, is_perishable, preparation_time_minutes, gst_rate_percentage, is_active
) VALUES (
    '90000000-0000-0000-0000-000000000001',
    '81000000-0000-0000-0000-000000000001',
    'FOOD-IDLI-001',
    'Ghee Podi Idli (4 Pcs)',
    'Steamed button idlis tossed generously in authentic spiced gun powder and pure country ghee. Served with 4 chutneys.',
    120.00,
    TRUE,
    FALSE,
    12,
    5.00,
    TRUE
) ON CONFLICT DO NOTHING;

INSERT INTO item_translations (item_id, language_code, name, description) VALUES
    (
        '90000000-0000-0000-0000-000000000001',
        'en',
        'Ghee Podi Idli (4 Pcs)',
        'Steamed button idlis tossed generously in authentic spiced gun powder and pure country ghee. Served with 4 chutneys.'
    ),
    (
        '90000000-0000-0000-0000-000000000001',
        'ta',
        'நெய் பொடி இட்லி (4 துண்டுகள்)',
        'சுவையான மினி இட்லிகள் தூய நாட்டு நெய் மற்றும் காரசாரமான இட்லி பொடியில் பிரட்டப்பட்டு 4 வகை சட்னிகளுடன் பரிமாறப்படுகிறது.'
    )
ON CONFLICT (item_id, language_code) DO NOTHING;

-- Item 2: Medu Vada (Food)
INSERT INTO items (
    id, category_id, sku, name, description, base_price_inr,
    is_veg, is_perishable, preparation_time_minutes, gst_rate_percentage, is_active
) VALUES (
    '90000000-0000-0000-0000-000000000002',
    '81000000-0000-0000-0000-000000000001',
    'FOOD-VADA-002',
    'Crispy Medu Vada (2 Pcs)',
    'Golden-crisp exterior and fluffy center spiced with crushed black pepper, ginger, and curry leaves.',
    80.00,
    TRUE,
    FALSE,
    10,
    5.00,
    TRUE
) ON CONFLICT DO NOTHING;

INSERT INTO item_translations (item_id, language_code, name, description) VALUES
    (
        '90000000-0000-0000-0000-000000000002',
        'en',
        'Crispy Medu Vada (2 Pcs)',
        'Golden-crisp exterior and fluffy center spiced with crushed black pepper, ginger, and curry leaves.'
    ),
    (
        '90000000-0000-0000-0000-000000000002',
        'ta',
        'மொறுமொறு மெது வடை (2 துண்டுகள்)',
        'மிளகு, சீரகம் மற்றும் கறிவேப்பிலை மணத்துடன் கூடிய பொன்னிற மொறுமொறு மெது வடை.'
    )
ON CONFLICT (item_id, language_code) DO NOTHING;

-- Item 3: Filter Coffee (Food)
INSERT INTO items (
    id, category_id, sku, name, description, base_price_inr,
    is_veg, is_perishable, preparation_time_minutes, gst_rate_percentage, is_active
) VALUES (
    '90000000-0000-0000-0000-000000000003',
    '81000000-0000-0000-0000-000000000002',
    'FOOD-COF-003',
    'Traditional Kumbakonam Degree Filter Coffee',
    'Authentic South Indian chicory-blended decoction brewed with fresh full-fat milk.',
    45.00,
    TRUE,
    FALSE,
    5,
    5.00,
    TRUE
) ON CONFLICT DO NOTHING;

INSERT INTO item_translations (item_id, language_code, name, description) VALUES
    (
        '90000000-0000-0000-0000-000000000003',
        'en',
        'Traditional Kumbakonam Degree Filter Coffee',
        'Authentic South Indian chicory-blended decoction brewed with fresh full-fat milk.'
    ),
    (
        '90000000-0000-0000-0000-000000000003',
        'ta',
        'பாரம்பரிய கும்பகோணம் டிகிரி பில்டர் காபி',
        'தூய பசும்பாலில் மணக்க மணக்க தயாரிக்கப்பட்ட பாரம்பரிய தென்னிந்திய டிகிரி காபி.'
    )
ON CONFLICT (item_id, language_code) DO NOTHING;

-- Item 4: Ponni Boiled Rice (Grocery)
INSERT INTO items (
    id, category_id, sku, name, description, base_price_inr,
    is_veg, is_perishable, preparation_time_minutes, gst_rate_percentage, is_active
) VALUES (
    '90000000-0000-0000-0000-000000000004',
    '81000000-0000-0000-0000-000000000003',
    'GROC-RICE-001',
    'Ponni Boiled Rice 5kg Premium Bag',
    'Aged Tanjore delta Ponni parboiled rice, light, non-sticky and ideal for South Indian lunches.',
    340.00,
    TRUE,
    FALSE,
    5,
    0.00,
    TRUE
) ON CONFLICT DO NOTHING;

INSERT INTO item_translations (item_id, language_code, name, description) VALUES
    (
        '90000000-0000-0000-0000-000000000004',
        'en',
        'Ponni Boiled Rice 5kg Premium Bag',
        'Aged Tanjore delta Ponni parboiled rice, light, non-sticky and ideal for South Indian lunches.'
    ),
    (
        '90000000-0000-0000-0000-000000000004',
        'ta',
        'பொன்னி புழுங்கல் அரிசி 5கிலோ பை',
        'தஞ்சாவூர் டெல்டா பகுதியில் விளைந்த உயர் ரக பொன்னி புழுங்கல் அரிசி.'
    )
ON CONFLICT (item_id, language_code) DO NOTHING;

-- Item 5: Cold Pressed Sesame Oil (Grocery)
INSERT INTO items (
    id, category_id, sku, name, description, base_price_inr,
    is_veg, is_perishable, preparation_time_minutes, gst_rate_percentage, is_active
) VALUES (
    '90000000-0000-0000-0000-000000000005',
    '81000000-0000-0000-0000-000000000003',
    'GROC-OIL-002',
    'Cold Pressed Gingelly Sesame Oil 1 Litre Bottle',
    'Wood cold-pressed unrefined sesame gingelly oil with natural palm jaggery aroma.',
    260.00,
    TRUE,
    FALSE,
    5,
    5.00,
    TRUE
) ON CONFLICT DO NOTHING;

INSERT INTO item_translations (item_id, language_code, name, description) VALUES
    (
        '90000000-0000-0000-0000-000000000005',
        'en',
        'Cold Pressed Gingelly Sesame Oil 1 Litre Bottle',
        'Wood cold-pressed unrefined sesame gingelly oil with natural palm jaggery aroma.'
    ),
    (
        '90000000-0000-0000-0000-000000000005',
        'ta',
        'மரச்செக்கு சுத்தமான நல்லெண்ணெய் 1லிட்டர் பாட்டில்',
        'பனைவெல்லம் சேர்த்து பாரம்பரிய மரச்செக்கில் ஆட்டப்பட்ட சுத்தமான நல்லெண்ணெய்.'
    )
ON CONFLICT (item_id, language_code) DO NOTHING;

-- Item 6: Aavin Fresh Milk (Grocery Perishable - Cold)
INSERT INTO items (
    id, category_id, sku, name, description, base_price_inr,
    is_veg, is_perishable, preparation_time_minutes, gst_rate_percentage, is_active
) VALUES (
    '90000000-0000-0000-0000-000000000006',
    '81000000-0000-0000-0000-000000000004',
    'GROC-MILK-003',
    'Aavin Fresh Pasteurized Full Cream Milk 500ml',
    'Chilled pasteurized premium cow milk, kept under strict cold storage at 4 degrees Celsius.',
    30.00,
    TRUE,
    TRUE,
    3,
    0.00,
    TRUE
) ON CONFLICT DO NOTHING;

INSERT INTO item_translations (item_id, language_code, name, description) VALUES
    (
        '90000000-0000-0000-0000-000000000006',
        'en',
        'Aavin Fresh Pasteurized Full Cream Milk 500ml',
        'Chilled pasteurized premium cow milk, kept under strict cold storage at 4 degrees Celsius.'
    ),
    (
        '90000000-0000-0000-0000-000000000006',
        'ta',
        'ஆவின் பசும்பால் 500மி.லி பாக்கெட்',
        'குளிர்சாதன பாதுகாப்பில் வைக்கப்பட்ட சுத்தமான பசும்பால் பாக்கெட்.'
    )
ON CONFLICT (item_id, language_code) DO NOTHING;

-- 9. INVENTORY SEEDING
INSERT INTO inventory (outlet_id, item_id, stock_quantity, reserved_quantity, is_in_stock, low_stock_threshold) VALUES
    ('71000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 100, 0, TRUE, 10),
    ('71000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000002', 80, 0, TRUE, 10),
    ('71000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000003', 150, 0, TRUE, 15),
    ('71000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000004', 50, 0, TRUE, 5),
    ('71000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000005', 40, 0, TRUE, 5),
    ('71000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000006', 75, 0, TRUE, 10)
ON CONFLICT (outlet_id, item_id) DO NOTHING;

-- 10. DYNAMIC TAX ENGINE RULES
INSERT INTO tax_rules (
    id, vertical_type, rule_name, section_code,
    gst_rate_percentage, applies_to_delivery_fee, effective_from, is_active
) VALUES
    (
        '95000000-0000-0000-0000-000000000001',
        'FOOD',
        'Restaurant Food Service GST under Section 9(5)',
        '9(5)',
        5.00,
        FALSE,
        NOW() - INTERVAL '30 days',
        TRUE
    ),
    (
        '95000000-0000-0000-0000-000000000002',
        'GROCERY',
        'E-Commerce Operator TCS under Section 52',
        '52_TCS',
        0.50,
        FALSE,
        NOW() - INTERVAL '30 days',
        TRUE
    ),
    (
        '95000000-0000-0000-0000-000000000003',
        'FOOD',
        'TDS on E-Commerce Participants under Section 194-O',
        '194_O_TDS',
        0.10,
        FALSE,
        NOW() - INTERVAL '30 days',
        TRUE
    ),
    (
        '95000000-0000-0000-0000-000000000004',
        'GROCERY',
        'TDS on E-Commerce Participants under Section 194-O',
        '194_O_TDS',
        0.10,
        FALSE,
        NOW() - INTERVAL '30 days',
        TRUE
    ),
    (
        '95000000-0000-0000-0000-000000000005',
        'PARCEL',
        'Standard Logistics Delivery Service GST',
        'DELIVERY_GST',
        18.00,
        TRUE,
        NOW() - INTERVAL '30 days',
        TRUE
    )
ON CONFLICT DO NOTHING;

