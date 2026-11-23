import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { AddToCartDto, UpdateCartItemDto } from '../dto/ordering.dto.js';
import { PricingService } from './pricing.service.js';

@Injectable()
export class CartService {
  constructor(
    private readonly db: DatabaseService,
    private readonly pricingService: PricingService
  ) {}

  async getOrCreateCart(customerId: string): Promise<string> {
    const res = await this.db.query(
      `INSERT INTO carts (customer_id)
       VALUES ($1)
       ON CONFLICT (customer_id) DO UPDATE SET updated_at = NOW()
       RETURNING id;`,
      [customerId]
    );
    return res.rows[0].id;
  }

  async getCart(customerId: string): Promise<any> {
    const cartId = await this.getOrCreateCart(customerId);

    const itemsRes = await this.db.query(
      `SELECT ci.id as cart_item_id, ci.cart_id, ci.outlet_id, ci.item_id, ci.variant_id,
              ci.quantity, ci.selected_options, ci.special_instructions,
              i.name as item_name, i.base_price_inr, i.image_url, i.is_veg,
              COALESCE(i.is_active, true) as is_active,
              iv.variant_name as variant_name, iv.additional_price_inr as variant_price_inr,
              o.outlet_name, o.outlet_status, o.address_line1 as outlet_address,
              COALESCE(o.packaging_fee_inr, 15.00) as outlet_packaging_fee,
              COALESCE(cat.vertical_type, 'FOOD') as vertical_type,
              COALESCE(inv.stock_quantity, 999) as stock_quantity,
              COALESCE(inv.is_in_stock, true) as is_in_stock,
              oio.custom_price_inr as price_override_inr, oio.is_available as outlet_item_available
       FROM cart_items ci
       JOIN items i ON i.id = ci.item_id
       JOIN outlets o ON o.id = ci.outlet_id
       LEFT JOIN categories c ON c.id = i.category_id
       LEFT JOIN catalogs cat ON cat.id = c.catalog_id
       LEFT JOIN item_variants iv ON iv.id = ci.variant_id
       LEFT JOIN inventory inv ON inv.outlet_id = ci.outlet_id AND inv.item_id = ci.item_id
       LEFT JOIN outlet_item_overrides oio ON oio.outlet_id = ci.outlet_id AND oio.item_id = ci.item_id
       WHERE ci.cart_id = $1
       ORDER BY ci.created_at ASC;`,
      [cartId]
    );

    if (itemsRes.rows.length === 0) {
      return {
        cartId,
        outlet: null,
        outlets: [],
        items: [],
        totalItemsCount: 0,
        pricing: null,
      };
    }

    const firstItem = itemsRes.rows[0];
    const outletInfo = {
      id: firstItem.outlet_id,
      name: firstItem.outlet_name,
      status: firstItem.outlet_status,
      address: firstItem.outlet_address,
    };

    const pricing = await this.pricingService.calculateCheckoutTotals(
      itemsRes.rows,
      firstItem.outlet_id
    );

    const outletsMap = new Map<string, any>();
    for (const row of itemsRes.rows) {
      if (!outletsMap.has(row.outlet_id)) {
        const outletPricing = pricing?.outletsBreakdown?.find((ob) => ob.outletId === row.outlet_id);
        outletsMap.set(row.outlet_id, {
          id: row.outlet_id,
          name: row.outlet_name,
          status: row.outlet_status,
          address: row.outlet_address,
          verticalType: row.vertical_type || 'FOOD',
          packagingFeeInr: outletPricing ? outletPricing.packagingFeeInr : Number(row.outlet_packaging_fee || 15.0),
          deliveryFeeInr: outletPricing ? outletPricing.deliveryFeeInr : 0,
          items: [],
          subtotalInr: 0,
          totalItemsCount: 0,
        });
      }
    }

    const mappedItems = itemsRes.rows.map((row) => {
      const breakdown = pricing.itemsBreakdown.find((b) => b.itemId === row.item_id);
      const itemTotal = breakdown ? breakdown.totalPriceInr : Number(row.base_price_inr) * row.quantity;
      const mapped = {
        id: row.cart_item_id,
        itemId: row.item_id,
        outletId: row.outlet_id,
        outletName: row.outlet_name,
        verticalType: row.vertical_type || 'FOOD',
        name: row.item_name,
        imageUrl: row.image_url,
        isVeg: row.is_veg,
        variantId: row.variant_id,
        variantName: row.variant_name,
        quantity: row.quantity,
        stockQuantity: row.stock_quantity,
        isInStock: row.is_in_stock && row.stock_quantity >= row.quantity,
        unitPriceInr: breakdown ? breakdown.unitPriceInr : Number(row.base_price_inr),
        totalPriceInr: itemTotal,
        selectedOptions: row.selected_options || [],
        specialInstructions: row.special_instructions,
      };

      const outletEntry = outletsMap.get(row.outlet_id);
      if (outletEntry) {
        outletEntry.items.push(mapped);
        outletEntry.subtotalInr += itemTotal;
        outletEntry.totalItemsCount += row.quantity;
      }

      return mapped;
    });

    const totalItemsCount = mappedItems.reduce((acc, it) => acc + it.quantity, 0);

    return {
      cartId,
      outlet: outletInfo,
      outlets: Array.from(outletsMap.values()),
      items: mappedItems,
      totalItemsCount,
      pricing,
    };
  }

