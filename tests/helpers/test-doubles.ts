/**
 * Explicit Isolated Test Doubles for Unit Testing.
 *
 * RULE: Strictly prohibited from inclusion in runtime application source code (apps/api/src).
 * Permitted only in isolated unit tests in tests/ directory.
 */
import type pg from 'pg';

export class InMemoryRedisTestDouble {
  private inMemoryStore = new Map<string, { value: any; expiresAt?: number }>();
  private inMemoryHashes = new Map<string, Map<string, any>>();
  public isConnected = true;

  async onModuleInit() {}
  async onModuleDestroy() {}

  get isLive(): boolean {
    return true;
  }

  async checkConnection() {
    return { connected: true, latencyMs: 1 };
  }

  async get(key: string): Promise<string | null> {
    const item = this.inMemoryStore.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.inMemoryStore.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<'OK' | null> {
    const expiresAt = mode === 'EX' && duration ? Date.now() + duration * 1000 : undefined;
    this.inMemoryStore.set(key, { value, expiresAt });
    return 'OK';
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    this.inMemoryStore.set(key, { value, expiresAt: Date.now() + seconds * 1000 });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    const existed = this.inMemoryStore.delete(key) || this.inMemoryHashes.delete(key);
    return existed ? 1 : 0;
  }

  async exists(key: string): Promise<number> {
    if (this.inMemoryHashes.has(key)) return 1;
    const item = this.inMemoryStore.get(key);
    if (!item) return 0;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.inMemoryStore.delete(key);
      return 0;
    }
    return 1;
  }

  async hset(key: string, field: string, value: any): Promise<number> {
    let map = this.inMemoryHashes.get(key);
    if (!map) {
      map = new Map();
      this.inMemoryHashes.set(key, map);
    }
    const isNew = !map.has(field);
    map.set(field, String(value));
    return isNew ? 1 : 0;
  }

  async hget(key: string, field: string): Promise<string | null> {
    const map = this.inMemoryHashes.get(key);
    if (!map) return null;
    return map.get(field) ?? null;
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    let map = this.inMemoryHashes.get(key);
    if (!map) {
      map = new Map();
      this.inMemoryHashes.set(key, map);
    }
    const current = parseInt(map.get(field) || '0', 10);
    const updated = current + increment;
    map.set(field, String(updated));
    return updated;
  }

  async expire(key: string, seconds: number): Promise<number> {
    return 1;
  }

