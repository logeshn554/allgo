import assert from 'node:assert';
import { after, before, describe, it } from 'node:test';
import { CatalogService } from '../../services/api/dist/catalog/catalog.service.js';
import { OperatingHoursService } from '../../services/api/dist/catalog/operating-hours.service.js';
import { EncryptionService } from '../../services/api/dist/common/encryption/encryption.service.js';
import { ConfigService } from '../../services/api/dist/config/config.service.js';
import { DatabaseService } from '../../services/api/dist/database/database.service.js';
import { MerchantService } from '../../services/api/dist/merchant/merchant.service.js';
import { RedisService } from '../../services/api/dist/redis/redis.service.js';
import { StorageService } from '../../services/api/dist/storage/storage.service.js';

describe('Phase 3: Catalog, Food Menus, Operating Hours & Multi-Outlet Integration Suite', () => {
  let config: ConfigService;
  let db: DatabaseService;
  let redis: RedisService;
  let encryptionService: EncryptionService;
  let storageService: StorageService;
  let merchantService: MerchantService;
  let catalogService: CatalogService;
  let operatingHoursService: OperatingHoursService;

  const merchantOwnerId = '00000000-0000-0000-0000-000000000031';
  const otherMerchantOwnerId = '00000000-0000-0000-0000-000000000032';
  const adminUserId = '00000000-0000-0000-0000-000000000099';

  let testMerchantId: string;
  let primaryOutletId: string;
  let secondaryOutletId: string;
  let otherOutletId: string;

  let isLiveAvailable = false;
  before(async () => {
    config = new ConfigService();
    db = new DatabaseService(config);
    redis = new RedisService(config);
    await db.onModuleInit();
    await redis.onModuleInit();
    try {
      await db.query('SELECT 1;');
      isLiveAvailable = true;
    } catch {
      isLiveAvailable = false;
    }
    if (!isLiveAvailable) {
      return;
    }

    encryptionService = new EncryptionService();
    encryptionService.initializeKeys();
    storageService = new StorageService(db as any);
    merchantService = new MerchantService(
      db as any,
      redis as any,
      encryptionService,
      storageService,
    );
    catalogService = new CatalogService(db as any);
    operatingHoursService = new OperatingHoursService(db as any);

    // Clean previous records
    try {
      await db.query(
        `DELETE FROM outlet_item_overrides WHERE outlet_id IN (SELECT id FROM outlets WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id IN ('${merchantOwnerId}', '${otherMerchantOwnerId}')));`,
      );
      await db.query(
        `DELETE FROM outlet_special_closures WHERE outlet_id IN (SELECT id FROM outlets WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id IN ('${merchantOwnerId}', '${otherMerchantOwnerId}')));`,
      );
      await db.query(
        `DELETE FROM outlet_operating_hours WHERE outlet_id IN (SELECT id FROM outlets WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id IN ('${merchantOwnerId}', '${otherMerchantOwnerId}')));`,
      );
      await db.query(
        `DELETE FROM item_options WHERE option_group_id IN (SELECT id FROM item_option_groups WHERE item_id IN (SELECT id FROM items WHERE category_id IN (SELECT id FROM categories WHERE catalog_id IN (SELECT id FROM catalogs WHERE outlet_id IN (SELECT id FROM outlets WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id IN ('${merchantOwnerId}', '${otherMerchantOwnerId}')))))));`,
      );
      await db.query(
        `DELETE FROM item_option_groups WHERE item_id IN (SELECT id FROM items WHERE category_id IN (SELECT id FROM categories WHERE catalog_id IN (SELECT id FROM catalogs WHERE outlet_id IN (SELECT id FROM outlets WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id IN ('${merchantOwnerId}', '${otherMerchantOwnerId}'))))));`,
      );
      await db.query(
        `DELETE FROM item_variants WHERE item_id IN (SELECT id FROM items WHERE category_id IN (SELECT id FROM categories WHERE catalog_id IN (SELECT id FROM catalogs WHERE outlet_id IN (SELECT id FROM outlets WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id IN ('${merchantOwnerId}', '${otherMerchantOwnerId}'))))));`,
      );
      await db.query(
        `DELETE FROM inventory WHERE outlet_id IN (SELECT id FROM outlets WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id IN ('${merchantOwnerId}', '${otherMerchantOwnerId}')));`,
      );
      await db.query(
        `DELETE FROM items WHERE category_id IN (SELECT id FROM categories WHERE catalog_id IN (SELECT id FROM catalogs WHERE outlet_id IN (SELECT id FROM outlets WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id IN ('${merchantOwnerId}', '${otherMerchantOwnerId}')))));`,
      );
      await db.query(
        `DELETE FROM categories WHERE catalog_id IN (SELECT id FROM catalogs WHERE outlet_id IN (SELECT id FROM outlets WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id IN ('${merchantOwnerId}', '${otherMerchantOwnerId}'))));`,
      );
      await db.query(
        `DELETE FROM catalogs WHERE outlet_id IN (SELECT id FROM outlets WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id IN ('${merchantOwnerId}', '${otherMerchantOwnerId}')));`,
      );
      await db.query(
        `DELETE FROM outlets WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id IN ('${merchantOwnerId}', '${otherMerchantOwnerId}'));`,
      );
      await db.query(
        `DELETE FROM merchants WHERE owner_id IN ('${merchantOwnerId}', '${otherMerchantOwnerId}');`,
      );
    } catch {}

    // Seed users
    await db.query(`
      INSERT INTO users (id, phone, full_name, status, firebase_uid)
      VALUES 
        ('${merchantOwnerId}', '+919876530001', 'Phase 3 Merchant Owner', 'ACTIVE', 'fb-p3-merch-1'),
        ('${otherMerchantOwnerId}', '+919876530002', 'Phase 3 Other Merchant Owner', 'ACTIVE', 'fb-p3-merch-2'),
        ('${adminUserId}', '+919876530099', 'Phase 3 Admin', 'ACTIVE', 'fb-p3-admin-1')
      ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE';
    `);

    // Register test merchant 1
    const reg1 = await merchantService.registerOrUpdate(merchantOwnerId, {
      businessName: 'Spice Symphony Indian Bistro',
      merchantType: 'RESTAURANT',
      panNumber: 'ABCDE5432G',
      bankAccountNumber: '50100888888888',
      bankIfsc: 'HDFC0001234',
      bankBeneficiaryName: 'Spice Symphony Pvt Ltd',
      outletName: 'Spice Symphony Primary Central',
      addressLine1: '12 Cathedral Road',
      postalCode: '600086',
      latitude: 13.0475,
      longitude: 80.252,
      phone: '+919876530001',
    } as any);
    testMerchantId = reg1.merchant.id;
    primaryOutletId = reg1.outlet.id;

    // Approve merchant and activate primary outlet
    await merchantService.updateAdminMerchantStatus(
      testMerchantId,
      'APPROVED',
      'Phase 3 verified merchant',
    );

    // Create secondary outlet for merchant 1
    const branch2 = await merchantService.createOutlet(merchantOwnerId, {
      outletName: 'Spice Symphony Express Hub',
      addressLine1: '54 OMR IT Expressway',
      postalCode: '600096',
      latitude: 12.9716,
      longitude: 80.2435,
      phone: '+919876530003',
    });
    secondaryOutletId = branch2.id;
    // Approve secondary branch
    await merchantService.updateAdminOutletStatus(
      secondaryOutletId,
      adminUserId,
      'ACTIVE',
      'Branch inspected',
    );

    // Register second merchant for cross-tenant isolation testing
    const reg2 = await merchantService.registerOrUpdate(otherMerchantOwnerId, {
      businessName: 'Green Valley Organic Grocers',
      merchantType: 'GROCERY_STORE',
      panNumber: 'BCDEF6543H',
      bankAccountNumber: '50100777777777',
      bankIfsc: 'ICIC0001234',
      bankBeneficiaryName: 'Green Valley Ltd',
      outletName: 'Green Valley Adyar',
      addressLine1: '88 Sardar Patel Road',
      postalCode: '600020',
      latitude: 13.0012,
      longitude: 80.2565,
      phone: '+919876530002',
    } as any);
    otherOutletId = reg2.outlet.id;
    await merchantService.updateAdminMerchantStatus(
      reg2.merchant.id,
      'APPROVED',
      'Approved grocery',
    );
  });

  after(async () => {
    if (!isLiveAvailable) {
      return;
    }
    try {
      await db.query(
        `DELETE FROM outlet_item_overrides WHERE outlet_id IN ('${primaryOutletId}', '${secondaryOutletId}', '${otherOutletId}');`,
      );
      await db.query(
        `DELETE FROM outlet_special_closures WHERE outlet_id IN ('${primaryOutletId}', '${secondaryOutletId}', '${otherOutletId}');`,
      );
      await db.query(
        `DELETE FROM outlet_operating_hours WHERE outlet_id IN ('${primaryOutletId}', '${secondaryOutletId}', '${otherOutletId}');`,
      );
      await db.query(
        `DELETE FROM item_options WHERE option_group_id IN (SELECT id FROM item_option_groups WHERE item_id IN (SELECT id FROM items WHERE category_id IN (SELECT id FROM categories WHERE catalog_id IN (SELECT id FROM catalogs WHERE outlet_id IN ('${primaryOutletId}', '${secondaryOutletId}', '${otherOutletId}')))));`,
      );
      await db.query(
        `DELETE FROM item_option_groups WHERE item_id IN (SELECT id FROM items WHERE category_id IN (SELECT id FROM categories WHERE catalog_id IN (SELECT id FROM catalogs WHERE outlet_id IN ('${primaryOutletId}', '${secondaryOutletId}', '${otherOutletId}'))));`,
      );
      await db.query(
        `DELETE FROM item_variants WHERE item_id IN (SELECT id FROM items WHERE category_id IN (SELECT id FROM categories WHERE catalog_id IN (SELECT id FROM catalogs WHERE outlet_id IN ('${primaryOutletId}', '${secondaryOutletId}', '${otherOutletId}'))));`,
      );
      await db.query(
        `DELETE FROM inventory WHERE outlet_id IN ('${primaryOutletId}', '${secondaryOutletId}', '${otherOutletId}');`,
      );
      await db.query(
        `DELETE FROM items WHERE category_id IN (SELECT id FROM categories WHERE catalog_id IN (SELECT id FROM catalogs WHERE outlet_id IN ('${primaryOutletId}', '${secondaryOutletId}', '${otherOutletId}')));`,
      );
      await db.query(
        `DELETE FROM categories WHERE catalog_id IN (SELECT id FROM catalogs WHERE outlet_id IN ('${primaryOutletId}', '${secondaryOutletId}', '${otherOutletId}'));`,
      );
      await db.query(
        `DELETE FROM catalogs WHERE outlet_id IN ('${primaryOutletId}', '${secondaryOutletId}', '${otherOutletId}');`,
      );
      await db.query(
        `DELETE FROM outlets WHERE id IN ('${primaryOutletId}', '${secondaryOutletId}', '${otherOutletId}');`,
      );
      await db.query(`DELETE FROM merchants WHERE id = '${testMerchantId}';`);
    } catch {}
    await db.onModuleDestroy();
    await redis.onModuleDestroy();
  });

  // ==========================================
  // Test 1: Category Management & Hierarchies
  // ==========================================
  let mainCourseCatId: string;
  let biryaniSubCatId: string;

  it('1. Should create categories and hierarchical subcategories with display ordering', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    // 1. Create parent category
    const parentCat = await catalogService.createCategory(merchantOwnerId, primaryOutletId, {
      name: 'Main Course',
      displayOrder: 1,
      description: 'Hearty Indian Curries & Gravies',
      imageUrl: 'https://cdn.allgo.in/categories/main-course.jpg',
    });
    assert.ok(parentCat.id);
    assert.strictEqual(parentCat.name, 'Main Course');
    assert.strictEqual(parentCat.display_order, 1);
    mainCourseCatId = parentCat.id;

    // 2. Create subcategory referencing parent_id
    const subCat = await catalogService.createCategory(merchantOwnerId, primaryOutletId, {
      name: 'Biryani Specials',
      parentId: mainCourseCatId,
      displayOrder: 2,
      description: 'Slow-cooked Dum Biryanis',
    });
    assert.ok(subCat.id);
    assert.strictEqual(subCat.parent_id, mainCourseCatId);
    biryaniSubCatId = subCat.id;

    // 3. Fetch categories and verify hierarchical relation
    const categories = await catalogService.getCategories(primaryOutletId);
    assert.ok(categories.length >= 2);
    const fetchedSub = categories.find((c: any) => c.id === biryaniSubCatId);
    assert.strictEqual(fetchedSub.parent_name, 'Main Course');
  });

  // ==========================================
  // Test 2: Product Creation & Business Rules
  // ==========================================
  let chickenBiryaniId: string;

  it('2. Should enforce price rules and create product with dietary attributes, images and inventory', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    // Rule 6: Negative base price rejection
    await assert.rejects(
      async () => {
        await catalogService.createProduct(merchantOwnerId, primaryOutletId, {
          name: 'Invalid Price Item',
          categoryId: biryaniSubCatId,
          basePriceInr: -50.0,
        });
      },
      /non-negative/,
      'Negative base price must be rejected',
    );

    // Rule 7: Sale price > base price rejection
    await assert.rejects(
      async () => {
        await catalogService.createProduct(merchantOwnerId, primaryOutletId, {
          name: 'Invalid Sale Price Item',
          categoryId: biryaniSubCatId,
          basePriceInr: 250.0,
          salePriceInr: 300.0,
        });
      },
      /cannot exceed base price/,
      'Sale price > base price must be rejected',
    );

    // Valid product creation with Phase 3 attributes
    const product = await catalogService.createProduct(merchantOwnerId, primaryOutletId, {
      name: 'Hyderabadi Chicken Dum Biryani',
      categoryId: biryaniSubCatId,
      description: 'Aromatic basmati rice cooked with tender chicken and authentic spices',
      basePriceInr: 320.0,
      salePriceInr: 290.0,
      sku: 'BIR-HYD-001',
      barcode: '8901234567890',
      isVeg: false,
      isPerishable: true,
      preparationTimeMinutes: 20,
      images: [
        'https://cdn.allgo.in/products/hyd-biryani-1.jpg',
        'https://cdn.allgo.in/products/hyd-biryani-2.jpg',
      ],
      dietaryFlags: { halal: true, containsNuts: false, glutenFree: true },
      stockQuantity: 40,
      lowStockThreshold: 10,
    });

    assert.ok(product.id);
    assert.strictEqual(product.basePriceInr, 320.0);
    assert.strictEqual(product.salePriceInr, 290.0);
    assert.strictEqual(product.stockQuantity, 40);
    assert.strictEqual(product.isVeg, false);
    assert.strictEqual(product.product_status, 'ACTIVE');
    assert.strictEqual(product.admin_status, 'APPROVED');
    chickenBiryaniId = product.id;

    // Verify inventory persisted in real PostgreSQL
    const invRes = await db.query(
      'SELECT stock_quantity, is_in_stock FROM inventory WHERE item_id = $1 AND outlet_id = $2;',
      [chickenBiryaniId, primaryOutletId],
    );
    assert.strictEqual(invRes.rows.length, 1);
    assert.strictEqual(invRes.rows[0].stock_quantity, 40);
    assert.strictEqual(invRes.rows[0].is_in_stock, true);
  });

  // ==========================================
  // Test 3: Cross-Merchant IDOR Protection
  // ==========================================
  it('3. Should strictly prevent cross-merchant modifications (IDOR protection)', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    // Other merchant attempts to modify merchant 1's product
    await assert.rejects(
      async () => {
        await catalogService.updateProduct(otherMerchantOwnerId, chickenBiryaniId, {
          basePriceInr: 50.0,
        });
      },
      /ForbiddenException|access denied|not owned/,
      'Cross-merchant product update must be forbidden',
    );

    // Other merchant attempts to delete merchant 1's product
    await assert.rejects(
      async () => {
        await catalogService.deleteProduct(otherMerchantOwnerId, chickenBiryaniId);
      },
      /ForbiddenException|access denied|not owned/,
      'Cross-merchant product deletion must be forbidden',
    );
  });

  // ==========================================
  // Test 4: Variants & Option Groups (Food Add-ons)
  // ==========================================
  it('4. Should manage product variants and food menu option groups with selection constraints', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    // 1. Create Variant: Family Pack
    const variant = await catalogService.createVariant(merchantOwnerId, chickenBiryaniId, {
      variantName: 'Family Pack (Serves 4)',
      additionalPriceInr: 450.0,
      sku: 'BIR-HYD-FAM',
      variantType: 'PORTION',
      displayOrder: 1,
    });
    assert.ok(variant.id);
    assert.strictEqual(variant.additionalPriceInr, 450.0);

    // 2. Create Option Group: Spice Level (Single select required)
    const spiceGroup = await catalogService.createOptionGroup(merchantOwnerId, chickenBiryaniId, {
      name: 'Spice Level',
      minSelections: 1,
      maxSelections: 1,
      isRequired: true,
      displayOrder: 1,
    });
    assert.ok(spiceGroup.id);
    assert.strictEqual(spiceGroup.is_required, true);

    // Add Options to Spice Level
    await catalogService.createOption(merchantOwnerId, spiceGroup.id, {
      name: 'Medium Spicy',
      priceInr: 0.0,
    });
    await catalogService.createOption(merchantOwnerId, spiceGroup.id, {
      name: 'Extra Spicy',
      priceInr: 10.0,
    });

    // 3. Create Option Group: Add-on Accompaniments (Multi-select optional)
    const addOnGroup = await catalogService.createOptionGroup(merchantOwnerId, chickenBiryaniId, {
      name: 'Extra Accompaniments',
      minSelections: 0,
      maxSelections: 3,
      isRequired: false,
      displayOrder: 2,
    });
    await catalogService.createOption(merchantOwnerId, addOnGroup.id, {
      name: 'Extra Salna / Gravy',
      priceInr: 30.0,
    });
    await catalogService.createOption(merchantOwnerId, addOnGroup.id, {
      name: 'Extra Boiled Egg',
      priceInr: 20.0,
    });

    // 4. Retrieve complete product structure
    const fullProduct = await catalogService.getProductById(chickenBiryaniId, primaryOutletId);
    assert.strictEqual(fullProduct.variants.length, 1);
    assert.strictEqual(fullProduct.optionGroups.length, 2);

    const retrievedSpice = fullProduct.optionGroups.find((g: any) => g.name === 'Spice Level');
    assert.strictEqual(retrievedSpice.options.length, 2);
    assert.strictEqual(retrievedSpice.isRequired, true);
  });

  // ==========================================
  // Test 5: Multi-Outlet Product Overrides
  // ==========================================
  it('5. Should support outlet-specific price and availability overrides without affecting global product state', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    // In secondary outlet, set custom price 350.0 and override availability
    await catalogService.setOutletOverride(merchantOwnerId, secondaryOutletId, chickenBiryaniId, {
      customPriceInr: 350.0,
      isAvailable: true,
    });

    // Check secondary outlet effective price
    const secondaryView = await catalogService.getProductById(chickenBiryaniId, secondaryOutletId);
    assert.strictEqual(secondaryView.effectivePriceInr, 350.0);

    // Primary outlet price must remain at original sale price 290.0
    const primaryView = await catalogService.getProductById(chickenBiryaniId, primaryOutletId);
    assert.strictEqual(primaryView.effectivePriceInr, 290.0);

    // Mark product unavailable specifically in secondary outlet
    await catalogService.setOutletOverride(merchantOwnerId, secondaryOutletId, chickenBiryaniId, {
      isAvailable: false,
    });

    const secAfter = await catalogService.getProductById(chickenBiryaniId, secondaryOutletId);
    assert.strictEqual(secAfter.outletIsAvailable, false);

    // Primary outlet remains available!
    const primAfter = await catalogService.getProductById(chickenBiryaniId, primaryOutletId);
    assert.strictEqual(primAfter.outletIsAvailable, true);
  });

  // ==========================================
  // Test 6: Inventory Consistency & Auditing
  // ==========================================
  it('6. Should prevent negative stock and record auditable stock adjustments', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    // Negative stock rejected
    await assert.rejects(
      async () => {
        await catalogService.updateStock(merchantOwnerId, primaryOutletId, chickenBiryaniId, {
          stockQuantity: -5,
        });
      },
      /cannot be negative/,
      'Negative stock must be rejected',
    );

    // Valid adjustment to 15
    await catalogService.updateStock(merchantOwnerId, primaryOutletId, chickenBiryaniId, {
      stockQuantity: 15,
      lowStockThreshold: 5,
    });

    const inv = await db.query(
      'SELECT stock_quantity, is_in_stock FROM inventory WHERE item_id = $1 AND outlet_id = $2;',
      [chickenBiryaniId, primaryOutletId],
    );
    assert.strictEqual(inv.rows[0].stock_quantity, 15);
    assert.strictEqual(inv.rows[0].is_in_stock, true);

    // Verify audit log entry in real PostgreSQL
    const auditRes = await db.query(
      "SELECT * FROM audit_logs WHERE entity_type = 'INVENTORY' AND entity_id = $1 AND action = 'UPDATE_STOCK';",
      [chickenBiryaniId],
    );
    assert.ok(auditRes.rows.length >= 1, 'Stock adjustment must be audited in audit_logs');
  });

  // ==========================================
  // Test 7: Operating Hours, Timezones & Overnight Intervals
  // ==========================================
  it('7. Should validate operating hours, detect overlapping intervals, and compute authoritative isOpen status', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    // 1. Detect overlapping interval on same day
    await assert.rejects(
      async () => {
        await operatingHoursService.setWeeklyHours(primaryOutletId, [
          { dayOfWeek: 1, openTime: '10:00', closeTime: '15:00' },
          { dayOfWeek: 1, openTime: '14:00', closeTime: '18:00' }, // Overlaps with 10:00-15:00!
        ]);
      },
      /Overlapping operating hours detected/,
      'Overlapping intervals on same day must be rejected',
    );

    // 2. Set valid weekly schedule with split shifts and an overnight interval
    await operatingHoursService.setWeeklyHours(primaryOutletId, [
      // Monday: Lunch 11:00-15:00, Dinner 18:00-23:00
      { dayOfWeek: 1, openTime: '11:00:00', closeTime: '15:00:00' },
      { dayOfWeek: 1, openTime: '18:00:00', closeTime: '23:00:00' },
      // Friday: Overnight shift 19:00 - 02:00 (crosses into Saturday 02:00)
      { dayOfWeek: 5, openTime: '19:00:00', closeTime: '02:00:00', isOvernight: true },
      // Sunday: Closed
      { dayOfWeek: 0, openTime: '00:00:00', closeTime: '00:00:00', isClosed: true },
    ]);

    const weekly = await operatingHoursService.getWeeklyHours(primaryOutletId);
    assert.strictEqual(weekly.length, 4);

    // 3. Test isOpen on Monday at 12:30 (during lunch shift) -> OPEN
    // 2026-11-16 is a Monday. 12:30:00 IST is 07:00:00 UTC
    const mondayLunchUtc = new Date('2026-11-16T07:00:00Z');
    const mondayLunchStatus = await operatingHoursService.calculateIsOpen(
      primaryOutletId,
      mondayLunchUtc,
    );
    assert.strictEqual(mondayLunchStatus.isOpen, true, 'Monday lunch must be open');

    // 4. Test isOpen on Monday at 16:30 (between shifts) -> CLOSED
    // 16:30:00 IST is 11:00:00 UTC
    const mondayAfternoonUtc = new Date('2026-11-16T11:00:00Z');
    const mondayAfternoonStatus = await operatingHoursService.calculateIsOpen(
      primaryOutletId,
      mondayAfternoonUtc,
    );
    assert.strictEqual(
      mondayAfternoonStatus.isOpen,
      false,
      'Monday afternoon between shifts must be closed',
    );
    assert.strictEqual(mondayAfternoonStatus.reason, 'OUTSIDE_OPERATING_HOURS');

    // 5. Test overnight interval: Saturday at 01:15 IST (crosses from Friday overnight 19:00-02:00) -> OPEN
    // 2026-11-21 is Saturday. 01:15:00 IST is Friday 2026-11-20T19:45:00Z
    const satEarlyMorningUtc = new Date('2026-11-20T19:45:00Z');
    const satEarlyStatus = await operatingHoursService.calculateIsOpen(
      primaryOutletId,
      satEarlyMorningUtc,
    );
    assert.strictEqual(
      satEarlyStatus.isOpen,
      true,
      'Saturday 01:15 must be open due to Friday overnight shift',
    );
    assert.strictEqual(satEarlyStatus.currentInterval?.isOvernight, true);

    // 6. Test special closure / holiday
    await operatingHoursService.addSpecialClosure(primaryOutletId, {
      closureDate: '2026-11-16', // Monday lunch date above
      reason: 'Deepavali Festival Holiday',
      isFullDay: true,
    });

    const holidayStatus = await operatingHoursService.calculateIsOpen(
      primaryOutletId,
      mondayLunchUtc,
    );
    assert.strictEqual(
      holidayStatus.isOpen,
      false,
      'Special holiday closure must override regular hours',
    );
    assert.strictEqual(holidayStatus.reason, 'SPECIAL_CLOSURE');

    // Clean up special closure
    const closures = await operatingHoursService.getSpecialClosures(primaryOutletId);
    await operatingHoursService.deleteSpecialClosure(primaryOutletId, closures[0].id);

    // 7. Test emergency temporary closure toggle
    await operatingHoursService.toggleTemporaryClosure(primaryOutletId, {
      isTemporarilyClosed: true,
      reason: 'Kitchen equipment repair',
    });

    const tempClosedStatus = await operatingHoursService.calculateIsOpen(
      primaryOutletId,
      mondayLunchUtc,
    );
    assert.strictEqual(
      tempClosedStatus.isOpen,
      false,
      'Temporary closure must override normal hours',
    );
    assert.strictEqual(tempClosedStatus.reason, 'TEMPORARILY_CLOSED');

    // Reopen outlet
    await operatingHoursService.toggleTemporaryClosure(primaryOutletId, {
      isTemporarilyClosed: false,
    });
    const reopenedStatus = await operatingHoursService.calculateIsOpen(
      primaryOutletId,
      mondayLunchUtc,
    );
    assert.strictEqual(
      reopenedStatus.isOpen,
      true,
      'Reopened outlet must be open during operating hours',
    );
  });

  // ==========================================
  // Test 8: Admin Moderation Controls
  // ==========================================
  it('8. Should enforce admin moderation controls and record immutable audit reasons', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    // Rejection without reason rejected
    await assert.rejects(
      async () => {
        await catalogService.moderateProduct(adminUserId, chickenBiryaniId, {
          adminStatus: 'REJECTED',
          rejectionReason: '',
        });
      },
      /Rejection reason is required/,
      'Admin rejection without reason must be rejected',
    );

    // Reject product with reason
    await catalogService.moderateProduct(adminUserId, chickenBiryaniId, {
      adminStatus: 'REJECTED',
      rejectionReason: 'FSSAI packaging certification missing on packaging image',
    });

    const rejectedItem = await catalogService.getProductById(chickenBiryaniId, primaryOutletId);
    assert.strictEqual(rejectedItem.adminStatus, 'REJECTED');

    // In customer view, rejected product must NOT appear!
    const customerProducts = await catalogService.getProducts(primaryOutletId, {}, true);
    const foundInCustomer = customerProducts.items.find((p: any) => p.id === chickenBiryaniId);
    assert.strictEqual(
      foundInCustomer,
      undefined,
      'Rejected product must never be visible to customers',
    );

    // Approve product back
    await catalogService.moderateProduct(adminUserId, chickenBiryaniId, {
      adminStatus: 'APPROVED',
    });
    const approvedItem = await catalogService.getProductById(chickenBiryaniId, primaryOutletId);
    assert.strictEqual(approvedItem.adminStatus, 'APPROVED');

    // Customer view now contains the approved product
    const customerProductsAfter = await catalogService.getProducts(primaryOutletId, {}, true);
    const foundAfter = customerProductsAfter.items.find((p: any) => p.id === chickenBiryaniId);
    assert.ok(foundAfter, 'Approved product must be visible to customers');
  });
});
