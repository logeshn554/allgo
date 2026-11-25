import assert from 'node:assert';
import { describe, it } from 'node:test';
import { DiscoveryRepository } from '../../services/api/dist/discovery/data/discovery.repository.js';
import { DiscoveryService } from '../../services/api/dist/discovery/discovery.service.js';
import { NearbyOutletsService } from '../../services/api/dist/discovery/nearby-outlets.service.js';
import { AddressService } from '../../services/api/dist/ordering/services/address.service.js';

describe('Saved Addresses & Discovery Favorites/Recents Unit Specification', () => {
  it('should support address updating and default setting logic via mock db', async () => {
    const mockAddresses: any[] = [];
    const mockDb: any = {
      query: async (sql: string, params?: any[]) => {
        if (sql.includes('SELECT') && sql.includes('FROM addresses')) {
          const addr = mockAddresses.find((a) => a.id === params![0] && a.user_id === params![1]);
          return { rows: addr ? [addr] : [] };
        }
        if (sql.includes('UPDATE addresses SET is_default = FALSE')) {
          mockAddresses.forEach((a) => {
            if (a.user_id === params![0]) a.is_default = false;
          });
          return { rows: [] };
        }
        if (sql.includes('UPDATE customer_saved_addresses SET is_default = FALSE')) {
          return { rows: [] };
        }
        if (sql.includes('UPDATE addresses SET')) {
          const addr = mockAddresses.find((a) => a.id === params![12] && a.user_id === params![13]);
          if (addr) {
            addr.label = params![0];
            addr.recipient_name = params![1];
            addr.recipient_phone = params![2];
            addr.address_line1 = params![3];
            addr.is_default = params![11];
          }
          return { rows: addr ? [addr] : [] };
        }
        if (sql.includes('UPDATE customer_saved_addresses SET')) {
          return { rows: [] };
        }
        return { rows: [] };
      },
    };

    const service = new AddressService(mockDb);

    // Seed address
    mockAddresses.push({
      id: 'addr-1',
      user_id: 'cust-1',
      label: 'HOME',
      recipient_name: 'John Doe',
      recipient_phone: '+919876543210',
      address_line1: '123 Main Street',
      city: 'Chennai',
      state: 'Tamil Nadu',
      postal_code: '600001',
      latitude: 13.0827,
      longitude: 80.2707,
      is_default: false,
    });

    const updated = await service.updateSavedAddress('addr-1', 'cust-1', {
      label: 'WORK',
      recipientName: 'John Work',
      isDefault: true,
    });

    assert.strictEqual(updated.label, 'WORK');
    assert.strictEqual(updated.recipient_name, 'John Work');
    assert.strictEqual(updated.is_default, true);
  });

  it('should support favorite and recent stores through DiscoveryRepository', async () => {
    const favoriteStores: any[] = [];
    const viewedStores: any[] = [];

    const mockDb: any = {
      query: async (sql: string, params?: any[]) => {
        if (sql.includes('CREATE TABLE')) {
          return { rows: [] };
        }
        if (sql.includes('SELECT id FROM customer_favorite_outlets')) {
          const found = favoriteStores.find(
            (f) => f.customer_id === params![0] && f.outlet_id === params![1],
          );
          return { rows: found ? [found] : [] };
        }
        if (sql.includes('INSERT INTO customer_favorite_outlets')) {
          favoriteStores.push({ customer_id: params![0], outlet_id: params![1] });
          return { rows: [] };
        }
        if (sql.includes('DELETE FROM customer_favorite_outlets')) {
          const idx = favoriteStores.findIndex(
            (f) => f.customer_id === params![0] && f.outlet_id === params![1],
          );
          if (idx >= 0) favoriteStores.splice(idx, 1);
          return { rows: [] };
        }
        if (
          sql.includes('SELECT o.id, o.merchant_id') &&
          sql.includes('customer_favorite_outlets')
        ) {
          return {
            rows: favoriteStores
              .filter((f) => f.customer_id === params![0])
              .map((f) => ({
                id: f.outlet_id,
                outlet_name: 'Fav Outlet ' + f.outlet_id,
                address: '123 Fav Rd',
                is_open: true,
              })),
          };
        }
        if (sql.includes('INSERT INTO customer_outlet_views')) {
          viewedStores.push({ customer_id: params![0], outlet_id: params![1] });
          return { rows: [] };
        }
        if (sql.includes('SELECT o.id, o.merchant_id') && sql.includes('customer_outlet_views')) {
          return {
            rows: viewedStores
              .filter((v) => v.customer_id === params![0])
              .map((v) => ({
                id: v.outlet_id,
                outlet_name: 'Viewed Outlet ' + v.outlet_id,
                address: '456 Viewed Rd',
                is_open: true,
              })),
          };
        }
        return { rows: [] };
      },
    };

    const repo = new DiscoveryRepository(mockDb);
    const nearby = new NearbyOutletsService(repo);
    const discovery = new DiscoveryService(mockDb, {} as any, undefined, undefined, nearby);

    // 1. Toggle favorite ON
    const favRes1 = await discovery.toggleFavoriteStore('cust-100', 'outlet-1');
    assert.strictEqual(favRes1.isFavorite, true);

    // 2. Query favorites
    const favList = await discovery.getFavoriteStores('cust-100');
    assert.strictEqual(favList.length, 1);
    assert.strictEqual(favList[0].id, 'outlet-1');

    // 3. Toggle favorite OFF
    const favRes2 = await discovery.toggleFavoriteStore('cust-100', 'outlet-1');
    assert.strictEqual(favRes2.isFavorite, false);

    // 4. Record store view
    await discovery.recordStoreView('cust-100', 'outlet-2');
    const recents = await discovery.getRecentlyViewedStores('cust-100');
    assert.strictEqual(recents.length, 1);
    assert.strictEqual(recents[0].id, 'outlet-2');
  });
});
