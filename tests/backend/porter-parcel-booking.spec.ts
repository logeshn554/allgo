import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MobilityFareService } from '../../apps/api/dist/mobility/mobility-fare.service.js';
import { ParcelsService } from '../../apps/api/dist/mobility/parcels.service.js';
import { LedgerService } from '../../apps/api/dist/finance/ledger/ledger.service.js';
import { WalletService } from '../../apps/api/dist/finance/wallet/wallet.service.js';

describe('Priority 3: Porter-style Parcel Booking End-to-End', () => {
  class MockDb {
    parcels: any[] = [];
    wallets: any[] = [];
    ledger_entries: any[] = [];

    async query(sql: string, params: any[] = []): Promise<{ rows: any[] }> {
      const s = sql.trim();

      if (s.startsWith('SELECT id FROM cities')) {
        return { rows: [{ id: 'city_chennai_01' }] };
      }
      if (s.startsWith('INSERT INTO parcels')) {
        const row = {
          id: `pcl_${this.parcels.length + 1}`,
          parcel_number: params[0],
          sender_id: params[1],
          city_id: params[2],
          status: 'CREATED',
          pickup_address: params[3],
          pickup_contact_name: params[6],
          pickup_contact_phone: params[7],
          drop_address: params[8],
          drop_contact_name: params[11],
          drop_contact_phone: params[12],
          package_category: params[13],
          vehicle_type: params[14],
          estimated_weight_kg: params[15],
          package_description: params[16],
          is_fragile: params[17],
          pickup_otp: params[18],
          delivery_otp: params[19],
          delivery_fee_inr: params[20],
          total_amount_inr: params[21],
          partner_payout_inr: params[22],
          payment_status: params[23],
          created_at: new Date().toISOString(),
        };
        this.parcels.push(row);
        return { rows: [row] };
      }
      if (s.includes('FROM parcels') && s.includes('JOIN users')) {
        const parcelId = params[0];
        const p = this.parcels.find((x) => x.id === parcelId);
        if (p) {
          return {
            rows: [
              {
                ...p,
                sender_name: 'Sender User',
                sender_phone: '+919876543210',
                courier_name: null,
                courier_phone: null,
              },
            ],
          };
        }
        return { rows: [] };
      }

      // WALLET
      if (s.startsWith('SELECT * FROM wallets WHERE user_id = $1')) {
        const w = this.wallets.find((x) => x.user_id === params[0]);
        return { rows: w ? [w] : [] };
      }
      if (s.startsWith('INSERT INTO wallets')) {
        const newWallet = {
          id: `wal_${params[0]}`,
          user_id: params[0],
          balance_inr: '0.00',
          promotional_balance_inr: '0.00',
          refundable_balance_inr: '0.00',
          currency: 'INR',
          is_locked: false,
        };
        this.wallets.push(newWallet);
        return { rows: [newWallet] };
      }
      if (s.includes('FROM ledger_entries') && s.includes('SUM(')) {
        const entries = this.ledger_entries.filter((e) => e.wallet_id === params[0]);
        const bal = entries.reduce((acc, e) => (e.direction === 'CREDIT' ? acc + e.amount_inr : acc - e.amount_inr), 0);
        return { rows: [{ ledger_balance: bal.toFixed(2) }] };
      }
      if (s.startsWith('SELECT balance_inr FROM wallets WHERE id = $1 FOR UPDATE')) {
        const w = this.wallets.find((x) => x.id === params[0]);
        return { rows: w ? [{ balance_inr: w.balance_inr }] : [] };
      }
      if (s.startsWith('UPDATE wallets SET balance_inr = $1')) {
        const w = this.wallets.find((x) => x.id === params[1]);
        if (w) w.balance_inr = Number(params[0]).toFixed(2);
        return { rows: [w] };
      }
      if (s.startsWith('UPDATE wallets SET refundable_balance_inr = refundable_balance_inr + $1')) {
        const w = this.wallets.find((x) => x.id === params[1]);
        if (w) w.refundable_balance_inr = (Number(w.refundable_balance_inr) + Number(params[0])).toFixed(2);
        return { rows: [w] };
      }
      if (s.includes('promotional_balance_inr = GREATEST')) {
        return { rows: [] };
      }
      if (s.startsWith('INSERT INTO ledger_entries')) {
        const entry = {
          wallet_id: params[0],
          direction: params[10],
          amount_inr: Number(params[11]),
        };
        this.ledger_entries.push(entry);
        return { rows: [entry] };
      }

      return { rows: [] };
    }
  }

  const mockDb = new MockDb();
  const fareService = new MobilityFareService(mockDb as any);

  it('1. Calculates fare correctly based on Porter vehicle class and distance', async () => {
    // 5 km trip, 1 kg weight
    const bikeFare = await fareService.calculateParcelFare(5.0, 'GENERAL', 1.0, 'TWO_WHEELER', false);
    // Base 40 (2km) + 3km * 12 = 40 + 36 = 76
    assert.strictEqual(bikeFare, 76.0);

    // 10 km trip, 50 kg weight on 3-wheeler
    const threeWheelerFare = await fareService.calculateParcelFare(10.0, 'GENERAL', 50.0, 'THREE_WHEELER', false);
    // Base 150 (3km) + 7km * 20 (=140) + (50 - 20)kg * 1 (=30) = 320
    assert.strictEqual(threeWheelerFare, 320.0);

    // 10 km trip, 200 kg on Tata Ace
    const tataAceFare = await fareService.calculateParcelFare(10.0, 'GENERAL', 200.0, 'TATA_ACE', false);
    // Base 350 (3km) + 7km * 28 (=196) + (200 - 100)kg * 0.8 (=80) = 626
    assert.strictEqual(tataAceFare, 626.0);
  });

  it('2. Rejects overweight cargo exceeding vehicle class limits', async () => {
    // 2-wheeler limit is 20 kg
    await assert.rejects(
      async () => {
        await fareService.calculateParcelFare(5.0, 'GENERAL', 25.0, 'TWO_WHEELER', false);
      },
      (err: any) => {
        assert.match(err.message, /exceeds maximum capacity of 20 kg for TWO_WHEELER/);
        return true;
      }
    );

    // 3-wheeler limit is 500 kg
    await assert.rejects(
      async () => {
        await fareService.calculateParcelFare(5.0, 'GENERAL', 600.0, 'THREE_WHEELER', false);
      },
      (err: any) => {
        assert.match(err.message, /exceeds maximum capacity of 500 kg for THREE_WHEELER/);
        return true;
      }
    );
  });

  it('3. Adds fragile handling surcharge when isFragile is true', async () => {
    const normalFare = await fareService.calculateParcelFare(5.0, 'ELECTRONICS', 2.0, 'TWO_WHEELER', false);
    const fragileFare = await fareService.calculateParcelFare(5.0, 'ELECTRONICS', 2.0, 'TWO_WHEELER', true);

    // Fragile surcharge is exactly +₹50.0
    assert.strictEqual(fragileFare, normalFare + 50.0);
  });

  it('4. Persists vehicle type, fragile flag and performs wallet deduction during booking', async () => {
    const db = new MockDb();
    const ledger = new LedgerService(db as any);
    const walletService = new WalletService(db as any, ledger);
    const fares = new MobilityFareService(db as any);
    const mockContinuity: any = {};

    const parcelsService = new ParcelsService(db as any, fares, mockContinuity, walletService);

    // Seed customer wallet with ₹1000
    await walletService.creditWallet('cust_parcel_01', 1000.0, 'Topup', 'TOPUP-PARCEL');

    const bookingDto = {
      pickupLocation: { latitude: 13.0827, longitude: 80.2707 },
      pickupAddress: 'Anna Nagar, Chennai',
      pickupContactName: 'Logesh Sender',
      pickupContactPhone: '+919876543210',
      dropoffLocation: { latitude: 13.0405, longitude: 80.2337 },
      dropoffAddress: 'T Nagar, Chennai',
      dropoffContactName: 'Recipient Customer',
      dropoffContactPhone: '+919123456789',
      packageCategory: 'ELECTRONICS' as const,
      vehicleType: 'TATA_ACE' as const,
      weightKg: 150.0,
      packageDescription: 'TV and sound system moving',
      isFragile: true,
      paymentMethod: 'WALLET' as const,
    };

    const parcel = await parcelsService.createParcel('cust_parcel_01', bookingDto);

    assert.ok(parcel);
    assert.strictEqual(parcel.vehicle_type, 'TATA_ACE');
    assert.strictEqual(parcel.is_fragile, true);
    assert.strictEqual(parcel.payment_status, 'COMPLETED');
    assert.ok(parcel.delivery_fee_inr > 350.0);

    // Check customer wallet was debited
    const wallet = await walletService.getOrCreateWallet('cust_parcel_01');
    assert.strictEqual(wallet.balanceInr, 1000.0 - Number(parcel.total_amount_inr));

    // Retrieve details and verify all attributes are returned
    const details = await parcelsService.getParcelDetails('cust_parcel_01', 'CUSTOMER', parcel.id);
    assert.strictEqual(details.vehicleType, 'TATA_ACE');
    assert.strictEqual(details.isFragile, true);
    assert.strictEqual(details.paymentStatus, 'COMPLETED');
    assert.strictEqual(details.packageDescription, 'TV and sound system moving');
  });
});
