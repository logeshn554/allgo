import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';
import { MerchantService } from '../../services/api/dist/merchant/merchant.service.js';
import { InMemoryRedisTestDouble, MockDatabaseService } from '../helpers/test-doubles.ts';

describe('Phase 2 Backend: Native Merchant Lifecycle, Store Operations & Admin Approval', () => {
  let merchantService: MerchantService;
  let dbService: MockDatabaseService;
  let redisService: InMemoryRedisTestDouble;

  const testOwnerId = 'usr_owner_001';
  const otherOwnerId = 'usr_owner_002';

  beforeEach(() => {
    dbService = new MockDatabaseService();
    redisService = new InMemoryRedisTestDouble();
    merchantService = new MerchantService(dbService as any, redisService as any);

    // Seed test users
    dbService.users.set(testOwnerId, {
      id: testOwnerId,
      phone: '+919876543210',
      full_name: 'Anjappar Owner',
      email: 'owner@anjappar.com',
      status: 'ACTIVE',
    });

    dbService.users.set(otherOwnerId, {
      id: otherOwnerId,
      phone: '+919123456789',
      full_name: 'Other Owner',
      email: 'other@store.com',
      status: 'ACTIVE',
    });
  });

  describe('Merchant Registration & Profile Progression', () => {
    it('should register a new restaurant merchant and primary outlet with SUBMITTED status', async () => {
      const registrationDto = {
        businessName: 'Anjappar Chettinad Restaurant',
        merchantType: 'RESTAURANT',
        panNumber: 'ABCDE1234F',
        gstin: '33AABCA1234A1Z5',
        fssaiLicenseNumber: '12423001000123',
        bankAccountNumber: '50100234567890',
        bankIfsc: 'HDFC0001234',
        bankBeneficiaryName: 'Anjappar Chettinad Pvt Ltd',
        outletName: 'Anjappar Anna Nagar Outlet',
        addressLine1: 'No 12, 2nd Avenue',
        postalCode: '600040',
        latitude: 13.085,
        longitude: 80.2101,
        phone: '+919876543210',
        defaultPrepTimeMinutes: 15,
        packagingFeeInr: 10.0,
      };

      const result = await merchantService.registerOrUpdate(testOwnerId, registrationDto as any);

      assert.ok(result);
      assert.strictEqual(result.status, 'SUBMITTED');
      assert.strictEqual(result.merchant.business_name, 'Anjappar Chettinad Restaurant');
      assert.strictEqual(result.merchant.pan_number, 'ABCDE1234F');
      assert.strictEqual(result.outlet.outlet_name, 'Anjappar Anna Nagar Outlet');
      assert.strictEqual(result.outlet.is_open, true);

      // Verify profile retrieval
      const profile = await merchantService.getProfile(testOwnerId);
      assert.strictEqual(profile.status, 'SUBMITTED');
      assert.strictEqual(profile.merchant.business_name, 'Anjappar Chettinad Restaurant');
    });

    it('should return NOT_REGISTERED for a new user without a merchant entity', async () => {
      const profile = await merchantService.getProfile('unregistered_user');
      assert.strictEqual(profile.status, 'NOT_REGISTERED');
      assert.strictEqual(profile.merchant, null);
    });

    it('should prevent suspended merchant from escaping suspension via re-registration', async () => {
      const reg = await merchantService.registerOrUpdate(testOwnerId, {
        businessName: 'Anjappar Chettinad',
        merchantType: 'RESTAURANT',
        panNumber: 'ABCDE1234F',
        bankAccountNumber: '50100234567890',
        bankIfsc: 'HDFC0001234',
        bankBeneficiaryName: 'Anjappar',
        outletName: 'Anjappar Outlet',
        addressLine1: 'Anna Nagar',
        postalCode: '600040',
        latitude: 13.085,
        longitude: 80.21,
        phone: '+919876543210',
        defaultPrepTimeMinutes: 15,
        packagingFeeInr: 10.0,
      } as any);

      // Admin suspends merchant
      await merchantService.updateAdminMerchantStatus(
        reg.merchant.id,
        'SUSPENDED',
        'Compliance violation',
      );

      // Attempting to re-register while SUSPENDED must be rejected
      await assert.rejects(
        async () => {
          await merchantService.registerOrUpdate(testOwnerId, {
            businessName: 'Renamed Store Attempt',
            merchantType: 'RESTAURANT',
            panNumber: 'ABCDE1234F',
            bankAccountNumber: '50100234567890',
            bankIfsc: 'HDFC0001234',
            bankBeneficiaryName: 'Anjappar',
            outletName: 'Outlet Attempt',
            addressLine1: 'Anna Nagar',
            postalCode: '600040',
            latitude: 13.085,
            longitude: 80.21,
            phone: '+919876543210',
            defaultPrepTimeMinutes: 15,
            packagingFeeInr: 10.0,
          } as any);
        },
        {
          name: 'ForbiddenException',
          message: /Merchant account is suspended by platform administration/,
        },
      );
    });
  });

  describe('Store Operations & Availability', () => {
    it('should reject store operations when merchant is in SUBMITTED state (operational gating)', async () => {
      const reg = await merchantService.registerOrUpdate(testOwnerId, {
        businessName: 'Pending Restaurant',
        merchantType: 'RESTAURANT',
        panNumber: 'ABCDE1234F',
        bankAccountNumber: '50100234567890',
        bankIfsc: 'HDFC0001234',
        bankBeneficiaryName: 'Pending Owner',
        outletName: 'Pending Outlet',
        addressLine1: 'Anna Nagar',
        postalCode: '600040',
        latitude: 13.085,
        longitude: 80.21,
        phone: '+919876543210',
        defaultPrepTimeMinutes: 15,
        packagingFeeInr: 10.0,
      } as any);

      // While SUBMITTED, merchant cannot toggle outlet status
      await assert.rejects(
        async () => {
          await merchantService.updateOutletStatus(testOwnerId, reg.outlet.id, { isOpen: false });
        },
        {
          name: 'ForbiddenException',
          message: /Outlet operations locked\. Administrative approval required/,
        },
      );
    });

    it('should toggle store open/closed availability and update preparation time once approved', async () => {
      // 1. Register merchant
      const reg = await merchantService.registerOrUpdate(testOwnerId, {
        businessName: 'Anjappar Chettinad',
        merchantType: 'RESTAURANT',
        panNumber: 'ABCDE1234F',
        bankAccountNumber: '50100234567890',
        bankIfsc: 'HDFC0001234',
        bankBeneficiaryName: 'Anjappar',
        outletName: 'Anjappar Outlet',
        addressLine1: 'Anna Nagar',
        postalCode: '600040',
        latitude: 13.085,
        longitude: 80.21,
        phone: '+919876543210',
        defaultPrepTimeMinutes: 15,
        packagingFeeInr: 10.0,
      } as any);

      // Admin approves merchant
      await merchantService.updateAdminMerchantStatus(reg.merchant.id, 'APPROVED');

      const outletId = reg.outlet.id;

      // 2. Toggle to closed
      const updated = await merchantService.updateOutletStatus(testOwnerId, outletId, {
        isOpen: false,
        defaultPrepTimeMinutes: 25,
      });

      assert.strictEqual(updated.is_open, false);
      assert.strictEqual(updated.default_prep_time_minutes, 25);
    });

    it('should reject cross-merchant store tampering with 403 Forbidden', async () => {
      // 1. Owner 1 registers outlet
      const reg1 = await merchantService.registerOrUpdate(testOwnerId, {
        businessName: 'Store 1',
        merchantType: 'RESTAURANT',
        panNumber: 'ABCDE1234F',
        bankAccountNumber: '1111111111',
        bankIfsc: 'HDFC0001234',
        bankBeneficiaryName: 'Store 1',
        outletName: 'Outlet 1',
        addressLine1: 'Road 1',
        postalCode: '600040',
        latitude: 13.0,
        longitude: 80.0,
        phone: '+919876543210',
        defaultPrepTimeMinutes: 15,
        packagingFeeInr: 10,
      } as any);
      await merchantService.updateAdminMerchantStatus(reg1.merchant.id, 'APPROVED');

      // 2. Owner 2 registers outlet
      const reg2 = await merchantService.registerOrUpdate(otherOwnerId, {
        businessName: 'Store 2',
        merchantType: 'RESTAURANT',
        panNumber: 'FGHIJ5678K',
        bankAccountNumber: '2222222222',
        bankIfsc: 'SBIN0001234',
        bankBeneficiaryName: 'Store 2',
        outletName: 'Outlet 2',
        addressLine1: 'Road 2',
        postalCode: '600040',
        latitude: 13.1,
        longitude: 80.1,
        phone: '+919123456789',
        defaultPrepTimeMinutes: 20,
        packagingFeeInr: 10,
      } as any);
      await merchantService.updateAdminMerchantStatus(reg2.merchant.id, 'APPROVED');

      // 3. Owner 2 attempts to toggle Owner 1's outlet
      await assert.rejects(
        async () => {
          await merchantService.updateOutletStatus(otherOwnerId, reg1.outlet.id, { isOpen: false });
        },
        {
          name: 'ForbiddenException',
          message: 'Cross-merchant outlet access rejected',
        },
      );
    });
  });

  describe('Order Lifecycle State Machine', () => {
    let outletId: string;
    const testOrderId = 'sub_ord_1001';

    beforeEach(async () => {
      const reg = await merchantService.registerOrUpdate(testOwnerId, {
        businessName: 'Anjappar Chettinad',
        merchantType: 'RESTAURANT',
        panNumber: 'ABCDE1234F',
        bankAccountNumber: '50100234567890',
        bankIfsc: 'HDFC0001234',
        bankBeneficiaryName: 'Anjappar',
        outletName: 'Anjappar Outlet',
        addressLine1: 'Anna Nagar',
        postalCode: '600040',
        latitude: 13.085,
        longitude: 80.21,
        phone: '+919876543210',
        defaultPrepTimeMinutes: 15,
        packagingFeeInr: 10.0,
      } as any);
      outletId = reg.outlet.id;

      // Admin approves merchant for order operations
      await merchantService.updateAdminMerchantStatus(reg.merchant.id, 'APPROVED');

      // Seed order
      dbService.subOrders.set(testOrderId, {
        id: testOrderId,
        order_group_id: 'grp_001',
        outlet_id: outletId,
        sub_order_number: 'ORD-98214',
        vertical_type: 'FOOD',
        status: 'PLACED',
        items_total_inr: 540.0,
        packaging_fee_inr: 10.0,
        merchant_commission_inr: 81.0,
        merchant_net_payout_inr: 459.0,
        tax_total_inr: 27.0,
        prep_time_minutes: 15,
        created_at: new Date().toISOString(),
      });

      dbService.orderItems.set(testOrderId, [
        {
          itemId: 'item_1',
          itemName: 'Chicken Biryani',
          quantity: 2,
          unitPriceInr: 270.0,
          totalPriceInr: 540.0,
        },
      ]);
    });

    it('should progress through the valid lifecycle: PLACED -> MERCHANT_ACCEPTED -> PREPARING -> READY', async () => {
      // 1. Accept Order (commits 20m prep time)
      const accepted = await merchantService.updateOrderStatus(testOwnerId, testOrderId, {
        status: 'MERCHANT_ACCEPTED',
        prepTimeMinutes: 20,
      });
      assert.strictEqual(accepted.status, 'MERCHANT_ACCEPTED');
      assert.strictEqual(accepted.prep_time_minutes, 20);

      // 2. Mark Preparing
      const preparing = await merchantService.updateOrderStatus(testOwnerId, testOrderId, {
        status: 'PREPARING',
      });
      assert.strictEqual(preparing.status, 'PREPARING');

      // 3. Mark Ready for Courier Handover
      const ready = await merchantService.updateOrderStatus(testOwnerId, testOrderId, {
        status: 'READY',
      });
      assert.strictEqual(ready.status, 'READY');

      // 4. Verify audit events recorded
      assert.strictEqual(dbService.orderEvents.length, 3);
      assert.strictEqual(dbService.orderEvents[0].to_status, 'MERCHANT_ACCEPTED');
      assert.strictEqual(dbService.orderEvents[1].to_status, 'PREPARING');
      assert.strictEqual(dbService.orderEvents[2].to_status, 'READY');
    });

    it('should reject invalid status transitions with HTTP 400 BadRequest', async () => {
      // Attempt jumping directly from PLACED to READY without acceptance
      await assert.rejects(
        async () => {
          await merchantService.updateOrderStatus(testOwnerId, testOrderId, { status: 'READY' });
        },
        {
          name: 'BadRequestException',
          message: /Invalid status transition from PLACED to READY/,
        },
      );
    });

    it('should allow rejecting a new order with reason', async () => {
      const rejected = await merchantService.updateOrderStatus(testOwnerId, testOrderId, {
        status: 'REJECTED',
        rejectionReason: 'Kitchen closing for afternoon cleaning',
      });
      assert.strictEqual(rejected.status, 'REJECTED');
      assert.strictEqual(dbService.orderEvents[0].notes, 'Kitchen closing for afternoon cleaning');
    });

    it('should reject order operations when merchant is suspended with 403 Forbidden', async () => {
      const m = await merchantService.getMerchantByOwnerId(testOwnerId);
      await merchantService.updateAdminMerchantStatus(m.id, 'SUSPENDED');

      await assert.rejects(
        async () => {
          await merchantService.updateOrderStatus(testOwnerId, testOrderId, {
            status: 'MERCHANT_ACCEPTED',
          });
        },
        {
          name: 'ForbiddenException',
          message: /Order processing locked\. Administrative approval required/,
        },
      );
    });
  });

  describe('Menu, Products & Inventory Management', () => {
    let outletId: string;

    beforeEach(async () => {
      const reg = await merchantService.registerOrUpdate(testOwnerId, {
        businessName: 'Anjappar Chettinad',
        merchantType: 'RESTAURANT',
        panNumber: 'ABCDE1234F',
        bankAccountNumber: '50100234567890',
        bankIfsc: 'HDFC0001234',
        bankBeneficiaryName: 'Anjappar',
        outletName: 'Anjappar Outlet',
        addressLine1: 'Anna Nagar',
        postalCode: '600040',
        latitude: 13.085,
        longitude: 80.21,
        phone: '+919876543210',
        defaultPrepTimeMinutes: 15,
        packagingFeeInr: 10.0,
      } as any);
      outletId = reg.outlet.id;
      await merchantService.updateAdminMerchantStatus(reg.merchant.id, 'APPROVED');
    });

    it('should create a new food product with stock inventory', async () => {
      const product = await merchantService.createProduct(testOwnerId, {
        categoryName: 'Biryani Specials',
        name: 'Mutton Chukka Biryani',
        description: 'Tender spicy mutton chunks tossed in chettinad spices with samba rice',
        basePriceInr: 390.0,
        isVeg: false,
        stockQuantity: 40,
      });

      assert.ok(product);
      assert.strictEqual(product.name, 'Mutton Chukka Biryani');
      assert.strictEqual(product.basePriceInr, 390.0);
      assert.strictEqual(product.stockQuantity, 40);
      assert.strictEqual(product.isInStock, true);

      // Verify product listed in menu
      const products = await merchantService.getProducts(testOwnerId);
      assert.strictEqual(products.length, 1);
      assert.strictEqual(products[0].name, 'Mutton Chukka Biryani');
    });

    it('should update inventory stock levels and out-of-stock toggle', async () => {
      const product = await merchantService.createProduct(testOwnerId, {
        categoryName: 'Desserts',
        name: 'Elaneer Payasam',
        basePriceInr: 120.0,
        isVeg: true,
        stockQuantity: 15,
      });

      // Update to out of stock
      await merchantService.updateInventory(testOwnerId, product.id, {
        stockQuantity: 0,
        isInStock: false,
      });

      const inv = dbService.inventory.get(product.id);
      assert.strictEqual(inv.stock_quantity, 0);
      assert.strictEqual(inv.is_in_stock, false);
    });

    it('should reject negative stock quantity updates with 400 BadRequest', async () => {
      const product = await merchantService.createProduct(testOwnerId, {
        categoryName: 'Desserts',
        name: 'Rasagulla',
        basePriceInr: 60.0,
        isVeg: true,
        stockQuantity: 10,
      });

      await assert.rejects(
        async () => {
          await merchantService.updateInventory(testOwnerId, product.id, {
            stockQuantity: -5,
          });
        },
        {
          name: 'BadRequestException',
          message: 'Stock quantity cannot be negative',
        },
      );
    });

    it('should reject cross-merchant product mutation (IDOR protection)', async () => {
      // 1. Owner 1 creates product
      const product1 = await merchantService.createProduct(testOwnerId, {
        categoryName: 'Biryani Specials',
        name: 'Owner 1 Biryani',
        basePriceInr: 300.0,
        isVeg: false,
        stockQuantity: 20,
      });

      // 2. Register Owner 2
      const reg2 = await merchantService.registerOrUpdate(otherOwnerId, {
        businessName: 'Owner 2 Store',
        merchantType: 'RESTAURANT',
        panNumber: 'FGHIJ5678K',
        bankAccountNumber: '2222222222',
        bankIfsc: 'SBIN0001234',
        bankBeneficiaryName: 'Owner 2',
        outletName: 'Owner 2 Outlet',
        addressLine1: 'Road 2',
        postalCode: '600040',
        latitude: 13.1,
        longitude: 80.1,
        phone: '+919123456789',
        defaultPrepTimeMinutes: 20,
        packagingFeeInr: 10,
      } as any);
      await merchantService.updateAdminMerchantStatus(reg2.merchant.id, 'APPROVED');

      // 3. Owner 2 attempts to modify Owner 1's product
      await assert.rejects(
        async () => {
          await merchantService.updateProduct(otherOwnerId, product1.id, {
            basePriceInr: 10.0, // malicious tampering
          });
        },
        {
          name: 'NotFoundException',
          message: /Product not found or cross-merchant access forbidden/,
        },
      );

      // 4. Owner 2 attempts to delete Owner 1's product
      await assert.rejects(
        async () => {
          await merchantService.deleteProduct(otherOwnerId, product1.id);
        },
        {
          name: 'NotFoundException',
          message: /Product not found or cross-merchant access forbidden/,
        },
      );
    });
  });

  describe('Financial Settlements & Earnings', () => {
    it('should calculate gross sales, platform commissions (15%), and net payout from delivered orders', async () => {
      const reg = await merchantService.registerOrUpdate(testOwnerId, {
        businessName: 'Anjappar Chettinad',
        merchantType: 'RESTAURANT',
        panNumber: 'ABCDE1234F',
        bankAccountNumber: '50100234567890',
        bankIfsc: 'HDFC0001234',
        bankBeneficiaryName: 'Anjappar',
        outletName: 'Anjappar Outlet',
        addressLine1: 'Anna Nagar',
        postalCode: '600040',
        latitude: 13.085,
        longitude: 80.21,
        phone: '+919876543210',
        defaultPrepTimeMinutes: 15,
        packagingFeeInr: 10.0,
      } as any);

      // Seed 2 delivered orders
      dbService.subOrders.set('ord_del_1', {
        id: 'ord_del_1',
        outlet_id: reg.outlet.id,
        status: 'DELIVERED',
        items_total_inr: 1000.0,
        packaging_fee_inr: 20.0,
        merchant_commission_inr: 150.0, // 15%
        merchant_net_payout_inr: 850.0,
        tax_total_inr: 50.0,
      });

      dbService.subOrders.set('ord_del_2', {
        id: 'ord_del_2',
        outlet_id: reg.outlet.id,
        status: 'DELIVERED',
        items_total_inr: 2000.0,
        packaging_fee_inr: 30.0,
        merchant_commission_inr: 300.0, // 15%
        merchant_net_payout_inr: 1700.0,
        tax_total_inr: 100.0,
      });

      // Seed a processed payout of 1000 INR
      dbService.payouts.set('payout_001', {
        id: 'payout_001',
        recipient_type: 'MERCHANT',
        recipient_id: reg.merchant.id,
        gross_amount_inr: 1000.0,
        net_amount_inr: 1000.0,
        status: 'SUCCESS',
        payout_channel: 'RAZORPAYX_NODAL',
        created_at: new Date().toISOString(),
      });

      const earnings = await merchantService.getEarnings(testOwnerId);
      assert.strictEqual(earnings.grossSalesInr, 3000.0);
      assert.strictEqual(earnings.platformCommissionInr, 450.0);
      assert.strictEqual(earnings.netPayoutInr, 2550.0);
      assert.strictEqual(earnings.totalPaidOutInr, 1000.0);
      assert.strictEqual(earnings.pendingSettlementInr, 1550.0); // 2550 - 1000
    });
  });

  describe('Admin Merchant Approval System', () => {
    it('should allow platform administrator to review, approve, suspend, and reactivate merchant', async () => {
      // 1. Merchant registers
      const reg = await merchantService.registerOrUpdate(testOwnerId, {
        businessName: 'New Cloud Kitchen',
        merchantType: 'CLOUD_KITCHEN',
        panNumber: 'ABCDE1234F',
        bankAccountNumber: '50100234567890',
        bankIfsc: 'HDFC0001234',
        bankBeneficiaryName: 'Cloud Kitchen',
        outletName: 'Cloud Outlet',
        addressLine1: 'Adyar',
        postalCode: '600020',
        latitude: 13.0,
        longitude: 80.2,
        phone: '+919876543210',
        defaultPrepTimeMinutes: 15,
        packagingFeeInr: 10.0,
      } as any);

      const merchantId = reg.merchant.id;

      // 2. Admin retrieves dossier
      const dossier = await merchantService.getAdminMerchantApplication(merchantId);
      assert.strictEqual(dossier.business_name, 'New Cloud Kitchen');
      assert.strictEqual(dossier.status, 'SUBMITTED');

      // 3. Admin requests additional documents
      const docsReq = await merchantService.updateAdminMerchantStatus(
        merchantId,
        'DOCUMENTS_REQUIRED',
        'Valid FSSAI certificate needed',
      );
      assert.strictEqual(docsReq.merchant.status, 'DOCUMENTS_REQUIRED');

      // 4. Admin approves merchant
      const approval = await merchantService.updateAdminMerchantStatus(
        merchantId,
        'APPROVED',
        'FSSAI and GSTIN verified via official databases',
      );
      assert.strictEqual(approval.merchant.status, 'APPROVED');

      // 5. Verify merchant profile now reflects APPROVED
      const profile = await merchantService.getProfile(testOwnerId);
      assert.strictEqual(profile.status, 'APPROVED');

      // 6. Admin suspends merchant
      const suspended = await merchantService.updateAdminMerchantStatus(
        merchantId,
        'SUSPENDED',
        'Hygiene inspection failure',
      );
      assert.strictEqual(suspended.merchant.status, 'SUSPENDED');

      // 7. Admin reactivates suspended merchant
      const reactivated = await merchantService.updateAdminMerchantStatus(
        merchantId,
        'APPROVED',
        'Hygiene re-inspection passed',
      );
      assert.strictEqual(reactivated.merchant.status, 'APPROVED');
    });
  });

  describe('Phase 2 Checkpoint 4: Multi-Outlet Management & Versioned Business Documents', () => {
    it('should submit and version merchant KYC documents (FSSAI, GSTIN)', async () => {
      const reg = await merchantService.registerOrUpdate(testOwnerId, {
        businessName: 'Anjappar Chettinad',
        merchantType: 'RESTAURANT',
        panNumber: 'ABCDE1234F',
        bankAccountNumber: '50100234567890',
        bankIfsc: 'HDFC0001234',
        bankBeneficiaryName: 'Anjappar Pvt Ltd',
        outletName: 'Anna Nagar Main',
        addressLine1: 'No 12, 2nd Avenue',
        postalCode: '600040',
        latitude: 13.085,
        longitude: 80.21,
        phone: '+919876543210',
      } as any);

      // Version 1 upload
      const ticket1 = await (merchantService as any).storage.createTicket(testOwnerId, {
        documentType: 'FSSAI_LICENSE',
        mimeType: 'application/pdf',
        fileSizeBytes: 2048,
      });
      const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
      await (merchantService as any).storage.saveUploadedFile(ticket1.id, testOwnerId, pdf);

      const docV1 = await merchantService.submitDocument(testOwnerId, {
        documentType: 'FSSAI_LICENSE',
        documentNumber: '12423001000123',
        ticketId: ticket1.id,
      });

      assert.strictEqual(docV1.version, 1);
      assert.strictEqual(docV1.is_current, true);

      // Version 2 renewal upload
      const ticket2 = await (merchantService as any).storage.createTicket(testOwnerId, {
        documentType: 'FSSAI_LICENSE',
        mimeType: 'application/pdf',
        fileSizeBytes: 2048,
      });
      await (merchantService as any).storage.saveUploadedFile(ticket2.id, testOwnerId, pdf);

      const docV2 = await merchantService.submitDocument(testOwnerId, {
        documentType: 'FSSAI_LICENSE',
        documentNumber: '12426009999999',
        ticketId: ticket2.id,
      });

      assert.strictEqual(docV2.version, 2);
      assert.strictEqual(docV2.is_current, true);

      // Check V1 is superseded
      const docs = await merchantService.getMerchantDocuments(reg.merchant.id);
      assert.strictEqual(docs.length, 1, 'Only current document should be returned as active');
      assert.strictEqual(docs[0].version, 2);
    });

    it('should create additional outlet branch with PENDING_APPROVAL status and enforce independent outlet approval', async () => {
      const reg = await merchantService.registerOrUpdate(testOwnerId, {
        businessName: 'Anjappar Chettinad',
        merchantType: 'RESTAURANT',
        panNumber: 'ABCDE1234F',
        bankAccountNumber: '50100234567890',
        bankIfsc: 'HDFC0001234',
        bankBeneficiaryName: 'Anjappar Pvt Ltd',
        outletName: 'Anna Nagar Main',
        addressLine1: 'No 12, 2nd Avenue',
        postalCode: '600040',
        latitude: 13.085,
        longitude: 80.21,
        phone: '+919876543210',
      } as any);

      // Create 2nd outlet branch
      const branch2 = await merchantService.createOutlet(testOwnerId, {
        outletName: 'Anjappar T Nagar Branch',
        addressLine1: 'No 45 Usman Road',
        postalCode: '600017',
        latitude: 13.0405,
        longitude: 80.2337,
        phone: '+919876543212',
      });

      assert.strictEqual(branch2.outlet_name, 'Anjappar T Nagar Branch');
      assert.strictEqual(branch2.outlet_status, 'PENDING_APPROVAL');
      assert.strictEqual(branch2.is_open, false, 'New outlet branch must not open automatically');

      // Admin approves merchant profile
      await merchantService.updateAdminMerchantStatus(reg.merchant.id, 'APPROVED');

      // Check outlets: primary outlet is approved, but branch 2 MUST still be PENDING_APPROVAL
      const outlets = await merchantService.getOutlets(testOwnerId);
      const branch2After = outlets.find((o: any) => o.id === branch2.id);
      assert.strictEqual(
        branch2After.outlet_status,
        'PENDING_APPROVAL',
        'Approval of merchant must NOT auto-activate pending secondary outlets',
      );
      assert.strictEqual(branch2After.is_open, false);

      // Now explicitly approve branch 2
      const adminApproval = await merchantService.updateAdminOutletStatus(
        branch2.id,
        'admin_001',
        'ACTIVE',
        'Inspection passed',
      );
      assert.strictEqual(adminApproval.outletStatus, 'ACTIVE');
      assert.strictEqual(adminApproval.isOpen, true);

      // Admin suspends branch 2
      const suspended = await merchantService.updateAdminOutletStatus(
        branch2.id,
        'admin_001',
        'SUSPENDED',
        'Hygiene violation notice',
      );
      assert.strictEqual(suspended.outletStatus, 'SUSPENDED');
      assert.strictEqual(suspended.isOpen, false);

      // Admin reactivates branch 2
      const reactivated = await merchantService.updateAdminOutletStatus(
        branch2.id,
        'admin_001',
        'ACTIVE',
        'Hygiene re-inspection cleared',
      );
      assert.strictEqual(reactivated.outletStatus, 'ACTIVE');
      assert.strictEqual(reactivated.isOpen, true);

      // Admin rejects branch 2
      const rejected = await merchantService.updateAdminOutletStatus(
        branch2.id,
        'admin_001',
        'REJECTED',
        'Permanent closure notice',
      );
      assert.strictEqual(rejected.outletStatus, 'REJECTED');
      assert.strictEqual(rejected.isOpen, false);
    });
  });
});