  async addToCart(customerId: string, dto: AddToCartDto): Promise<any> {
    const cartId = await this.getOrCreateCart(customerId);

    const itemRes = await this.db.query(
      `SELECT i.id, i.name, i.is_active, cat.outlet_id, o.merchant_id, m.status as merchant_status
       FROM items i
       JOIN categories c ON c.id = i.category_id
       JOIN catalogs cat ON cat.id = c.catalog_id
       JOIN outlets o ON o.id = cat.outlet_id
       JOIN merchants m ON m.id = o.merchant_id
       WHERE i.id = $1;`,
      [dto.itemId]
    );

    if (itemRes.rows.length === 0) {
      throw new NotFoundException(`Item not found`);
    }

    const item = itemRes.rows[0];
    if (item.is_active === false) {
      throw new BadRequestException(`Item "${item.name}" is currently unavailable`);
    }

    const outletRes = await this.db.query(
      `SELECT id, outlet_name, outlet_status FROM outlets WHERE id = $1 AND merchant_id = $2;`,
      [dto.outletId, item.merchant_id]
    );

    if (outletRes.rows.length === 0) {
      throw new BadRequestException(`Item does not belong to the selected outlet`);
    }

    const outlet = outletRes.rows[0];
    if (outlet.outlet_status !== 'ACTIVE' && outlet.outlet_status !== 'APPROVED') {
      throw new BadRequestException(`Outlet "${outlet.outlet_name}" is currently closed or unapproved`);
    }

    const invRes = await this.db.query(
      `SELECT stock_quantity, is_in_stock FROM inventory WHERE outlet_id = $1 AND item_id = $2;`,
      [dto.outletId, dto.itemId]
    );

    if (invRes.rows.length > 0) {
      const inv = invRes.rows[0];
      if (!inv.is_in_stock || inv.stock_quantity < dto.quantity) {
        throw new BadRequestException(`Insufficient stock. Only ${inv.stock_quantity} available.`);
      }
    }

    if (dto.replaceCartIfDifferentOutlet) {
      await this.db.query(`DELETE FROM cart_items WHERE cart_id = $1;`, [cartId]);
    }

    const selectedOptionsJson = JSON.stringify(dto.selectedOptions || []);

    const existingItemRes = await this.db.query(
      `SELECT id, quantity FROM cart_items
       WHERE cart_id = $1 AND item_id = $2 AND outlet_id = $3
         AND ((variant_id IS NULL AND $4::uuid IS NULL) OR variant_id = $4::uuid)
         AND selected_options = $5::jsonb;`,
      [cartId, dto.itemId, dto.outletId, dto.variantId || null, selectedOptionsJson]
    );
    if (existingItemRes.rows.length > 0) {
      const newQty = existingItemRes.rows[0].quantity + dto.quantity;
      await this.db.query(
        `UPDATE cart_items SET quantity = $1, special_instructions = COALESCE($2, special_instructions), updated_at = NOW()
         WHERE id = $3;`,
        [newQty, dto.specialInstructions || null, existingItemRes.rows[0].id]
      );
    } else {
      await this.db.query(
        `INSERT INTO cart_items (
           cart_id, outlet_id, item_id, variant_id, quantity, selected_options, special_instructions
         ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7);`,
        [
          cartId,
          dto.outletId,
          dto.itemId,
          dto.variantId || null,
          dto.quantity,
          selectedOptionsJson,
          dto.specialInstructions || null,
        ]
      );
    }
    return this.getCart(customerId);
  }
  async updateCartItem(customerId: string, cartItemId: string, dto: UpdateCartItemDto): Promise<any> {
    const cartId = await this.getOrCreateCart(customerId);
    if (dto.quantity <= 0) {
      await this.db.query(`DELETE FROM cart_items WHERE id = $1 AND cart_id = $2;`, [cartItemId, cartId]);
    } else {
      const selectedOptionsJson = dto.selectedOptions ? JSON.stringify(dto.selectedOptions) : null;
      await this.db.query(
        `UPDATE cart_items
         SET quantity = $1,
             selected_options = COALESCE($2::jsonb, selected_options),
             special_instructions = COALESCE($3, special_instructions),
             updated_at = NOW()
         WHERE id = $4 AND cart_id = $5;`,
        [dto.quantity, selectedOptionsJson, dto.specialInstructions || null, cartItemId, cartId]
      );
    }
    return this.getCart(customerId);
  }
  async removeCartItem(customerId: string, cartItemId: string): Promise<any> {
    const cartId = await this.getOrCreateCart(customerId);
    await this.db.query(`DELETE FROM cart_items WHERE id = $1 AND cart_id = $2;`, [cartItemId, cartId]);
    return this.getCart(customerId);
  }
  async clearCart(customerId: string): Promise<void> {
    const cartId = await this.getOrCreateCart(customerId);
    await this.db.query(`DELETE FROM cart_items WHERE cart_id = $1;`, [cartId]);
  }
}