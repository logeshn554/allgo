import { Controller, Get, NotFoundException, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { DatabaseService } from '../database/database.service.js';
import { CatalogMediaService } from './catalog-media.service.js';
import { CatalogService } from './catalog.service.js';
import { ProductQueryDto } from './dto/product.dto.js';
import { OperatingHoursService } from './operating-hours.service.js';

@Controller('v1/customer')
export class CustomerCatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly operatingHoursService: OperatingHoursService,
    private readonly catalogMediaService: CatalogMediaService,
    private readonly db: DatabaseService,
  ) {}

  /**
   * Browse active merchants / outlets with calculated isOpen status
   */
  @Get('outlets')
  async getOutlets(
    @Query('cityId') cityId?: string,
    @Query('zoneId') zoneId?: string,
    @Query('merchantType') merchantType?: string,
  ) {
    let sql = `
      SELECT o.id, o.merchant_id, o.outlet_name, o.address_line1, o.postal_code,
             o.phone, o.default_prep_time_minutes, o.packaging_fee_inr,
             o.timezone, o.outlet_status,
             ST_Y(o.location::geometry) as latitude,
             ST_X(o.location::geometry) as longitude,
             m.business_name, m.merchant_type,
             z.name as zone_name
      FROM outlets o
      JOIN merchants m ON m.id = o.merchant_id
      JOIN zones z ON z.id = o.zone_id
      WHERE o.outlet_status = 'ACTIVE'
        AND m.status IN ('APPROVED', 'LIVE')
    `;
    const params: any[] = [];

    if (zoneId) {
      params.push(zoneId);
      sql += ` AND o.zone_id = $${params.length}`;
    }
    if (cityId) {
      params.push(cityId);
      sql += ` AND z.city_id = $${params.length}`;
    }
    if (merchantType) {
      params.push(merchantType);
      sql += ` AND m.merchant_type = $${params.length}`;
    }

    sql += ' ORDER BY o.outlet_name ASC;';
    const res = await this.db.query(sql, params);

    // Compute live isOpen status for each eligible outlet
    const outlets = await Promise.all(
      res.rows.map(async (r: any) => {
        const openStatus = await this.operatingHoursService.calculateIsOpen(r.id);
        return {
          id: r.id,
          merchantId: r.merchant_id,
          outletName: r.outlet_name,
          businessName: r.business_name,
          merchantType: r.merchant_type,
          addressLine1: r.address_line1,
          postalCode: r.postal_code,
          phone: r.phone,
          defaultPrepTimeMinutes: r.default_prep_time_minutes,
          packagingFeeInr: Number.parseFloat(r.packaging_fee_inr),
          latitude: Number.parseFloat(r.latitude),
          longitude: Number.parseFloat(r.longitude),
          zoneName: r.zone_name,
          timezone: r.timezone,
          isOpen: openStatus.isOpen,
          openReason: openStatus.reason,
          currentInterval: openStatus.currentInterval,
        };
      }),
    );

    return outlets;
  }

  /**
   * Get public outlet details and schedule
   */
  @Get('outlets/:outletId')
  async getOutletDetails(@Param('outletId') outletId: string) {
    const res = await this.db.query(
      `SELECT o.id, o.merchant_id, o.outlet_name, o.address_line1, o.postal_code,
              o.phone, o.default_prep_time_minutes, o.packaging_fee_inr,
              o.timezone, o.outlet_status,
              ST_Y(o.location::geometry) as latitude,
              ST_X(o.location::geometry) as longitude,
              m.business_name, m.merchant_type,
              z.name as zone_name
       FROM outlets o
       JOIN merchants m ON m.id = o.merchant_id
       JOIN zones z ON z.id = o.zone_id
       WHERE o.id = $1 AND o.outlet_status = 'ACTIVE' AND m.status IN ('APPROVED', 'LIVE');`,
      [outletId],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException(`Outlet ${outletId} not found or not currently active`);
    }

    const r = res.rows[0];
    const [openStatus, weeklyHours, specialClosures] = await Promise.all([
      this.operatingHoursService.calculateIsOpen(outletId),
      this.operatingHoursService.getWeeklyHours(outletId),
      this.operatingHoursService.getSpecialClosures(outletId),
    ]);

    return {
      id: r.id,
      merchantId: r.merchant_id,
      outletName: r.outlet_name,
      businessName: r.business_name,
      merchantType: r.merchant_type,
      addressLine1: r.address_line1,
      postalCode: r.postal_code,
      phone: r.phone,
      defaultPrepTimeMinutes: r.default_prep_time_minutes,
      packagingFeeInr: Number.parseFloat(r.packaging_fee_inr),
      latitude: Number.parseFloat(r.latitude),
      longitude: Number.parseFloat(r.longitude),
      zoneName: r.zone_name,
      timezone: r.timezone,
      isOpen: openStatus.isOpen,
      openReason: openStatus.reason,
      currentInterval: openStatus.currentInterval,
      weeklyHours,
      specialClosures,
    };
  }

  /**
   * Real-time check of outlet open/closed status
   */
  @Get('outlets/:outletId/status')
  async getOutletStatus(@Param('outletId') outletId: string) {
    return this.operatingHoursService.calculateIsOpen(outletId);
  }

  /**
   * Get active categories for an active outlet
   */
  @Get('outlets/:outletId/categories')
  async getCategories(@Param('outletId') outletId: string) {
    // Verify outlet is active
    const outCheck = await this.db.query(
      `SELECT o.id FROM outlets o
       JOIN merchants m ON m.id = o.merchant_id
       WHERE o.id = $1 AND o.outlet_status = 'ACTIVE' AND m.status IN ('APPROVED', 'LIVE');`,
      [outletId],
    );
    if (outCheck.rows.length === 0) throw new NotFoundException('Active outlet not found');

    return this.catalogService.getCategories(outletId, false);
  }

  /**
   * Browse active products in an active outlet
   */
  @Get('outlets/:outletId/products')
  async getProducts(@Param('outletId') outletId: string, @Query() query: ProductQueryDto) {
    const outCheck = await this.db.query(
      `SELECT o.id FROM outlets o
       JOIN merchants m ON m.id = o.merchant_id
       WHERE o.id = $1 AND o.outlet_status = 'ACTIVE' AND m.status IN ('APPROVED', 'LIVE');`,
      [outletId],
    );
    if (outCheck.rows.length === 0) throw new NotFoundException('Active outlet not found');

    return this.catalogService.getProducts(outletId, query, true);
  }

  /**
   * Customer product details with variants, option groups, and dietary flags
   */
  @Get('products/:productId')
  async getProductDetails(
    @Param('productId') productId: string,
    @Query('outletId') outletId?: string,
  ) {
    const product = await this.catalogService.getProductById(productId, outletId);

    // Business rule 4: Do not expose draft, inactive, or archived products to customers
    if (product.productStatus !== 'ACTIVE' || product.adminStatus !== 'APPROVED') {
      throw new NotFoundException('Product not available');
    }

    return product;
  }

  /**
   * Safe public catalog image delivery
   */
  @Get('catalog/images/:storageKey')
  async serveCatalogImage(@Param('storageKey') storageKey: string, @Res() res: Response) {
    return this.catalogMediaService.serveCatalogImage(storageKey, res);
  }
}
