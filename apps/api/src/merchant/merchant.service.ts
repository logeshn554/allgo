import { Injectable, Optional } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { RedisService } from '../redis/redis.service.js';
import { EncryptionService } from '../common/encryption/encryption.service.js';
import { StorageService } from '../storage/storage.service.js';
import { RegisterMerchantDto } from './dto/register-merchant.dto.js';
import { UpdateOutletStatusDto } from './dto/update-outlet-status.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { UpdateInventoryDto } from './dto/update-inventory.dto.js';
import { CreateOutletDto } from './dto/create-outlet.dto.js';
import { SubmitMerchantDocumentDto } from './dto/submit-merchant-doc.dto.js';
import { MerchantRepository } from './data/merchant.repository.js';
import { MerchantOutletRepository } from './data/merchant-outlet.repository.js';
import { MerchantOrderRepository } from './data/merchant-order.repository.js';
import { MerchantCatalogDataRepository } from './data/merchant-catalog-data.repository.js';
import { MerchantDocumentRepository } from './data/merchant-document.repository.js';
import { MerchantProfileService } from './merchant-profile.service.js';
import { MerchantOutletService } from './merchant-outlet.service.js';
import { MerchantDocumentService } from './merchant-document.service.js';
import { MerchantOrderService } from './merchant-order.service.js';
import { MerchantProductService } from './merchant-product.service.js';
import { MerchantFinanceService } from './merchant-finance.service.js';
import { AdminMerchantService } from './admin-merchant.service.js';

@Injectable()
export class MerchantService {
  public inMemoryMerchantDocuments = new Map<string, any>();
  public inMemoryOutlets = new Map<string, any[]>();

  private readonly profileService: MerchantProfileService;
  private readonly outletService: MerchantOutletService;
  private readonly docService: MerchantDocumentService;
  private readonly orderService: MerchantOrderService;
  private readonly productService: MerchantProductService;
  private readonly financeService: MerchantFinanceService;
  private readonly adminService: AdminMerchantService;

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    @Optional() private encryption?: EncryptionService,
    @Optional() private storage?: StorageService,
    @Optional() profileService?: MerchantProfileService,
    @Optional() outletService?: MerchantOutletService,
    @Optional() docService?: MerchantDocumentService,
    @Optional() orderService?: MerchantOrderService,
    @Optional() productService?: MerchantProductService,
    @Optional() financeService?: MerchantFinanceService,
    @Optional() adminService?: AdminMerchantService,
  ) {
    if (!this.encryption) {
      this.encryption = new EncryptionService();
      this.encryption.initializeKeys();
    }
    if (!this.storage) {
      this.storage = new StorageService(this.db);
    }

    if (!profileService || !outletService || !docService || !orderService || !productService || !financeService || !adminService) {
      const merchantRepo = new MerchantRepository(this.db);
      const outletRepo = new MerchantOutletRepository(this.db);
      const orderRepo = new MerchantOrderRepository(this.db);
      const catDataRepo = new MerchantCatalogDataRepository(this.db);
      const docRepo = new MerchantDocumentRepository(this.db);

      this.profileService = profileService || new MerchantProfileService(merchantRepo, outletRepo, catDataRepo);
      this.outletService = outletService || new MerchantOutletService(merchantRepo, outletRepo);
      this.docService = docService || new MerchantDocumentService(merchantRepo, docRepo, this.storage);
      this.orderService = orderService || new MerchantOrderService(merchantRepo, outletRepo, orderRepo);
      this.productService = productService || new MerchantProductService(merchantRepo, outletRepo, catDataRepo);
      this.financeService = financeService || new MerchantFinanceService(merchantRepo, outletRepo, orderRepo);
      this.adminService = adminService || new AdminMerchantService(merchantRepo, outletRepo, docRepo, this.docService);
    } else {
      this.profileService = profileService;
      this.outletService = outletService;
      this.docService = docService;
      this.orderService = orderService;
      this.productService = productService;
      this.financeService = financeService;
      this.adminService = adminService;
    }
  }

  getMerchantByOwnerId(userId: string) { return this.profileService.getMerchantByOwnerId(userId); }
  getPrimaryOutlet(merchantId: string) { return this.profileService.getPrimaryOutlet(merchantId); }
  registerOrUpdate(userId: string, dto: RegisterMerchantDto) { return this.profileService.registerOrUpdate(userId, dto, this.inMemoryOutlets); }
  getProfile(userId: string) { return this.profileService.getProfile(userId); }
  submitForReview(userId: string) { return this.profileService.submitForReview(userId); }

  updateOutletStatus(userId: string, outletId: string, dto: UpdateOutletStatusDto) { return this.outletService.updateOutletStatus(userId, outletId, dto); }
  createOutlet(userId: string, dto: CreateOutletDto) { return this.outletService.createOutlet(userId, dto, this.inMemoryOutlets); }
  getOutlets(userId: string) { return this.outletService.getOutlets(userId, this.inMemoryOutlets); }

  submitDocument(userId: string, dto: SubmitMerchantDocumentDto) { return this.docService.submitDocument(userId, dto, this.inMemoryMerchantDocuments); }
  getMerchantDocuments(merchantId: string) { return this.docService.getMerchantDocuments(merchantId, this.inMemoryMerchantDocuments); }

  getDashboard(userId: string) { return this.orderService.getDashboard(userId); }
  getOrders(userId: string, statusFilter?: string) { return this.orderService.getOrders(userId, statusFilter); }
  getOrderById(userId: string, orderId: string) { return this.orderService.getOrderById(userId, orderId); }
  updateOrderStatus(userId: string, orderId: string, dto: UpdateOrderStatusDto) { return this.orderService.updateOrderStatus(userId, orderId, dto); }

  getCategories(userId: string) { return this.productService.getCategories(userId); }
  getProducts(userId: string, categoryId?: string, search?: string) { return this.productService.getProducts(userId, categoryId, search); }
  createProduct(userId: string, dto: CreateProductDto) { return this.productService.createProduct(userId, dto); }
  updateProduct(userId: string, productId: string, dto: UpdateProductDto) { return this.productService.updateProduct(userId, productId, dto); }
  deleteProduct(userId: string, productId: string) { return this.productService.deleteProduct(userId, productId); }
  updateInventory(userId: string, itemId: string, dto: UpdateInventoryDto) { return this.productService.updateInventory(userId, itemId, dto); }

  getEarnings(userId: string) { return this.financeService.getEarnings(userId); }
  getPayouts(userId: string) { return this.financeService.getPayouts(userId); }

  listAdminMerchantApplications(options?: any) { return this.adminService.listAdminMerchantApplications(options); }
  getAdminMerchantApplication(merchantId: string) { return this.adminService.getAdminMerchantApplication(merchantId, this.inMemoryOutlets, this.inMemoryMerchantDocuments); }
  updateAdminMerchantStatus(merchantId: string, status: string, notes?: string) { return this.adminService.updateAdminMerchantStatus(merchantId, status, notes); }
  updateAdminOutletStatus(outletId: string, adminUserId: string, newStatus: string, reason?: string) { return this.adminService.updateAdminOutletStatus(outletId, adminUserId, newStatus, reason, this.inMemoryOutlets); }
}
