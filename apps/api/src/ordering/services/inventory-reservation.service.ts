import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import pg from 'pg';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class InventoryReservationService {
  private readonly logger = new Logger(InventoryReservationService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Atomically reserve inventory within a database transaction using row locks
   */
  async reserveInventory(
    client: pg.PoolClient,
    checkoutSessionId: string,
    outletId: string,
    items: Array<{ itemId: string; quantity: number }>
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15-minute reservation window

    for (const it of items) {
      // 1. Lock inventory row for this item at this outlet using SELECT ... FOR UPDATE
      const invRes = await client.query(
        `SELECT id, stock_quantity, reserved_quantity, is_in_stock
         FROM inventory
         WHERE outlet_id = $1 AND item_id = $2
         FOR UPDATE;`,
        [outletId, it.itemId]
      );

      if (invRes.rows.length > 0) {
        const inv = invRes.rows[0];
        const currentStock = Number(inv.stock_quantity);

        if (!inv.is_in_stock || currentStock < it.quantity) {
          throw new BadRequestException(
            `Item ${it.itemId} is out of stock (Available: ${currentStock}, Requested: ${it.quantity})`
          );
        }

        // Decrement available stock quantity atomically
        await client.query(
          `UPDATE inventory
           SET stock_quantity = stock_quantity - $1,
               reserved_quantity = reserved_quantity + $1,
               is_in_stock = (stock_quantity - $1) > 0,
               updated_at = NOW()
           WHERE id = $2;`,
          [it.quantity, inv.id]
        );
      }

      // 2. Record reservation in inventory_reservations
      await client.query(
        `INSERT INTO inventory_reservations (
           checkout_session_id, outlet_id, item_id, quantity, expires_at, status
         ) VALUES ($1, $2, $3, $4, $5, 'RESERVED');`,
        [checkoutSessionId, outletId, it.itemId, it.quantity, expiresAt]
      );
    }
  }

  /**
   * Commit reservation on order acceptance / completion
   */
  async commitReservation(checkoutSessionId: string): Promise<void> {
    const res = await this.db.query(
      `SELECT outlet_id, item_id, quantity
       FROM inventory_reservations
       WHERE checkout_session_id = $1 AND status = 'RESERVED';`,
      [checkoutSessionId]
    );

    for (const r of res.rows) {
      await this.db.query(
        `UPDATE inventory
         SET reserved_quantity = GREATEST(0, reserved_quantity - $1),
             updated_at = NOW()
         WHERE outlet_id = $2 AND item_id = $3;`,
        [r.quantity, r.outlet_id, r.item_id]
      );
    }

    await this.db.query(
      `UPDATE inventory_reservations
       SET status = 'COMMITTED'
       WHERE checkout_session_id = $1 AND status = 'RESERVED';`,
      [checkoutSessionId]
    );
  }

  /**
   * Release reservation and restore stock on order cancellation / failure
   */
  async releaseReservation(checkoutSessionId: string): Promise<void> {
    const res = await this.db.query(
      `SELECT outlet_id, item_id, quantity
       FROM inventory_reservations
       WHERE checkout_session_id = $1 AND status = 'RESERVED';`,
      [checkoutSessionId]
    );

    for (const r of res.rows) {
      await this.db.query(
        `UPDATE inventory
         SET stock_quantity = stock_quantity + $1,
             reserved_quantity = GREATEST(0, reserved_quantity - $1),
             is_in_stock = TRUE,
             updated_at = NOW()
         WHERE outlet_id = $2 AND item_id = $3;`,
        [r.quantity, r.outlet_id, r.item_id]
      );
    }

    await this.db.query(
      `UPDATE inventory_reservations
       SET status = 'RELEASED'
       WHERE checkout_session_id = $1 AND status = 'RESERVED';`,
      [checkoutSessionId]
    );
  }
}
