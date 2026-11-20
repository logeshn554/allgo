import { Injectable, BadRequestException } from '@nestjs/common';
import crypto from 'node:crypto';
import type { CartPricingBreakdown, FareQuote } from '@allgo/common';
import { DatabaseService } from '../database/database.service.js';
import { ConfigService } from '../config/config.service.js';

export interface FareQuoteWithSignature extends FareQuote {
  signature: string;
}

export interface RideFareParams {
  distanceKm: number;
  durationMinutes: number;
  vehicleType?: string;
  surgeMultiplier?: number;
  rainMultiplier?: number;
}

export interface GroceryCartParams {
  outletId: string;
  items: Array<{ itemId: string; quantity: number }>;
  distanceKm?: number;
  surgeMultiplier?: number;
}

export interface ParcelFareParams {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  actualWeightKg: number;
  distanceKm: number;
}

@Injectable()
export class PricingEngine {
  private readonly signingSecret: string;

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService
  ) {
    this.signingSecret = this.config.jwtSecret || 'default_allgo_pricing_signing_secret_key_123';
  }

  calculateRideFareQuote(params: RideFareParams): FareQuoteWithSignature {
    const { distanceKm, durationMinutes, vehicleType = 'MOTORCYCLE', surgeMultiplier = 1.0, rainMultiplier = 1.0 } = params;

    let baseFare = 30;
    let perKm = 10;
    let perMin = 1.5;

    if (vehicleType.toUpperCase() === 'SEDAN' || vehicleType.toUpperCase() === 'CAB') {
      baseFare = 60;
      perKm = 18;
      perMin = 2.5;
    } else if (vehicleType.toUpperCase() === 'AUTO_RICKSHAW') {
      baseFare = 40;
      perKm = 14;
      perMin = 2.0;
    }

    const effectiveSurge = Math.max(1.0, Number((surgeMultiplier * rainMultiplier).toFixed(2)));
    const preTax = (baseFare + distanceKm * perKm + durationMinutes * perMin) * effectiveSurge;
    const taxInr = Math.round(preTax * 0.05 * 100) / 100; // 5% GST
    const totalFareInr = Math.round(preTax + taxInr);

    const quoteId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5-minute TTL

    const signature = this.signQuotePayload(quoteId, totalFareInr, expiresAt, vehicleType);

    return {
      quoteId,
      vertical: 'RIDE_HAILING',
      baseFareInr: baseFare,
      distanceKm: Math.round(distanceKm * 10) / 10,
      durationMinutes: Math.round(durationMinutes),
      surgeMultiplier: effectiveSurge,
      taxInr,
      totalFareInr,
      currency: 'INR',
      expiresAt,
      signature,
    };
  }

  verifyRideFareQuote(quote: FareQuoteWithSignature, vehicleType = 'MOTORCYCLE'): boolean {
    if (Date.now() > Date.parse(quote.expiresAt)) {
      return false; // Expired
    }

    const expectedSig = this.signQuotePayload(quote.quoteId, quote.totalFareInr, quote.expiresAt, vehicleType);
    const bufA = Buffer.from(quote.signature || '');
    const bufB = Buffer.from(expectedSig);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }

  async calculateGroceryCartTotals(params: GroceryCartParams): Promise<CartPricingBreakdown> {
    const { items, distanceKm = 2.0, surgeMultiplier = 1.0 } = params;

    if (!items || items.length === 0) {
      throw new BadRequestException('EMPTY_CART: Cart must contain at least 1 item');
    }

    // Zero-Trust: Query Database for Authoritative Item Prices
    const itemIds = items.map((i) => i.itemId);
    const query = `SELECT id, price_inr, is_available FROM items WHERE id = ANY($1);`;
    const res = await this.db.query(query, [itemIds]);
    const priceMap = new Map<string, number>();

    for (const row of res.rows) {
      if (row.is_available === false) {
        throw new BadRequestException(`ITEM_UNAVAILABLE: Item ${row.id} is currently out of stock`);
      }
      priceMap.set(row.id, Number(row.price_inr));
    }

    let itemTotalInr = 0;
    for (const it of items) {
      const unitPrice = priceMap.get(it.itemId);
      if (unitPrice === undefined) {
        throw new BadRequestException(`INVALID_ITEM: Item ${it.itemId} not found in catalog`);
      }
      itemTotalInr += unitPrice * it.quantity;
    }

    // Small-cart fee rule: if under ₹150, apply ₹20 small-cart fee
    const smallCartFeeInr = itemTotalInr < 150 ? 20 : 0;
    const packagingFeeInr = 10;
    const baseDelivery = 25 + Math.max(0, distanceKm - 2) * 8;
    const deliveryFeeInr = Math.round(baseDelivery * surgeMultiplier);
    const surgeFeeInr = deliveryFeeInr > baseDelivery ? deliveryFeeInr - baseDelivery : 0;
    const platformFeeInr = 3;

    // GST: 5% on delivery and food items
    const taxGstInr = Math.round((itemTotalInr * 0.05 + deliveryFeeInr * 0.05) * 100) / 100;
    const finalTotalInr = Math.round(
      itemTotalInr + packagingFeeInr + deliveryFeeInr + smallCartFeeInr + platformFeeInr + taxGstInr
    );

    return {
      itemTotalInr,
      packagingFeeInr,
      deliveryFeeInr,
      surgeFeeInr,
      platformFeeInr,
      taxGstInr,
      tipInr: 0,
      discountInr: 0,
      finalTotalInr,
      currency: 'INR',
    };
  }

  calculateParcelFare(params: ParcelFareParams) {
    const { lengthCm, widthCm, heightCm, actualWeightKg, distanceKm } = params;

    // Standard IATA Volumetric formula: (L * W * H) / 5000
    const volumetricWeightKg = Math.round(((lengthCm * widthCm * heightCm) / 5000) * 100) / 100;
    const chargeableWeightKg = Math.max(actualWeightKg, volumetricWeightKg);

    const baseFareInr = 40; // Includes first 2 km and first 2 kg
    const distanceFeeInr = Math.max(0, distanceKm - 2) * 12;
    const weightFeeInr = Math.max(0, Math.ceil(chargeableWeightKg - 2)) * 15;

    const subtotal = baseFareInr + distanceFeeInr + weightFeeInr;
    const taxGstInr = Math.round(subtotal * 0.18 * 100) / 100; // 18% GST for logistics
    const totalFareInr = Math.round(subtotal + taxGstInr);

    return {
      actualWeightKg,
      volumetricWeightKg,
      chargeableWeightKg,
      baseFareInr,
      distanceFeeInr,
      weightFeeInr,
      taxGstInr,
      totalFareInr,
    };
  }

  private signQuotePayload(quoteId: string, amount: number, expiresAt: string, vehicle: string): string {
    const payload = `${quoteId}:${amount}:${expiresAt}:${vehicle}`;
    return crypto.createHmac('sha256', this.signingSecret).update(payload).digest('hex');
  }
}
