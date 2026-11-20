import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { ConfigService } from '../../apps/api/dist/config/config.service.js';
import { DatabaseService } from '../../apps/api/dist/database/database.service.js';
import { RedisService } from '../../apps/api/dist/redis/redis.service.js';
import { ZonesService } from '../../apps/api/dist/zones/zones.service.js';
import { DiscoveryService } from '../../apps/api/dist/discovery/discovery.service.js';
import { PricingService } from '../../apps/api/dist/ordering/services/pricing.service.js';
import { CouponsService } from '../../apps/api/dist/ordering/services/coupons.service.js';

describe('Phase 6: Multi-Vertical Search, Service Zones, Dynamic Pricing & Promotional Engine', () => {
  let db: DatabaseService;
  let redis: RedisService;
  let zonesService: ZonesService;
  let discoveryService: DiscoveryService;
  let pricingService: PricingService;
  let couponsService: CouponsService;

  // Test identifiers
  const cityId = '20000000-0000-0000-0000-000000000001'; // Chennai
  const testAdminId = '99999999-9999-9999-9999-000000000001';
  const testCustomerId = '99999999-9999-9999-9999-000000000002';
  const testCustomerWithOrdersId = '99999999-9999-9999-9999-000000000003';
  const testMerchantOwnerId = '99999999-9999-9999-9999-000000000004';

  let createdZoneIdA: string;
  let createdZoneIdB: string;
  let testMerchantId: string;
  let testOutletId: string;
  let testItemId: string;
  let testOrderGroupId: string;
  let testBarcode = '890103' + Date.now().toString().slice(-7);

  let isLiveAvailable = false;
  before(async () => {
    const config = new ConfigService();
    db = new DatabaseService(config);
    redis = new RedisService(config);

    await db.onModuleInit();
    await redis.onModuleInit();
    try {
      await db.query("SELECT 1;");
      isLiveAvailable = true;
    } catch {
      isLiveAvailable = false;
    }
    if (!isLiveAvailable) {
      return;
    }


    zonesService = new ZonesService(db);
    discoveryService = new DiscoveryService(db, redis);
    couponsService = new CouponsService(db);
    pricingService = new PricingService(db, couponsService);

    // Clean previous P6 coupons & redemptions if any
    await db.query(`DELETE FROM coupon_redemptions WHERE coupon_id IN (SELECT id FROM coupons WHERE code LIKE 'P6_%');`);
    await db.query(`DELETE FROM coupons WHERE code LIKE 'P6_%';`);

    // Seed test users
    await db.query(
      `INSERT INTO users (id, firebase_uid, phone, full_name, status, default_language)
       VALUES 
         ($1, 'fb_admin_p6', '+919800000001', 'Phase6 Admin', 'ACTIVE', 'en'),
         ($2, 'fb_cust_p6_new', '+919800000002', 'Phase6 New Customer', 'ACTIVE', 'en'),
         ($3, 'fb_cust_p6_existing', '+919800000003', 'Phase6 Existing Customer', 'ACTIVE', 'en'),
         ($4, 'fb_merch_p6', '+919800000004', 'Phase6 Merchant Owner', 'ACTIVE', 'en')
       ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE';`,
      [testAdminId, testCustomerId, testCustomerWithOrdersId, testMerchantOwnerId]
    );

    // Seed test merchant and outlet
    const merchRes = await db.query(
      `INSERT INTO merchants (owner_id, business_name, merchant_type, pan_number, status, commission_rate_percentage)
       VALUES ($1, 'Phase 6 Buhari Biryani Kitchen', 'RESTAURANT', 'P6PAN1234F', 'APPROVED', 15.00)
       RETURNING id;`,
      [testMerchantOwnerId]
    );
    testMerchantId = merchRes.rows[0].id;

    // Location: Anna Nagar Roundabout (80.2150, 13.0850)
    const outletRes = await db.query(
      `INSERT INTO outlets (merchant_id, zone_id, outlet_name, address_line1, postal_code, location, outlet_status, is_open, phone)
       VALUES ($1, '30000000-0000-0000-0000-000000000004', 'Buhari Royal Biryani Outlet', '12 2nd Avenue, Anna Nagar', '600040',
               ST_SetSRID(ST_MakePoint(80.2150, 13.0850), 4326), 'ACTIVE', TRUE, '+919988776655')
       RETURNING id;`,
      [testMerchantId]
    );
    testOutletId = outletRes.rows[0].id;

    // Seed a dummy completed order for testCustomerWithOrdersId to verify new_customer_only coupon gating
    const existingOrders = await db.query(
      `SELECT so.id FROM sub_orders so
       JOIN order_groups og ON og.id = so.order_group_id
       WHERE og.customer_id = $1 LIMIT 1;`,
      [testCustomerWithOrdersId]
    );

    if (existingOrders.rows.length === 0) {
      let orderGroupId: string;
      const existingOg = await db.query(
        `SELECT id FROM order_groups WHERE customer_id = $1 LIMIT 1;`,
        [testCustomerWithOrdersId]
      );

      if (existingOg.rows.length > 0) {
        orderGroupId = existingOg.rows[0].id;
      } else {
        const addrRes = await db.query(
          `INSERT INTO addresses (user_id, label, recipient_name, recipient_phone, address_line1, postal_code, city, state, location)
           VALUES ($1, 'HOME', 'Existing Customer', '+919800000003', '10 Test Street', '600001', 'Chennai', 'Tamil Nadu', ST_SetSRID(ST_MakePoint(80.20, 13.08), 4326))
           RETURNING id;`,
          [testCustomerWithOrdersId]
        );
        const existingAddrId = addrRes.rows[0].id;

        const sessionRes = await db.query(
          `INSERT INTO checkout_sessions (
             customer_id, delivery_address_id, total_item_amount_inr, total_delivery_fee_inr,
             total_packaging_fee_inr, platform_fee_inr, total_tax_inr, final_payable_amount_inr,
             status, selected_fulfillment_mode, expires_at
           ) VALUES (
             $1, $2, 200.00, 30.00, 10.00, 5.00, 5.00, 250.00,
             'CONVERTED', 'SEPARATE', NOW() + INTERVAL '1 hour'
           ) RETURNING id;`,
          [testCustomerWithOrdersId, existingAddrId]
        );

        const orderGroupNum = `GRP-P6-${Date.now()}`;
        const ogRes = await db.query(
          `INSERT INTO order_groups (
             customer_id, checkout_session_id, delivery_address_id, order_group_number,
             status, total_items_amount_inr, total_delivery_fees_inr, total_packaging_fees_inr,
             platform_fee_inr, total_tax_amount_inr, total_discount_amount_inr, total_paid_amount_inr,
             fulfillment_mode
           ) VALUES (
             $1, $2, $3, $4,
             'CONFIRMED', 200.00, 30.00, 10.00, 5.00, 5.00, 0.00, 250.00, 'SEPARATE'
           ) RETURNING id;`,
          [testCustomerWithOrdersId, sessionRes.rows[0].id, existingAddrId, orderGroupNum]
        );
        orderGroupId = ogRes.rows[0].id;
      }

      const subOrderNum = `SUB-P6-${Date.now()}`;
      await db.query(
        `INSERT INTO sub_orders (
           order_group_id, outlet_id, sub_order_number, status, vertical_type,
           items_total_inr, delivery_fee_inr, packaging_fee_inr, platform_fee_inr,
           tax_total_inr, discount_allocated_inr, total_payable_inr, delivery_address_snapshot,
           merchant_commission_inr, merchant_net_payout_inr
         ) VALUES (
           $1, $2, $3, 'DELIVERED', 'FOOD',
           200.00, 30.00, 10.00, 5.00, 5.00, 0.00, 250.00, '{"addressLine1": "Test Address"}'::jsonb,
           30.00, 170.00
         ) RETURNING id;`,
        [orderGroupId, testOutletId, subOrderNum]
      );
    }

    const ogCheck = await db.query(
      `SELECT id FROM order_groups WHERE customer_id = $1 LIMIT 1;`,
      [testCustomerWithOrdersId]
    );
    testOrderGroupId = ogCheck.rows[0].id;

    // Catalog & Category
    const catRes = await db.query(
      `INSERT INTO catalogs (outlet_id, name, vertical_type, is_active)
       VALUES ($1, 'Royal Dining Menu', 'FOOD', TRUE)
       RETURNING id;`,
      [testOutletId]
    );
    const catalogId = catRes.rows[0].id;

    const categoryRes = await db.query(
      `INSERT INTO categories (catalog_id, name, is_active)
       VALUES ($1, 'Special Biryani & Tandoor', TRUE)
       RETURNING id;`,
      [catalogId]
    );
    const categoryId = categoryRes.rows[0].id;

    // Item: Royal Mutton Dum Biryani with Barcode
    const itemRes = await db.query(
      `INSERT INTO items (category_id, name, description, base_price_inr, is_veg, is_active, barcode)
       VALUES ($1, 'Royal Mutton Dum Biryani Feast', 'Signature aromatic Basmati rice dum cooked with tender goat mutton', 380.00, FALSE, TRUE, $2)
       RETURNING id;`,
      [categoryId, testBarcode]
    );
    testItemId = itemRes.rows[0].id;

    // Item 2: Paneer Tikka (Vegetarian)
    await db.query(
      `INSERT INTO items (category_id, name, description, base_price_inr, is_veg, is_active)
       VALUES ($1, 'Tandoori Paneer Tikka Platter', 'Marinated cottage cheese charred in tandoor', 220.00, TRUE, TRUE);`,
      [categoryId]
    );
  });

  after(async () => {
    if (!isLiveAvailable) { return; }
    // Clean test zones & settings
    if (createdZoneIdA) {
      await db.query(`DELETE FROM zone_service_settings WHERE zone_id = $1;`, [createdZoneIdA]);
      await db.query(`DELETE FROM outlet_zone_assignments WHERE zone_id = $1;`, [createdZoneIdA]);
      await db.query(`DELETE FROM zones WHERE id = $1;`, [createdZoneIdA]);
    }
    if (createdZoneIdB) {
      await db.query(`DELETE FROM zone_service_settings WHERE zone_id = $1;`, [createdZoneIdB]);
      await db.query(`DELETE FROM outlet_zone_assignments WHERE zone_id = $1;`, [createdZoneIdB]);
      await db.query(`DELETE FROM zones WHERE id = $1;`, [createdZoneIdB]);
    }

    await db.query(`DELETE FROM customer_search_history WHERE customer_id IN ($1, $2);`, [
      testCustomerId,
      testCustomerWithOrdersId,
    ]);
    await db.query(`DELETE FROM promotion_pricing_audit_logs WHERE actor_id = $1;`, [testAdminId]);
    await db.query(`DELETE FROM coupon_redemptions WHERE coupon_id IN (SELECT id FROM coupons WHERE code LIKE 'P6_%');`);
    await db.query(`DELETE FROM coupons WHERE code LIKE 'P6_%';`);

    await db.onModuleDestroy();
    await redis.onModuleDestroy();
  });

  it('1. should create valid PostGIS service zone and reject malformed/self-intersecting polygons', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip("Live PostgreSQL & Redis socket unreachable in sandbox");
      return;
    }
    // Valid Polygon covering Anna Nagar area
    const validPolygon = {
      type: 'Polygon',
      coordinates: [
        [
          [80.2000, 13.0700],
          [80.2300, 13.0700],
          [80.2300, 13.1000],
          [80.2000, 13.1000],
          [80.2000, 13.0700],
        ],
      ],
    };

    const created = await zonesService.createZone(
      {
        name: 'Anna Nagar Metro Zone',
        code: `P6_ZONE_ANNANAGAR_${Date.now()}`,
        cityId,
        polygonGeoJson: validPolygon,
        serviceSettings: [
          {
            verticalType: 'FOOD',
            isServiceEnabled: true,
            minOrderValueInr: 99.0,
            baseDeliveryFeeInr: 35.0,
            perKmFeeInr: 12.0,
            freeDeliveryDistanceKm: 3.0,
            maxServiceRadiusKm: 12.0,
            priority: 5,
          },
        ],
      },
      testAdminId
    );

    assert.ok(created.id, 'Zone must have generated UUID');
    assert.strictEqual(created.name, 'Anna Nagar Metro Zone');
    createdZoneIdA = created.id;

    // Self-intersecting "bowtie" polygon should be rejected by ST_IsValid
    const invalidBowtiePolygon = {
      type: 'Polygon',
      coordinates: [
        [
          [80.2000, 13.0700],
          [80.2300, 13.1000],
          [80.2000, 13.1000],
          [80.2300, 13.0700],
          [80.2000, 13.0700],
        ],
      ],
    };

    await assert.rejects(
      async () => {
        await zonesService.createZone({
          name: 'Invalid Bowtie Zone',
          code: `P6_INVALID_${Date.now()}`,
          cityId,
          polygonGeoJson: invalidBowtiePolygon,
        });
      },
      (err: any) => {
        assert.ok(err.message.includes('Invalid polygon geometry'), 'Must reject self-intersecting polygon');
        return true;
      }
    );
  });

  it('2. should deterministically resolve overlapping zones using priority and tie-breaker', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip("Live PostgreSQL & Redis socket unreachable in sandbox");
      return;
    }
    // Create inner micro-zone with higher priority (15 vs 5)
    const innerMicroZone = {
      type: 'Polygon',
      coordinates: [
        [
          [80.2100, 13.0800],
          [80.2250, 13.0800],
          [80.2250, 13.0950],
          [80.2100, 13.0950],
          [80.2100, 13.0800],
        ],
      ],
    };

    const zoneB = await zonesService.createZone(
      {
        name: 'Anna Nagar Prime Hub',
        code: `P6_ZONE_PRIME_${Date.now()}`,
        cityId,
        polygonGeoJson: innerMicroZone,
        serviceSettings: [
          {
            verticalType: 'FOOD',
            isServiceEnabled: true,
            minOrderValueInr: 149.0,
            baseDeliveryFeeInr: 45.0,
            priority: 15, // Higher priority than Zone A (5)
          },
        ],
      },
      testAdminId
    );
    createdZoneIdB = zoneB.id;

    // Location inside BOTH Zone A and Zone B (80.2150, 13.0850)
    const result = await zonesService.checkServiceability(13.0850, 80.2150, 'FOOD');
    assert.strictEqual(result.isServiceable, true);
    assert.strictEqual(
      result.zone.id,
      createdZoneIdB,
      'Higher priority zone (15) must be selected over lower priority zone (5)'
    );
    assert.strictEqual(result.serviceSettings.baseDeliveryFeeInr, 45.0);
  });

  it('3. should enforce serviceability boundaries and vertical-specific gating', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip("Live PostgreSQL & Redis socket unreachable in sandbox");
      return;
    }
    // Inside zone
    const inside = await zonesService.checkServiceability(13.0850, 80.2150, 'FOOD');
    assert.strictEqual(inside.isServiceable, true);

    // Far outside zone (e.g., Sri Lanka / Indian Ocean: 6.0000, 80.0000)
    const outside = await zonesService.checkServiceability(6.0000, 80.0000, 'FOOD');
    assert.strictEqual(outside.isServiceable, false);
    assert.ok(outside.reason.includes('outside supported AllGo service zones'));

    // Disable GROCERY vertical in Zone B
    await zonesService.upsertZoneServiceSettings(
      createdZoneIdB,
      {
        verticalType: 'GROCERY',
        isServiceEnabled: false,
        priority: 15,
      },
      testAdminId
    );

    const groceryCheck = await zonesService.checkServiceability(13.0850, 80.2150, 'GROCERY');
    assert.strictEqual(groceryCheck.isServiceable, false);
    assert.ok(groceryCheck.reason.includes('disabled'));
  });

  it('4. should assign outlets to zones and list serviceable outlets', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip("Live PostgreSQL & Redis socket unreachable in sandbox");
      return;
    }
    // Assign test outlet to Zone B
    const assignResult = await zonesService.assignOutletsToZone(createdZoneIdB, [testOutletId], true);
    assert.strictEqual(assignResult.success, true);
    assert.strictEqual(assignResult.assignedCount, 1);

    // Fetch zone by ID and confirm assigned outlet
    const zoneWithOutlets = await zonesService.getZoneById(createdZoneIdB);
    assert.ok(zoneWithOutlets.assignedOutlets.some((o: any) => o.id === testOutletId));

    // Check serviceability returns the outlet
    const serv = await zonesService.checkServiceability(13.0850, 80.2150, 'FOOD');
    assert.ok(serv.eligibleOutletsCount >= 1);
    assert.ok(serv.eligibleOutlets.some((o: any) => o.id === testOutletId));
  });

  it('5. should execute PostgreSQL full-text and trigram multi-vertical search', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip("Live PostgreSQL & Redis socket unreachable in sandbox");
      return;
    }
    // A. Search by exact barcode
    const barcodeResult = await discoveryService.search({
      q: testBarcode,
      verticalType: 'FOOD',
    });
    assert.ok(barcodeResult.results.items.length >= 1, 'Should find item by barcode');
    assert.strictEqual(barcodeResult.results.items[0].id, testItemId);

    // B. Trigram fuzzy search with typo ("briyani feast")
    const fuzzyResult = await discoveryService.search({
      q: 'briyani feast',
      verticalType: 'FOOD',
    });
    assert.ok(fuzzyResult.results.items.length >= 1, 'Trigram search must match "Mutton Dum Biryani" on fuzzy query');
    assert.ok(
      fuzzyResult.results.items.some((i: any) => i.id === testItemId),
      'Must find the seeded test item in search results'
    );

    // C. Search outlet by name
    const outletSearchResult = await discoveryService.search({
      q: 'Buhari Royal',
      verticalType: 'FOOD',
    });
    assert.ok(outletSearchResult.results.outlets.length >= 1, 'Must find outlet by name');
    assert.ok(
      outletSearchResult.results.outlets.some((o: any) => o.id === testOutletId),
      'Must find the seeded test outlet in search results'
    );

    // D. Search category
    const catSearchResult = await discoveryService.search({
      q: 'Tandoor',
      verticalType: 'FOOD',
    });
    assert.ok(catSearchResult.results.categories.length >= 1, 'Must find category');
  });

  it('6. should strictly filter out unapproved merchants, inactive outlets, and respect dietary filters', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip("Live PostgreSQL & Redis socket unreachable in sandbox");
      return;
    }
    // Seed an inactive item
    const inactiveCat = await db.query(
      `SELECT id FROM categories WHERE catalog_id IN (SELECT id FROM catalogs WHERE outlet_id = $1);`,
      [testOutletId]
    );
    await db.query(
      `INSERT INTO items (category_id, name, base_price_inr, is_active)
       VALUES ($1, 'Secret Hidden Dish Ghostly', 500.00, FALSE);`,
      [inactiveCat.rows[0].id]
    );

    const hiddenSearch = await discoveryService.search({
      q: 'Ghostly',
      verticalType: 'FOOD',
    });
    assert.strictEqual(hiddenSearch.results.items.length, 0, 'Inactive items must never appear in search');

    // Dietary Filter: Veg only
    const vegSearch = await discoveryService.search({
      q: 'Platter',
      verticalType: 'FOOD',
      isVeg: true,
    });
    assert.ok(vegSearch.results.items.length >= 1);
    assert.ok(vegSearch.results.items.every((i: any) => i.is_veg === true), 'isVeg filter must exclude non-veg items');
  });

  it('7. should calculate zone-aware dynamic delivery pricing with free distance allowance', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip("Live PostgreSQL & Redis socket unreachable in sandbox");
      return;
    }
    // Configure Zone B settings: Base ₹40, Free 3 km, ₹10/km after
    await zonesService.upsertZoneServiceSettings(
      createdZoneIdB,
      {
        verticalType: 'FOOD',
        isServiceEnabled: true,
        baseDeliveryFeeInr: 40.0,
        freeDeliveryDistanceKm: 3.0,
        perKmFeeInr: 10.0,
        surgeMultiplier: 1.0,
        isSurgeActive: false,
        priority: 20,
      },
      testAdminId
    );

    // Cart: 1 Biryani (₹380)
    const cartItems = [{ item_id: testItemId, quantity: 1, selected_options: [] }];

    // Location inside Zone B (approx 1.5 km away from outlet): delivery fee should equal base fee ₹40
    const nearbyEstimate = await pricingService.calculateCheckoutTotals(
      cartItems,
      testOutletId,
      { latitude: 13.0870, longitude: 80.2170 },
      undefined,
      testCustomerId
    );

    assert.strictEqual(nearbyEstimate.deliveryFeeInr, 40.0, 'Nearby distance within 3km must cost base fee ₹40');
    assert.strictEqual(nearbyEstimate.zoneInfo?.zoneId, createdZoneIdB);
  });

  it('8. should enforce surge pricing multiplier bounds (1.0x-3.0x) and record mandatory admin audit logs', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip("Live PostgreSQL & Redis socket unreachable in sandbox");
      return;
    }
    // A. Reject surge multiplier > 3.0x or < 1.0x
    await assert.rejects(
      async () => {
        await zonesService.updateSurgePricing(
          createdZoneIdB,
          {
            surgeMultiplier: 4.5,
            isSurgeActive: true,
            reason: 'Excessive illegal surge',
          },
          testAdminId
        );
      },
      (err: any) => {
        assert.ok(err.message.includes('Surge multiplier must be between 1.00x and 3.00x'));
        return true;
      }
    );

    // B. Apply valid surge 1.8x with reason
    await zonesService.updateSurgePricing(
      createdZoneIdB,
      {
        surgeMultiplier: 1.8,
        isSurgeActive: true,
        reason: 'Heavy Monsoon Rain Surge',
        verticalType: 'FOOD',
      },
      testAdminId
    );

    // Check audit log was written
    const auditRes = await db.query(
      `SELECT * FROM promotion_pricing_audit_logs
       WHERE actor_id = $1 AND target_type = 'ZONE_SURGE' AND action = 'SURGE_ACTIVATED';`,
      [testAdminId]
    );
    assert.ok(auditRes.rows.length >= 1, 'Audit log must record surge activation');
    assert.strictEqual(auditRes.rows[0].reason, 'Heavy Monsoon Rain Surge');

    // Cart with surge: Base fee ₹40 * 1.8x surge = ₹72
    const cartItems = [{ item_id: testItemId, quantity: 1, selected_options: [] }];
    const surgedEstimate = await pricingService.calculateCheckoutTotals(
      cartItems,
      testOutletId,
      { latitude: 13.0870, longitude: 80.2170 },
      undefined,
      testCustomerId
    );

    assert.strictEqual(surgedEstimate.zoneInfo?.isSurgeActive, true);
    assert.strictEqual(surgedEstimate.zoneInfo?.surgeMultiplier, 1.8);
    // Base 40 * 1.8 = 72 (plus late night peak if test runs late night)
    assert.ok(
      surgedEstimate.deliveryFeeInr === 72.0 || surgedEstimate.deliveryFeeInr === 87.0,
      `Delivery fee must reflect 1.8x surge (was ${surgedEstimate.deliveryFeeInr})`
    );

    // Deactivate surge
    await zonesService.updateSurgePricing(
      createdZoneIdB,
      {
        surgeMultiplier: 1.0,
        isSurgeActive: false,
        reason: 'Rain subsided',
        verticalType: 'FOOD',
      },
      testAdminId
    );
  });

  it('9. should handle advanced promotions: auto-applied, first-time customer restriction, and global redemption caps', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip("Live PostgreSQL & Redis socket unreachable in sandbox");
      return;
    }
    // A. Auto-applied coupon: 10% off up to ₹50 for orders over ₹200
    const autoCoupon = await couponsService.createCoupon(
      {
        code: `P6_AUTO_${Date.now()}`,
        title: 'Auto 10% Discount',
        isAutoApplied: true,
        discountPercentage: 10,
        minOrderAmountInr: 200,
        maxDiscountInr: 50,
        validUntil: new Date(Date.now() + 86400000).toISOString(),
      },
      testAdminId
    );

    const cartItems = [{ item_id: testItemId, quantity: 1, selected_options: [] }]; // ₹380
    const autoEstimate = await pricingService.calculateCheckoutTotals(
      cartItems,
      testOutletId,
      { latitude: 13.0870, longitude: 80.2170 },
      undefined, // No coupon code passed
      testCustomerId
    );

    assert.strictEqual(autoEstimate.appliedCoupon?.code, autoCoupon.code);
    assert.strictEqual(autoEstimate.appliedCoupon?.discountInr, 38.0); // 10% of 380 = 38
    assert.strictEqual(autoEstimate.appliedCoupon?.isAutoApplied, true);

    // B. New Customer Only coupon
    const newCustomerCoupon = await couponsService.createCoupon(
      {
        code: `P6_NEWBIE_${Date.now()}`,
        title: 'First Order Special Flat ₹50',
        flatDiscountInr: 50.0,
        minOrderAmountInr: 100,
        newCustomerOnly: true,
        validUntil: new Date(Date.now() + 86400000).toISOString(),
      },
      testAdminId
    );

    // Customer with 0 orders -> Valid
    const validCheck = await couponsService.validateCoupon(
      newCustomerCoupon.code,
      testCustomerId,
      380.0,
      testOutletId
    );
    assert.strictEqual(validCheck.discountAmountInr, 50.0);

    // Customer with prior orders -> Rejected
    await assert.rejects(
      async () => {
        await couponsService.validateCoupon(
          newCustomerCoupon.code,
          testCustomerWithOrdersId,
          380.0,
          testOutletId
        );
      },
      (err: any) => {
        assert.ok(err.message.includes('first-time customers'));
        return true;
      }
    );

    // C. Global Redemption Cap: max 1 total redemption
    const cappedCoupon = await couponsService.createCoupon(
      {
        code: `P6_FLASH_${Date.now()}`,
        flatDiscountInr: 25.0,
        minOrderAmountInr: 50,
        maxTotalRedemptions: 1,
        validUntil: new Date(Date.now() + 86400000).toISOString(),
      },
      testAdminId
    );

    // First redemption succeeds
    await couponsService.redeemCoupon(db, cappedCoupon.id, testCustomerId, testOrderGroupId, 25.0);

    // Second redemption fails due to cap
    await assert.rejects(
      async () => {
        await couponsService.redeemCoupon(db, cappedCoupon.id, testCustomerId, testOrderGroupId, 25.0);
      },
      (err: any) => {
        assert.ok(err.message.includes('Coupon redemption cap reached'));
        return true;
      }
    );
  });

  it('10. should leverage Redis caching for live search suggestions and record customer search history', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip("Live PostgreSQL & Redis socket unreachable in sandbox");
      return;
    }
    // Suggestions
    const sugg1 = await discoveryService.getSuggestions({ q: 'Buhari' });
    assert.ok(sugg1.suggestions.length >= 1, 'Should find suggestions for "Buhari"');

    // Second call should return identical cached result
    const sugg2 = await discoveryService.getSuggestions({ q: 'Buhari' });
    assert.deepStrictEqual(sugg1, sugg2);

    // Authenticated search creates history entry
    await discoveryService.search(
      {
        q: 'Royal Biryani Feast',
        verticalType: 'FOOD',
      },
      testCustomerId
    );

    const history = await discoveryService.getSearchHistory(testCustomerId);
    assert.ok(history.length >= 1);
    assert.strictEqual(history[0].query_text, 'Royal Biryani Feast');

    // Clear history
    await discoveryService.clearSearchHistory(testCustomerId);
    const clearedHistory = await discoveryService.getSearchHistory(testCustomerId);
    assert.strictEqual(clearedHistory.length, 0);
  });
});
