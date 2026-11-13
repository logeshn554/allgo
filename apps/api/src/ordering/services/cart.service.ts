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

  /**
   * Get or create active cart for customer
   */
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

  /**
   * Get cart with items, live prices and totals
   */
  async getCart(customerId: string): Promise<any> {
    const cartId = await this.getOrCreateCart(customerId);

    const itemsRes = await this.db.query(
      `SELECT ci.id as cart_item_id, ci.cart_id, ci.outlet_id, ci.item_id, ci.variant_id,
              ci.quantity, ci.selected_options, ci.special_instructions,
              i.name as item_name, i.base_price_inr, i.image_url, i.is_veg,
              COALESCE(i.is_active, true) as is_active,
              iv.variant_name as variant_name, iv.additional_price_inr as variant_price_inr,
              o.outlet_name, o.outlet_status, o.address_line1 as outlet_address,
              COALESCE(inv.stock_quantity, 999) as stock_quantity,
              COALESCE(inv.is_in_stock, true) as is_in_stock,
              oio.custom_price_inr as price_override_inr, oio.is_available as outlet_item_available
       FROM cart_items ci
       JOIN items i ON i.id = ci.item_id
       JOIN outlets o ON o.id = ci.outlet_id
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

    // Calculate live pricing
    const pricing = await this.pricingService.calculateCheckoutTotals(
      itemsRes.rows,
      firstItem.outlet_id
    );

    const mappedItems = itemsRes.rows.map((row) => {
      const breakdown = pricing.itemsBreakdown.find((b) => b.itemId === row.item_id);
      return {
        id: row.cart_item_id,
        itemId: row.item_id,
        name: row.item_name,
        imageUrl: row.image_url,
        isVeg: row.is_veg,
        variantId: row.variant_id,
        variantName: row.variant_name,
        quantity: row.quantity,
        stockQuantity: row.stock_quantity,
        isInStock: row.is_in_stock && row.stock_quantity >= row.quantity,
        unitPriceInr: breakdown ? breakdown.unitPriceInr : Number(row.base_price_inr),
        totalPriceInr: breakdown ? breakdown.totalPriceInr : Number(row.base_price_inr) * row.quantity,
        selectedOptions: row.selected_options || [],
        specialInstructions: row.special_instructions,
      };
    });

    const totalItemsCount = mappedItems.reduce((acc, it) => acc + it.quantity, 0);

    return {
      cartId,
      outlet: outletInfo,
      items: mappedItems,
      totalItemsCount,
      pricing,
    };
  }

  /**
   * Add item to customer cart with single-outlet enforcement
   */
  async addToCart(customerId: string, dto: AddToCartDto): Promise<any> {
    const cartId = await this.getOrCreateCart(customerId);

    // 1. Verify item exists and is active
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

    // 2. Verify outlet belongs to merchant and is active
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

    // 3. Check inventory stock
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

    // 4. Single-Outlet Cart Check
    const existingCartItemsRes = await this.db.query(
      `SELECT ci.outlet_id, o.outlet_name
       FROM cart_items ci
       JOIN outlets o ON o.id = ci.outlet_id
       WHERE ci.cart_id = $1 LIMIT 1;`,
      [cartId]
    );

    if (existingCartItemsRes.rows.length > 0) {
      const existingOutletId = existingCartItemsRes.rows[0].outlet_id;
      const existingOutletName = existingCartItemsRes.rows[0].outlet_name;

      if (existingOutletId !== dto.outletId) {
        if (!dto.replaceCartIfDifferentOutlet) {
          throw new ConflictException({
            code: 'DIFFERENT_OUTLET_CONFLICT',
            message: `Your cart contains items from "${existingOutletName}". Replace cart with items from "${outlet.outlet_name}"?`,
            existingOutletId,
            existingOutletName,
            newOutletId: dto.outletId,
            newOutletName: outlet.outlet_name,
          });
        }

        // Replace existing cart items
        await this.db.query(`DELETE FROM cart_items WHERE cart_id = $1;`, [cartId]);
      }
    }

    // 5. Insert or update item in cart
    const selectedOptionsJson = JSON.stringify(dto.selectedOptions || []);

    // Check if identical item (with same variant and options) already exists in cart
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

  /**
   * Update quantity or options of item in cart
   */
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

  /**
   * Remove item from cart
   */
  async removeCartItem(customerId: string, cartItemId: string): Promise<any> {
    const cartId = await this.getOrCreateCart(customerId);
    await this.db.query(`DELETE FROM cart_items WHERE id = $1 AND cart_id = $2;`, [cartItemId, cartId]);
    return this.getCart(customerId);
  }

  /**
   * Clear entire cart
   */
  async clearCart(customerId: string): Promise<void> {
    const cartId = await this.getOrCreateCart(customerId);
    await this.db.query(`DELETE FROM cart_items WHERE cart_id = $1;`, [cartId]);
  }
}