  async ttl(key: string): Promise<number> {
    const item = this.inMemoryStore.get(key);
    if (!item || !item.expiresAt) return -1;
    const remaining = Math.round((item.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  async evalLuaOtpVerify(
    key: string,
    expectedHmac: string,
    maxAttempts: number = 3
  ): Promise<number> {
    const map = this.inMemoryHashes.get(key);
    if (!map) {
      return -1; // Not found / expired
    }

    const attempts = parseInt(map.get('attempts') || '0', 10);
    if (attempts >= maxAttempts) {
      this.inMemoryHashes.delete(key);
      return -2; // Max attempts exceeded
    }

    const storedHmac = map.get('hmac');
    if (storedHmac === expectedHmac) {
      this.inMemoryHashes.delete(key);
      return 1; // Success & atomic consumption!
    } else {
      const newAttempts = attempts + 1;
      map.set('attempts', String(newAttempts));
      if (newAttempts >= maxAttempts) {
        this.inMemoryHashes.delete(key);
        return -2; // Lockout
      }
      return 0; // Mismatch
    }
  }
}

export class MockDatabaseService {
  public users = new Map<string, any>();
  public roles = new Map<string, any>();
  public userRoles = new Map<string, Set<string>>();
  public devices = new Map<string, any>();
  public merchants = new Map<string, any>();
  public outlets = new Map<string, any>();
  public catalogs = new Map<string, any>();
  public categories = new Map<string, any>();
  public items = new Map<string, any>();
  public inventory = new Map<string, any>();
  public subOrders = new Map<string, any>();
  public orderItems = new Map<string, any[]>();
  public orderEvents: any[] = [];
  public payouts = new Map<string, any>();

  constructor() {
    this.roles.set('CUSTOMER', { id: 'role_cust', name: 'CUSTOMER' });
    this.roles.set('PARTNER', { id: 'role_part', name: 'PARTNER' });
    this.roles.set('MERCHANT', { id: 'role_merch', name: 'MERCHANT' });
    this.roles.set('MERCHANT_ADMIN', { id: 'role_merch_admin', name: 'MERCHANT_ADMIN' });
    this.roles.set('MERCHANT_OPERATOR', { id: 'role_merch_op', name: 'MERCHANT_OPERATOR' });
    this.roles.set('ADMIN', { id: 'role_admin', name: 'ADMIN' });
  }

  async onModuleInit() {}
  async onModuleDestroy() {}

  async checkConnection() {
    return { connected: true, latencyMs: 1 };
  }

  async query<T extends pg.QueryResultRow = any>(text: string, params: any[] = []): Promise<pg.QueryResult<T>> {
    // SELECT from users by phone
    if (text.includes('FROM users WHERE phone = $1')) {
      const phone = params[0];
      for (const u of this.users.values()) {
        if (u.phone === phone) {
          return { rows: [u as T], rowCount: 1, command: 'SELECT', oid: 0, fields: [] };
        }
      }
      return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
    }

    // SELECT from users by id with roles
    if (text.includes('WHERE u.id = $1')) {
      const userId = params[0];
      const u = this.users.get(userId);
      if (u) {
        const userRolesList = Array.from(this.userRoles.get(userId) || ['CUSTOMER']);
        const row = {
          ...u,
          roles: userRolesList,
        };
        return { rows: [row as T], rowCount: 1, command: 'SELECT', oid: 0, fields: [] };
      }
      return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
    }

    // SELECT refresh_token_hash FROM devices
    if (text.includes('SELECT') && text.includes('FROM devices WHERE user_id = $1 AND device_id = $2')) {
      const key = `${params[0]}:${params[1]}`;
      const d = this.devices.get(key);
      if (d) {
        return { rows: [{ refresh_token_hash: d.refresh_token_hash } as T], rowCount: 1, command: 'SELECT', oid: 0, fields: [] };
      }
      return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
    }

    // INSERT or UPDATE devices
    if (text.includes('INSERT INTO devices')) {
      const key = `${params[0]}:${params[1]}`;
      this.devices.set(key, {
        user_id: params[0],
        device_id: params[1],
        platform: params[2],
        refresh_token_hash: params[3],
      });
      return { rows: [], rowCount: 1, command: 'INSERT', oid: 0, fields: [] };
    }

    // DELETE FROM devices
    if (text.includes('DELETE FROM devices')) {
      const userId = params[0];
      const deviceId = params[1];
      if (deviceId) {
        this.devices.delete(`${userId}:${deviceId}`);
      } else {
        for (const [k] of this.devices) {
          if (k.startsWith(`${userId}:`)) this.devices.delete(k);
        }
      }
      return { rows: [], rowCount: 1, command: 'DELETE', oid: 0, fields: [] };
    }

    // SELECT all users paginated
    if (text.includes('FROM users u') && text.includes('GROUP BY u.id')) {
      const list = Array.from(this.users.values()).map(u => ({
        ...u,
        roles: Array.from(this.userRoles.get(u.id) || ['CUSTOMER']),
      }));
      return { rows: list as T[], rowCount: list.length, command: 'SELECT', oid: 0, fields: [] };
    }

    // COUNT users
    if (text.includes('SELECT COUNT(*) as count FROM users')) {
      return { rows: [{ count: String(this.users.size) } as any], rowCount: 1, command: 'SELECT', oid: 0, fields: [] };
    }

    // UPDATE user status
    if (text.includes('UPDATE users SET status = $1')) {
      const newStatus = params[0];
      const id = params[1];
      const u = this.users.get(id);
      if (u) {
        u.status = newStatus;
      }
      return { rows: [], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] };
    }

    // SELECT from roles WHERE name = $1
    if (text.includes('FROM roles WHERE name = $1')) {
      const roleName = params[0];
      const r = this.roles.get(roleName);
      if (r) {
        return { rows: [r as T], rowCount: 1, command: 'SELECT', oid: 0, fields: [] };
      }
      return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
    }

    // INSERT INTO roles
    if (text.includes('INSERT INTO roles')) {
      const id = params[0];
      const name = params[1];
      this.roles.set(name, { id, name });
      return { rows: [], rowCount: 1, command: 'INSERT', oid: 0, fields: [] };
    }

    // SELECT from roles WHERE name = 'MERCHANT_ADMIN' OR name = 'MERCHANT'
    if (text.includes("FROM roles WHERE name = 'MERCHANT_ADMIN' OR name = 'MERCHANT'")) {
      return { rows: [{ id: 'role_merch_admin', name: 'MERCHANT_ADMIN' } as any], rowCount: 1, command: 'SELECT', oid: 0, fields: [] };
    }

    // SELECT id, phone FROM users WHERE id = $1
    if (text.includes('SELECT id, phone FROM users WHERE id = $1')) {
      const u = this.users.get(params[0]);
      if (u) return { rows: [u as T], rowCount: 1, command: 'SELECT', oid: 0, fields: [] };
      return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
    }

    // SELECT id FROM zones WHERE is_active = TRUE LIMIT 1
    if (text.includes('FROM zones WHERE is_active = TRUE')) {
      return { rows: [{ id: 'zone_chennai_central' } as any], rowCount: 1, command: 'SELECT', oid: 0, fields: [] };
    }

    // SELECT from merchants WHERE m.owner_id = $1
    if (text.includes('FROM merchants m') && text.includes('WHERE m.owner_id = $1')) {
      const ownerId = params[0];
      for (const m of this.merchants.values()) {
        if (m.owner_id === ownerId) {
          const u = this.users.get(ownerId) || {};
          return {
            rows: [{
              ...m,
              owner_phone: u.phone,
              owner_name: u.full_name || 'Merchant Owner',
              owner_email: u.email || 'owner@merchant.com',
            } as any],
            rowCount: 1,
            command: 'SELECT',
            oid: 0,
            fields: [],
          };
        }
      }
      return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
    }

    // INSERT INTO merchants
    if (text.includes('INSERT INTO merchants')) {
      const merchant = {
        id: `merch_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        owner_id: params[0],
        business_name: params[1],
        trade_name: params[1],
        merchant_type: params[2],
        pan_number: params[3],
        gstin: params[4],
        fssai_license_number: params[5],
        bank_account_number: params[6],
        bank_ifsc: params[7],
        bank_beneficiary_name: params[8],
        commission_rate_percentage: 15.0,
        status: 'SUBMITTED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.merchants.set(merchant.id, merchant);
      return { rows: [merchant as any], rowCount: 1, command: 'INSERT', oid: 0, fields: [] };
    }

    // UPDATE merchants
    if (text.includes('UPDATE merchants') && text.includes('WHERE id = $10')) {
      const id = params[9];
      const m = this.merchants.get(id);
      if (m) {
        m.business_name = params[0];
        m.trade_name = params[0];
        m.merchant_type = params[1];
        m.pan_number = params[2];
        m.gstin = params[3];
        m.fssai_license_number = params[4];
        m.bank_account_number = params[5];
        m.bank_ifsc = params[6];
        m.bank_beneficiary_name = params[7];
        m.status = params[8];
        m.updated_at = new Date().toISOString();
        return { rows: [m as any], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] };
      }
    }

    // SELECT outlets for merchant
    if (text.includes('FROM outlets o') && text.includes('WHERE o.merchant_id = $1')) {
      const merchantId = params[0];
      for (const o of this.outlets.values()) {
        if (o.merchant_id === merchantId) {
          return { rows: [o as any], rowCount: 1, command: 'SELECT', oid: 0, fields: [] };
        }
      }
      return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
    }

    // INSERT INTO outlets
    if (text.includes('INSERT INTO outlets')) {
      const outlet = {
        id: `outlet_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        merchant_id: params[0],
        zone_id: params[1],
        outlet_name: params[2],
        address_line1: params[3],
        address_line2: params[4],
        postal_code: params[5],
        longitude: params[6],
        latitude: params[7],
        phone: params[8],
        default_prep_time_minutes: params[9],
        packaging_fee_inr: params[10],
        is_open: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.outlets.set(outlet.id, outlet);
      return { rows: [outlet as any], rowCount: 1, command: 'INSERT', oid: 0, fields: [] };
    }

    // UPDATE outlets
    if (text.includes('UPDATE outlets') && text.includes('WHERE id = $10')) {
      const id = params[9];
      const o = this.outlets.get(id);
      if (o) {
        o.outlet_name = params[0];
        o.address_line1 = params[1];
        o.address_line2 = params[2];
        o.postal_code = params[3];
        o.longitude = params[4];
        o.latitude = params[5];
        o.phone = params[6];
        o.default_prep_time_minutes = params[7];
        o.packaging_fee_inr = params[8];
        return { rows: [o as any], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] };
      }
    }

    // SELECT id, merchant_id FROM outlets WHERE id = $1
    if (text.includes('FROM outlets WHERE id = $1')) {
      const o = this.outlets.get(params[0]);
      if (o) return { rows: [o as any], rowCount: 1, command: 'SELECT', oid: 0, fields: [] };
      return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
    }

    // UPDATE outlets status
    if (text.includes('UPDATE outlets SET is_open = $1') || text.includes('UPDATE outlets SET is_open = TRUE')) {
      for (const o of this.outlets.values()) {
        if (text.includes('WHERE id =')) {
          const outletId = params[params.length - 1];
          if (o.id === outletId) {
            o.is_open = params[0];
            if (params.length > 2 && typeof params[1] === 'number') {
              o.default_prep_time_minutes = params[1];
            }
            return { rows: [o as any], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] };
          }
        } else if (text.includes('WHERE merchant_id = $1')) {
          if (o.merchant_id === params[0]) {
            o.is_open = text.includes('TRUE');
          }
        }
      }
      return { rows: [], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] };
    }

    // SELECT catalogs for outlet
    if (text.includes('FROM catalogs WHERE outlet_id = $1')) {
      for (const c of this.catalogs.values()) {
        if (c.outlet_id === params[0]) return { rows: [c as any], rowCount: 1, command: 'SELECT', oid: 0, fields: [] };
      }
      return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
    }

    // INSERT INTO catalogs
    if (text.includes('INSERT INTO catalogs')) {
      const catalog = {
        id: `cat_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        outlet_id: params[0],
        name: params[1],
        vertical_type: params[2],
        is_active: true,
      };
      this.catalogs.set(catalog.id, catalog);
      return { rows: [catalog as any], rowCount: 1, command: 'INSERT', oid: 0, fields: [] };
    }

    // INSERT INTO user_roles
    if (text.includes('INSERT INTO user_roles')) {
      const userId = params[0];
      const roleId = params[1];
      let roleName = 'CUSTOMER';
      for (const [name, r] of this.roles) {
        if (r.id === roleId) roleName = name;
      }
      if (!this.userRoles.has(userId)) {
        this.userRoles.set(userId, new Set());
      }
      this.userRoles.get(userId)!.add(roleName);
      return { rows: [], rowCount: 1, command: 'INSERT', oid: 0, fields: [] };
    }

    // Dashboard aggregated stats
    if (text.includes('FROM sub_orders') && text.includes('count_new')) {
      const outletId = params[0];
      let newCount = 0;
      let acceptedCount = 0;
      let preparingCount = 0;
      let readyCount = 0;
      let completedCount = 0;
      let cancelledCount = 0;
      let todaySales = 0;
      let weeklySales = 0;
      let totalEarned = 0;

      for (const so of this.subOrders.values()) {
        if (so.outlet_id === outletId) {
          if (['PLACED', 'PAYMENT_CONFIRMED'].includes(so.status)) newCount++;
          if (so.status === 'MERCHANT_ACCEPTED') acceptedCount++;
          if (so.status === 'PREPARING') preparingCount++;
          if (['READY', 'PARTNER_ASSIGNED', 'PARTNER_AT_STORE'].includes(so.status)) readyCount++;
          if (['DELIVERED', 'COMPLETED'].includes(so.status)) {
            completedCount++;
            totalEarned += so.merchant_net_payout_inr;
          }
          if (['CANCELLED', 'REJECTED', 'FAILED'].includes(so.status)) cancelledCount++;

          if (!['CANCELLED', 'REJECTED', 'FAILED'].includes(so.status)) {
            todaySales += so.items_total_inr;
            weeklySales += so.items_total_inr;
          }
        }
      }

      return {
        rows: [{
          count_new: newCount,
          count_accepted: acceptedCount,
          count_preparing: preparingCount,
          count_ready: readyCount,
          count_completed: completedCount,
          count_cancelled: cancelledCount,
          today_sales: todaySales,
          weekly_sales: weeklySales,
          total_earned: totalEarned,
        } as any],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };
    }

    // Orders list query
    if (text.includes('FROM sub_orders so') && text.includes('WHERE so.outlet_id = $1')) {
      const outletId = params[0];
      const list = [];
      for (const so of this.subOrders.values()) {
        if (so.outlet_id === outletId) {
          const items = this.orderItems.get(so.id) || [];
          list.push({
            ...so,
            customer_name: 'Test Customer',
            customer_phone: '+919988776655',
            items,
          });
        }
      }
      return { rows: list as any[], rowCount: list.length, command: 'SELECT', oid: 0, fields: [] };
    }

    // Order detail query
    if (text.includes('WHERE so.id = $1 AND so.outlet_id = $2')) {
      const so = this.subOrders.get(params[0]);
      if (so && so.outlet_id === params[1]) {
        const items = this.orderItems.get(so.id) || [];
        return {
          rows: [{
            ...so,
            customer_name: 'Test Customer',
            customer_phone: '+919988776655',
            items,
          } as any],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        };
      }
      return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
    }

    // Order single query
    if (text.includes('SELECT * FROM sub_orders WHERE id = $1 AND outlet_id = $2')) {
      const so = this.subOrders.get(params[0]);
      if (so && so.outlet_id === params[1]) {
        return { rows: [so as any], rowCount: 1, command: 'SELECT', oid: 0, fields: [] };
      }
      return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
    }

    // UPDATE sub_orders status
    if (text.includes('UPDATE sub_orders') && text.includes('WHERE id =')) {
      const targetStatus = params[0];
      const orderId = params[params.length - 2];
      const so = this.subOrders.get(orderId);
      if (so) {
        so.status = targetStatus;
        so.updated_at = new Date().toISOString();
        if (targetStatus === 'MERCHANT_ACCEPTED') {
          so.prep_time_minutes = params[1] || 15;
        }
        return { rows: [so as any], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] };
      }
    }

    // INSERT INTO order_events
    if (text.includes('INSERT INTO order_events')) {
      this.orderEvents.push({
        order_group_id: params[0],
        sub_order_id: params[1],
        actor_id: params[2],
        event_type: params[3],
        from_status: params[4],
        to_status: params[5],
        notes: params[6],
      });
      return { rows: [], rowCount: 1, command: 'INSERT', oid: 0, fields: [] };
    }

    // Categories query
    if (text.includes('FROM categories c')) {
      const list = Array.from(this.categories.values());
      return { rows: list as any[], rowCount: list.length, command: 'SELECT', oid: 0, fields: [] };
    }

    // INSERT INTO categories
    if (text.includes('INSERT INTO categories')) {
      const category = {
        id: `cat_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        catalog_id: params[0],
        name: params[1],
        display_order: params[2],
        is_active: true,
      };
      this.categories.set(category.id, category);
      return { rows: [category as any], rowCount: 1, command: 'INSERT', oid: 0, fields: [] };
    }

    // SELECT categories by name
    if (text.includes('FROM categories WHERE catalog_id = $1 AND LOWER(name) = LOWER($2)')) {
      for (const cat of this.categories.values()) {
        if (cat.catalog_id === params[0] && cat.name.toLowerCase() === params[1].toLowerCase()) {
          return { rows: [cat as any], rowCount: 1, command: 'SELECT', oid: 0, fields: [] };
        }
      }
      return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
    }

    // Product IDOR check query
    if (text.includes('WHERE i.id = $1 AND cat.outlet_id = $2')) {
      const it = this.items.get(params[0]);
      if (it && it.is_active && (!it.outlet_id || it.outlet_id === params[1])) {
        return { rows: [{ id: it.id } as any], rowCount: 1, command: 'SELECT', oid: 0, fields: [] };
      }
      return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
    }

    // Items / Products query
    if (text.includes('FROM items i')) {
      const list = [];
      for (const it of this.items.values()) {
        if (it.is_active) {
          const inv = this.inventory.get(it.id) || { stock_quantity: 10, is_in_stock: true, low_stock_threshold: 5 };
          list.push({
            ...it,
            category_name: 'Biryani',
            stock_quantity: inv.stock_quantity,
            is_in_stock: inv.is_in_stock,
            low_stock_threshold: inv.low_stock_threshold,
          });
        }
      }
      return { rows: list as any[], rowCount: list.length, command: 'SELECT', oid: 0, fields: [] };
    }

    // INSERT INTO items
    if (text.includes('INSERT INTO items')) {
      let outletId = 'outlet_default';
      for (const o of this.outlets.values()) {
        outletId = o.id;
        break;
      }
      const item = {
        id: `item_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        category_id: params[0],
        name: params[1],
        description: params[2],
        base_price_inr: params[3],
        is_veg: params[4],
        is_perishable: params[5],
        preparation_time_minutes: params[6],
        image_url: params[7],
        outlet_id: outletId,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.items.set(item.id, item);
      return { rows: [item as any], rowCount: 1, command: 'INSERT', oid: 0, fields: [] };
    }

    // UPDATE items
    if (text.includes('UPDATE items')) {
      const itemId = params[params.length - 1];
      const it = this.items.get(itemId);
      if (it) {
        if (text.includes('is_active = FALSE')) {
          it.is_active = false;
        } else {
          it.name = params[0] || it.name;
          if (params.length > 2 && typeof params[1] === 'number') it.base_price_inr = params[1];
        }
        return { rows: [it as any], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] };
      }
    }

    // INSERT / UPDATE inventory
    if (text.includes('INSERT INTO inventory')) {
      this.inventory.set(params[1], {
        outlet_id: params[0],
        item_id: params[1],
        stock_quantity: params[2],
        is_in_stock: params[3],
        low_stock_threshold: 5,
      });
      return { rows: [], rowCount: 1, command: 'INSERT', oid: 0, fields: [] };
    }

    if (text.includes('UPDATE inventory')) {
      const itemId = params[params.length - 1];
      const inv = this.inventory.get(itemId) || { item_id: itemId, stock_quantity: 10, is_in_stock: true };
      for (const p of params.slice(0, -2)) {
        if (typeof p === 'number') inv.stock_quantity = p;
        if (typeof p === 'boolean') inv.is_in_stock = p;
      }
      if (inv.stock_quantity === 0 && !params.some(p => typeof p === 'boolean')) {
        inv.is_in_stock = false;
      }
      this.inventory.set(itemId, inv);
      return { rows: [inv as any], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] };
    }

    // Earnings query
    if (text.includes('WHERE outlet_id = $1 AND status IN (\'DELIVERED\', \'COMPLETED\')')) {
      let gross = 0;
      let commission = 0;
      let tax = 0;
      let net = 0;
      for (const so of this.subOrders.values()) {
        if (so.outlet_id === params[0] && ['DELIVERED', 'COMPLETED'].includes(so.status)) {
          gross += so.items_total_inr;
          commission += so.merchant_commission_inr;
          tax += so.tax_total_inr;
          net += so.merchant_net_payout_inr;
        }
      }
      return {
        rows: [{
          gross_sales: gross,
          commission: commission,
          tax: tax,
          net_payout: net,
        } as any],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };
    }

    // Payouts query
    if (text.includes('FROM payouts') && text.includes('total_paid')) {
      let paid = 0;
      for (const p of this.payouts.values()) {
        if (p.recipient_id === params[0] && p.status === 'SUCCESS') {
          paid += p.net_amount_inr;
        }
      }
      return { rows: [{ total_paid: paid } as any], rowCount: 1, command: 'SELECT', oid: 0, fields: [] };
    }

    if (text.includes('FROM payouts WHERE recipient_type = \'MERCHANT\'')) {
      const list = Array.from(this.payouts.values());
      return { rows: list as any[], rowCount: list.length, command: 'SELECT', oid: 0, fields: [] };
    }

    if (text.includes('UPDATE outlets SET is_open =')) {
      const isOpen = text.includes('is_open = TRUE');
      for (const o of this.outlets.values()) {
        if (o.merchant_id === params[0] || o.id === params[params.length - 1]) {
          o.is_open = isOpen;
        }
      }
      return { rows: [], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] };
    }

    // Admin merchant applications list
    if (text.includes('FROM merchants m') && text.includes('LEFT JOIN outlets o')) {
      if (text.includes('WHERE m.id = $1')) {
        const m = this.merchants.get(params[0]);
        if (m) {
          return { rows: [m as any], rowCount: 1, command: 'SELECT', oid: 0, fields: [] };
        }
        return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
      }
      const list = Array.from(this.merchants.values()).map(m => ({
        ...m,
        owner_phone: '+919876543210',
        owner_name: 'Merchant Owner',
      }));
      return { rows: list as any[], rowCount: list.length, command: 'SELECT', oid: 0, fields: [] };
    }

    // Admin update merchant status
    if (text.includes('UPDATE merchants') && text.includes('SET status = $1')) {
      const newStatus = params[0];
      const merchantId = params[1];
      const m = this.merchants.get(merchantId);
      if (m) {
        m.status = newStatus;
        return { rows: [m as any], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] };
      }
      return { rows: [], rowCount: 0, command: 'UPDATE', oid: 0, fields: [] };
    }

    return { rows: [], rowCount: 0, command: 'UNKNOWN', oid: 0, fields: [] };
  }

  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const fakeClient = {
      query: async (text: string, params: any[] = []) => {
        if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') {
          return { rows: [] };
        }
        if (text.includes('INSERT INTO users')) {
          const user = {
            id: params[0],
            phone: params[1],
            status: params[2],
            default_language: params[3],
            created_at: new Date().toISOString(),
          };
          this.users.set(user.id, user);
          return { rows: [user] };
        }
        if (text.includes('INSERT INTO user_roles')) {
          const userId = params[0];
          const roleId = params[1];
          let roleName = 'CUSTOMER';
          for (const [name, r] of this.roles) {
            if (r.id === roleId) roleName = name;
          }
          if (!this.userRoles.has(userId)) {
            this.userRoles.set(userId, new Set());
          }
          this.userRoles.get(userId)!.add(roleName);
          return { rows: [] };
        }
        return this.query(text, params);
      },
    };
    return callback(fakeClient);
  }
}

