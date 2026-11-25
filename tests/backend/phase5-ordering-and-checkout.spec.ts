import assert from 'node:assert';
import crypto from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import { ConfigService } from '../../services/api/dist/config/config.service.js';
import { DatabaseService } from '../../services/api/dist/database/database.service.js';
import { DeliveryJobService } from '../../services/api/dist/delivery/delivery-job.service.js';
import type { DeliveryGateway } from '../../services/api/dist/delivery/delivery.gateway.js';
import { DispatchEngineService } from '../../services/api/dist/delivery/dispatch-engine.service.js';
import { AddressService } from '../../services/api/dist/ordering/services/address.service.js';
import { CartService } from '../../services/api/dist/ordering/services/cart.service.js';
import { CouponsService } from '../../services/api/dist/ordering/services/coupons.service.js';
import { InventoryReservationService } from '../../services/api/dist/ordering/services/inventory-reservation.service.js';
import { OrdersService } from '../../services/api/dist/ordering/services/orders.service.js';
import { PaymentService } from '../../services/api/dist/ordering/services/payment.service.js';
import { PricingService } from '../../services/api/dist/ordering/services/pricing.service.js';
import { RedisService } from '../../services/api/dist/redis/redis.service.js';

describe('Phase 5: Customer Cart, Checkout, Ordering, Payments & Lifecycle Suite', () => {
  let db: DatabaseService;
  let redis: RedisService;
  let pricingService: PricingService;
  let addressService: AddressService;
  let cartService: CartService;
  let inventoryReservation: InventoryReservationService;
  let paymentService: PaymentService;
  let couponsService: CouponsService;
  let ordersService: OrdersService;
  let deliveryJobService: DeliveryJobService;

  // Test Fixtures
  const testCustomerId = '88888888-8888-8888-8888-000000000001';
  const testMerchantOwnerAId = '88888888-8888-8888-8888-000000000002';
  const testMerchantOwnerBId = '88888888-8888-8888-8888-000000000003';

  let outletAId: string;
  let outletBId: string;
  let itemBiryaniId: string;
  let itemChickenTikkaId: string;
  let itemRaitaId: string;
  let optionGroupId: string;
  let optionExtraSpiceId: string;
  let savedAddressId: string;

  let isLiveAvailable = false;
  before(async () => {
    // 1. Initialize DB & Redis
    const config = new ConfigService();
    db = new DatabaseService(config);
    redis = new RedisService(config);

    await (db as any).onModuleInit();
    await (redis as any).onModuleInit();

    try {
      await db.query('SELECT 1;');
      isLiveAvailable = true;
    } catch {
      isLiveAvailable = false;
      return;
    }

    const mockGateway = {
      emitToOrder: () => {},
      emitToPartner: () => {},
      emitToMerchant: () => {},
      server: { to: () => ({ emit: () => {} }) },
    } as unknown as DeliveryGateway;

    const dispatchEngine = new DispatchEngineService(db, redis, mockGateway);
    deliveryJobService = new DeliveryJobService(db, mockGateway, dispatchEngine);

    pricingService = new PricingService(db);
    addressService = new AddressService(db);
    cartService = new CartService(db, pricingService);
    inventoryReservation = new InventoryReservationService(db);
    paymentService = new PaymentService(db);
    couponsService = new CouponsService(db);

    ordersService = new OrdersService(
      db,
      cartService,
      pricingService,
      addressService,
      inventoryReservation,
      paymentService,
      deliveryJobService,
    );

    // Clean test artifacts from previous runs (DO NOT delete sub_orders as order_events is immutable)
    await db.query(`DELETE FROM coupon_redemptions WHERE customer_id = $1;`, [testCustomerId]);
    await db.query(
      `DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE customer_id = $1);`,
      [testCustomerId],
    );
    await db.query(`DELETE FROM carts WHERE customer_id = $1;`, [testCustomerId]);

    // 2. Seed Test Users
    await db.query(
      `INSERT INTO users (id, firebase_uid, phone, full_name, status, default_language)
       VALUES 
         ($1, 'fb_test_cust_01', '+919999888801', 'Kavitha Customer', 'ACTIVE', 'en'),
         ($2, 'fb_test_merch_01', '+919999888802', 'Buhari Owner', 'ACTIVE', 'en'),
         ($3, 'fb_test_merch_02', '+919999888803', 'Anjappar Owner', 'ACTIVE', 'en')
       ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE';`,
      [testCustomerId, testMerchantOwnerAId, testMerchantOwnerBId],
    );

    // Seed Merchants A & B
    const merchantARes = await db.query(
      `INSERT INTO merchants (owner_id, business_name, merchant_type, pan_number, status, commission_rate_percentage)
       VALUES ($1, 'Buhari Restaurant Chennai', 'RESTAURANT', 'ABCDE1234F', 'APPROVED', 15.00)
       RETURNING id;`,
      [testMerchantOwnerAId],
    );
    const merchantAId = merchantARes.rows[0].id;

    const merchantBRes = await db.query(
      `INSERT INTO merchants (owner_id, business_name, merchant_type, pan_number, status, commission_rate_percentage)
       VALUES ($1, 'Anjappar Chettinad', 'RESTAURANT', 'FGHIJ5678K', 'APPROVED', 15.00)
       RETURNING id;`,
      [testMerchantOwnerBId],
    );
    const merchantBId = merchantBRes.rows[0].id;

    // Seed Outlets A & B (Anna Nagar & T. Nagar)
    const zoneId = '30000000-0000-0000-0000-000000000001';
    const outletARes = await db.query(
      `INSERT INTO outlets (merchant_id, zone_id, outlet_name, address_line1, postal_code, location, outlet_status, is_open, phone)
       VALUES ($1, $2, 'Buhari Anna Nagar', '2nd Avenue, Anna Nagar', '600040', ST_SetSRID(ST_MakePoint(80.2100, 13.0850), 4326), 'ACTIVE', TRUE, '+919876543210')
       RETURNING id;`,
      [merchantAId, zoneId],
    );
    outletAId = outletARes.rows[0].id;

    const outletBRes = await db.query(
      `INSERT INTO outlets (merchant_id, zone_id, outlet_name, address_line1, postal_code, location, outlet_status, is_open, phone)
       VALUES ($1, $2, 'Anjappar T Nagar', 'Panagal Park, T Nagar', '600017', ST_SetSRID(ST_MakePoint(80.2341, 13.0418), 4326), 'ACTIVE', TRUE, '+919876543211')
       RETURNING id;`,
      [merchantBId, zoneId],
    );
    outletBId = outletBRes.rows[0].id;

    // Seed Catalogs and Categories
    const catalogARes = await db.query(
      `INSERT INTO catalogs (outlet_id, name, vertical_type) VALUES ($1, 'Buhari Main Menu', 'FOOD') RETURNING id;`,
      [outletAId],
    );
    const catalogAId = catalogARes.rows[0].id;

    const categoryARes = await db.query(
      `INSERT INTO categories (catalog_id, name) VALUES ($1, 'Biryani & Kebabs') RETURNING id;`,
      [catalogAId],
    );
    const categoryAId = categoryARes.rows[0].id;

    const catalogBRes = await db.query(
      `INSERT INTO catalogs (outlet_id, name, vertical_type) VALUES ($1, 'Anjappar Menu', 'FOOD') RETURNING id;`,
      [outletBId],
    );
    const catalogBId = catalogBRes.rows[0].id;

    const categoryBRes = await db.query(
      `INSERT INTO categories (catalog_id, name) VALUES ($1, 'Chettinad Specials') RETURNING id;`,
      [catalogBId],
    );
    const categoryBId = categoryBRes.rows[0].id;

    // Seed Items for Outlet A
    const biryaniRes = await db.query(
      `INSERT INTO items (category_id, name, base_price_inr, is_active, is_veg)
       VALUES ($1, 'Mutton Dum Biryani', 320.00, TRUE, FALSE)
       RETURNING id;`,
      [categoryAId],
    );
    itemBiryaniId = biryaniRes.rows[0].id;

    const tikkaRes = await db.query(
      `INSERT INTO items (category_id, name, base_price_inr, is_active, is_veg)
       VALUES ($1, 'Chicken Tikka Kebab', 240.00, TRUE, FALSE)
       RETURNING id;`,
      [categoryAId],
    );
    itemChickenTikkaId = tikkaRes.rows[0].id;

    // Seed Item for Outlet B
    const raitaRes = await db.query(
      `INSERT INTO items (category_id, name, base_price_inr, is_active, is_veg)
       VALUES ($1, 'Chettinad Pepper Chicken', 280.00, TRUE, FALSE)
       RETURNING id;`,
      [categoryBId],
    );
    itemRaitaId = raitaRes.rows[0].id;

    // Seed Customization Option Group for Biryani
    const groupRes = await db.query(
      `INSERT INTO item_option_groups (item_id, name, min_selections, max_selections, is_required)
       VALUES ($1, 'Spice Level & Add-ons', 0, 2, FALSE)
       RETURNING id;`,
      [itemBiryaniId],
    );
    optionGroupId = groupRes.rows[0].id;

    const optRes = await db.query(
      `INSERT INTO item_options (option_group_id, name, price_inr, is_available)
       VALUES ($1, 'Extra Salna & Boiled Egg', 35.00, TRUE)
       RETURNING id;`,
      [optionGroupId],
    );
    optionExtraSpiceId = optRes.rows[0].id;

    // Seed / Reset Inventory for Outlet A items
    await db.query(
      `INSERT INTO inventory (outlet_id, item_id, stock_quantity, reserved_quantity, is_in_stock)
       VALUES 
         ($1, $2, 10, 0, TRUE),
         ($1, $3, 5, 0, TRUE)
       ON CONFLICT (outlet_id, item_id) DO NOTHING;`,
      [outletAId, itemBiryaniId, itemChickenTikkaId],
    );
    await db.query(
      `UPDATE inventory SET stock_quantity = 10, reserved_quantity = 0, is_in_stock = TRUE WHERE outlet_id = $1 AND item_id = $2;`,
      [outletAId, itemBiryaniId],
    );
    await db.query(
      `UPDATE inventory SET stock_quantity = 5, reserved_quantity = 0, is_in_stock = TRUE WHERE outlet_id = $1 AND item_id = $2;`,
      [outletAId, itemChickenTikkaId],
    );

    // Seed or reuse Customer Saved Address in Kilpauk
    const existingAddr = await db.query(
      `SELECT id FROM addresses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1;`,
      [testCustomerId],
    );
    if (existingAddr.rows.length > 0) {
      savedAddressId = existingAddr.rows[0].id;
    } else {
      const addr = await addressService.createSavedAddress(testCustomerId, {
        label: 'HOME',
        recipientName: 'Kavitha S',
        recipientPhone: '+919999888801',
        addressLine1: '45 Kilpauk Garden Road',
        postalCode: '600010',
        city: 'Chennai',
        state: 'Tamil Nadu',
        latitude: 13.0827,
        longitude: 80.2407,
        isDefault: true,
      });
      savedAddressId = addr.id;
    }
  });

  after(async () => {
    if (!isLiveAvailable) {
      return;
    }
    // Cleanup test data
    await db.query(`DELETE FROM carts WHERE customer_id = $1;`, [testCustomerId]);
    await (db as any).onModuleDestroy();
    await (redis as any).onModuleDestroy();
  });

  it('1. Cart Management: Add items, update quantities, option customizations, and get cart summary', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    // A. Add Biryani with Extra Salna add-on (Qty: 2)
    const cart1 = await cartService.addToCart(testCustomerId, {
      outletId: outletAId,
      itemId: itemBiryaniId,
      quantity: 2,
      selectedOptions: [
        {
          groupId: optionGroupId,
          groupName: 'Spice Level & Add-ons',
          optionId: optionExtraSpiceId,
          optionName: 'Extra Salna & Boiled Egg',
          priceInr: 35.0,
        },
      ],
      specialInstructions: 'Make it extra spicy please',
    });

    assert.strictEqual(cart1.items.length, 1);
    assert.strictEqual(cart1.items[0].quantity, 2);
    // Unit price = 320 (base) + 35 (option) = 355
    assert.strictEqual(cart1.items[0].unitPriceInr, 355.0);
    assert.strictEqual(cart1.items[0].totalPriceInr, 710.0);

    // B. Add Chicken Tikka (Qty: 1)
    const cart2 = await cartService.addToCart(testCustomerId, {
      outletId: outletAId,
      itemId: itemChickenTikkaId,
      quantity: 1,
    });

    assert.strictEqual(cart2.items.length, 2);
    assert.strictEqual(cart2.totalItemsCount, 3);

    // C. Update quantity of Chicken Tikka to 2
    const tikkaCartItem = cart2.items.find((i: any) => i.itemId === itemChickenTikkaId);
    assert.ok(tikkaCartItem);

    const cart3 = await cartService.updateCartItem(testCustomerId, tikkaCartItem.id, {
      quantity: 2,
    });

    const updatedTikka = cart3.items.find((i: any) => i.itemId === itemChickenTikkaId);
    assert.strictEqual(updatedTikka.quantity, 2);
    assert.strictEqual(updatedTikka.totalPriceInr, 480.0); // 240 * 2
  });

  it('2. Single-Outlet Cart Rule: Adding from different outlet raises conflict with choice to retain or replace', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    // Attempt to add Chettinad Pepper Chicken from Outlet B without replace flag
    await assert.rejects(
      async () => {
        await cartService.addToCart(testCustomerId, {
          outletId: outletBId,
          itemId: itemRaitaId,
          quantity: 1,
          replaceCartIfDifferentOutlet: false,
        });
      },
      (err: any) => {
        assert.strictEqual(err.status, 409);
        assert.strictEqual(err.response.code, 'DIFFERENT_OUTLET_CONFLICT');
        assert.match(err.response.message, /Buhari Anna Nagar/);
        return true;
      },
    );

    // Cart items from Outlet A must remain preserved
    const cart = await cartService.getCart(testCustomerId);
    assert.strictEqual(cart.outlet.id, outletAId);
    assert.strictEqual(cart.items.length, 2);
  });

  it('3. Server-Authoritative Pricing Engine: Calculates accurate decimal item breakdown, distance delivery, packaging, 5% GST and platform fees', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    const cart = await cartService.getCart(testCustomerId);

    // Items:
    // Biryani: 2 * (320 + 35) = 710.00
    // Tikka: 2 * 240 = 480.00
    // Items Subtotal: 1190.00
    assert.strictEqual(cart.pricing.itemsSubtotalInr, 1190.0);

    // Default local cart delivery fee: Base 30.00
    assert.strictEqual(cart.pricing.deliveryFeeInr, 30.0);
    // Packaging fee = 15.00
    assert.strictEqual(cart.pricing.packagingFeeInr, 15.0);
    // Platform fee = 5.00
    assert.strictEqual(cart.pricing.platformFeeInr, 5.0);
    // 5% GST on 1190 = 59.50
    assert.strictEqual(cart.pricing.gstAmountInr, 59.5);
    // Total without discount = 1190 + 30 + 15 + 5 + 59.50 = 1299.50
    assert.strictEqual(cart.pricing.finalPayableAmountInr, 1299.5);
  });

  it('4. Coupon Discount & Redemption Limits: Validates coupon application, min order, and max cap', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    // Estimate with ALLGO50 (50% off up to ₹100, min order ₹149)
    const cart = await cartService.getCart(testCustomerId);
    const estimate = await pricingService.calculateCheckoutTotals(
      cart.items.map((i: any) => ({
        item_id: i.itemId,
        variant_id: i.variantId,
        quantity: i.quantity,
        selected_options: i.selectedOptions,
      })),
      outletAId,
      { latitude: 13.0827, longitude: 80.2407 },
      'ALLGO50',
      testCustomerId,
    );

    // 50% of 1190 is 595, capped at max discount of 100.00
    assert.strictEqual(estimate.discountAmountInr, 100.0);
    assert.strictEqual(estimate.appliedCoupon?.code, 'ALLGO50');
    // Total payable = 1319.50 - 100.00 = 1219.50 (distance ~4.1 km with 1.25 road factor -> delivery ₹50)
    assert.strictEqual(estimate.finalPayableAmountInr, 1219.5);

    // Reject non-existent / expired coupon
    await assert.rejects(
      async () => {
        await pricingService.calculateCheckoutTotals(
          cart.items.map((i: any) => ({ item_id: i.itemId, quantity: i.quantity })),
          outletAId,
          undefined,
          'INVALID_COUPON_CODE_999',
        );
      },
      (err: any) => {
        assert.match(err.message, /invalid or expired/i);
        return true;
      },
    );
  });

  it('5. Atomic Inventory Reservation & Concurrency Race Protection: Prevents overselling and negative stock', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    // Current stock of Tikka is 5. Cart has 2.
    // Try to reserve 10 Tikka in an isolated checkout session
    const client = await db.getPool().connect();
    try {
      await client.query('BEGIN;');
      await assert.rejects(
        async () => {
          await inventoryReservation.reserveInventory(client, crypto.randomUUID(), outletAId, [
            { itemId: itemChickenTikkaId, quantity: 10 },
          ]);
        },
        (err: any) => {
          assert.match(err.message, /out of stock/i);
          return true;
        },
      );
      await client.query('ROLLBACK;');
    } finally {
      client.release();
    }

    // Verify stock was NOT decremented
    const stockCheck = await db.query(
      `SELECT stock_quantity FROM inventory WHERE outlet_id = $1 AND item_id = $2;`,
      [outletAId, itemChickenTikkaId],
    );
    assert.strictEqual(Number(stockCheck.rows[0].stock_quantity), 5);
  });

  it('6. Idempotent Order Placement (COD): Places order, reserves inventory, creates sub-order, and clears cart', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    const idempotencyKey = `idem-test-${Date.now()}`;

    // Place Order via Cash on Delivery with coupon
    const orderResult1 = await ordersService.placeOrder(testCustomerId, {
      deliveryAddressId: savedAddressId,
      paymentMethod: 'COD',
      couponCode: 'ALLGO50',
      deliveryInstructions: 'Leave with security if not home',
      customerNotes: 'Please include extra spoons',
      idempotencyKey,
    });

    assert.ok(orderResult1.subOrderId);
    assert.strictEqual(orderResult1.status, 'PLACED');
    assert.strictEqual(orderResult1.pricing.finalPayableAmountInr, 1219.5);
    assert.strictEqual(orderResult1.payment.paymentMethod, 'COD');
    assert.strictEqual(orderResult1.payment.status, 'AUTHORIZED');

    // Cart must be emptied after checkout
    const cartAfter = await cartService.getCart(testCustomerId);
    assert.strictEqual(cartAfter.items.length, 0);

    // Verify inventory stock quantity decremented atomically (Biryani: 10 - 2 = 8, Tikka: 5 - 2 = 3)
    const stockBiryani = await db.query(
      `SELECT stock_quantity, reserved_quantity FROM inventory WHERE outlet_id = $1 AND item_id = $2;`,
      [outletAId, itemBiryaniId],
    );
    assert.strictEqual(Number(stockBiryani.rows[0].stock_quantity), 8);
    assert.strictEqual(Number(stockBiryani.rows[0].reserved_quantity), 2);

    // Repeated request with same idempotencyKey returns identical order without re-debit or stock duplicate
    const orderResult2 = await ordersService.placeOrder(testCustomerId, {
      deliveryAddressId: savedAddressId,
      paymentMethod: 'COD',
      idempotencyKey,
    });
    assert.strictEqual(orderResult2.id, orderResult1.subOrderId);
  });

  it('7. Merchant Order Workflow: Accept (with prep time), Mark Preparing, and Mark Ready (Triggers Phase 4 Delivery)', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    // Fetch placed order
    const orders = await ordersService.listMerchantOrders(testMerchantOwnerAId, 'PLACED');
    assert.strictEqual(orders.length > 0, true);
    const subOrderId = orders[0].id;

    // A. Merchant accepts order with 25 min prep time
    const accepted = await ordersService.merchantAcceptOrder(subOrderId, testMerchantOwnerAId, 25);
    assert.strictEqual(accepted.status, 'MERCHANT_ACCEPTED');
    assert.strictEqual(accepted.prep_time_minutes, 25);

    // B. Merchant marks preparing
    const preparing = await ordersService.merchantMarkPreparing(subOrderId, testMerchantOwnerAId);
    assert.strictEqual(preparing.status, 'PREPARING');

    // C. Merchant marks ready for pickup -> Dispatches Phase 4 Delivery Job
    const ready = await ordersService.merchantMarkReady(subOrderId, testMerchantOwnerAId);
    assert.strictEqual(ready.status, 'READY');
    assert.ok(ready.delivery_job_id, 'Delivery job ID must be linked to sub_order');

    // Verify Phase 4 Delivery Job created and linked
    const deliveryJobRes = await db.query(
      `SELECT id, job_number, sub_order_id, status, handover_otp, delivery_pin
       FROM delivery_jobs WHERE id = $1;`,
      [ready.delivery_job_id],
    );
    assert.strictEqual(deliveryJobRes.rows.length, 1);
    const job = deliveryJobRes.rows[0];
    assert.strictEqual(job.sub_order_id, subOrderId);
    assert.ok(job.handover_otp);
    assert.ok(job.delivery_pin);
  });

  it('8. Safe Data Exposure & Role-Based Redactions: Delivery PIN visible ONLY to customer; Handover OTP visible to merchant', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    const orders = await ordersService.listCustomerOrders(testCustomerId);
    const subOrderId = orders[0].id;

    // Customer query
    const customerView = await ordersService.getOrderDetails(
      subOrderId,
      testCustomerId,
      'CUSTOMER',
    );
    assert.ok(customerView.delivery.deliveryPin, 'Customer MUST see delivery PIN');
    assert.strictEqual(
      customerView.delivery.handoverOtp,
      null,
      'Customer MUST NOT see merchant handover OTP',
    );

    // Merchant query
    const merchantView = await ordersService.getOrderDetails(
      subOrderId,
      testMerchantOwnerAId,
      'MERCHANT_ADMIN',
    );
    assert.strictEqual(
      merchantView.delivery.deliveryPin,
      null,
      'Merchant MUST NOT see customer delivery PIN',
    );
    assert.ok(merchantView.delivery.handoverOtp, 'Merchant MUST see handover OTP');

    // Cross-merchant IDOR check: Merchant B cannot access Merchant A's order
    await assert.rejects(
      async () => {
        await ordersService.getOrderDetails(subOrderId, testMerchantOwnerBId, 'MERCHANT_ADMIN');
      },
      (err: any) => {
        assert.strictEqual(err.status, 403);
        return true;
      },
    );
  });

  it('9. Online Payment & Webhook Idempotency: HMAC SHA256 Signature verification & Payment confirmation', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    const existingOrders = await ordersService.listCustomerOrders(testCustomerId);
    assert.strictEqual(existingOrders.length > 0, true);
    const subOrderId = existingOrders[0].id;
    const subOrderRes = await db.query('SELECT order_group_id FROM sub_orders WHERE id = $1;', [
      subOrderId,
    ]);
    const orderGroupId = subOrderRes.rows[0].order_group_id;
    const customerId = testCustomerId;
    const amountInr = 500.0;

    // Initiate Razorpay payment
    const payment = await paymentService.initiatePayment(
      orderGroupId,
      subOrderId,
      customerId,
      'UPI',
      amountInr,
    );
    assert.strictEqual(payment.gatewayName, 'RAZORPAY');
    assert.strictEqual(payment.status, 'PENDING');

    // Generate valid HMAC signature
    const secret = process.env.RAZORPAY_KEY_SECRET || 'local_test_razorpay_secret_key_12345';
    const fakePaymentId = 'pay_test_99887766';
    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(`${payment.gatewayOrderId}|${fakePaymentId}`)
      .digest('hex');

    // Confirm Payment with valid signature
    const confirmed = await paymentService.confirmPayment(
      payment.transactionId,
      fakePaymentId,
      validSignature,
    );
    assert.strictEqual(confirmed.status, 'CAPTURED');
    assert.strictEqual(confirmed.gateway_payment_id, fakePaymentId);

    // Reject with tampered signature
    await assert.rejects(
      async () => {
        await paymentService.confirmPayment(
          payment.transactionId,
          fakePaymentId,
          'tampered_fraudulent_signature_xyz',
        );
      },
      (err: any) => {
        assert.match(err.message, /invalid razorpay payment signature/i);
        return true;
      },
    );

    // Test Webhook handler
    const webhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_webhook_123',
            order_id: payment.gatewayOrderId,
          },
        },
      },
    };
    const webhookRes = await paymentService.handleWebhook(
      JSON.stringify(webhookPayload),
      'dummy-sig',
      webhookPayload,
    );
    assert.strictEqual(webhookRes.handled, true);
  });

  it('10. Order Cancellation, Merchant Rejection & Stock Restoration: Restores inventory and records refund audit', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandbox');
      return;
    }
    // 1. Add item to cart and place a new order for cancellation test
    await cartService.addToCart(testCustomerId, {
      outletId: outletAId,
      itemId: itemChickenTikkaId,
      quantity: 2,
    });

    const orderToCancel = await ordersService.placeOrder(testCustomerId, {
      deliveryAddressId: savedAddressId,
      paymentMethod: 'COD',
    });

    // Check stock was decremented from 3 to 1
    const stockBefore = await db.query(
      `SELECT stock_quantity FROM inventory WHERE outlet_id = $1 AND item_id = $2;`,
      [outletAId, itemChickenTikkaId],
    );
    assert.strictEqual(Number(stockBefore.rows[0].stock_quantity), 1);

    // 2. Customer cancels order before preparation starts
    const cancelled = await ordersService.cancelOrder(
      orderToCancel.subOrderId,
      testCustomerId,
      'CUSTOMER',
      'Changed mind, need to leave home',
    );
    assert.strictEqual(cancelled.status, 'CANCELLED');

    // 3. Verify inventory was released and stock restored back to 3
    const stockAfter = await db.query(
      `SELECT stock_quantity, reserved_quantity FROM inventory WHERE outlet_id = $1 AND item_id = $2;`,
      [outletAId, itemChickenTikkaId],
    );
    assert.strictEqual(Number(stockAfter.rows[0].stock_quantity), 3);
    assert.strictEqual(Number(stockAfter.rows[0].reserved_quantity), 0);

    // 4. Verify order_cancellations record exists
    const cancelAudit = await db.query(
      `SELECT * FROM order_cancellations WHERE sub_order_id = $1;`,
      [orderToCancel.subOrderId],
    );
    assert.strictEqual(cancelAudit.rows.length, 1);
    assert.strictEqual(cancelAudit.rows[0].role_at_cancellation, 'CUSTOMER');
    assert.match(cancelAudit.rows[0].reason, /Changed mind/);
  });
});
