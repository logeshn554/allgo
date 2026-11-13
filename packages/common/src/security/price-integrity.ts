export interface CartItemInput {
  skuOrId: string;
  variantId?: string;
  quantity: number;
  selectedOptionIds?: string[];
}

export interface DbItemPriceRecord {
  id: string;
  sku?: string;
  name: string;
  basePricePaisa: number;
  taxRatePercent: number;
  isActive: boolean;
  outletAvailable: boolean;
}

export interface DbVariantPriceRecord {
  id: string;
  itemId: string;
  additionalPricePaisa: number;
  isAvailable: boolean;
}

export interface DbOptionPriceRecord {
  id: string;
  pricePaisa: number;
}

export interface OrderTotalCalculationResult {
  itemsSubtotalPaisa: number;
  taxAmountPaisa: number;
  deliveryFeePaisa: number;
  surgeMultiplier: number;
  packagingFeePaisa: number;
  platformFeePaisa: number;
  discountPaisa: number;
  finalTotalPaisa: number;
  itemBreakdowns: Array<{
    itemId: string;
    unitPricePaisa: number;
    quantity: number;
    lineTotalPaisa: number;
    taxPaisa: number;
  }>;
}

/**
 * calculateOrderTotal
 * 
 * Strict Server-Side Price & Tax Calculation Engine:
 * - Deprecates client-supplied unit prices, totals, and tax sums.
 * - All monetary values are computed using integer paisa to prevent IEEE-754 precision drift.
 * - Tax rates and unit prices are fetched strictly from authoritative database records.
 */
export function calculateOrderTotal(params: {
  items: CartItemInput[];
  vertical: 'FOOD' | 'GROCERY' | 'COURIER';
  dbItems: Map<string, DbItemPriceRecord>;
  dbVariants?: Map<string, DbVariantPriceRecord>;
  dbOptions?: Map<string, DbOptionPriceRecord>;
  deliveryFeePaisa?: number;
  surgeMultiplier?: number;
  packagingFeePaisa?: number;
  platformFeePaisa?: number;
  discountPaisa?: number;
}): OrderTotalCalculationResult {
  const {
    items,
    dbItems,
    dbVariants = new Map(),
    dbOptions = new Map(),
    deliveryFeePaisa = 0,
    surgeMultiplier = 1.0,
    packagingFeePaisa = 1500, // ₹15.00 default
    platformFeePaisa = 500,   // ₹5.00 default
    discountPaisa = 0,
  } = params;

  if (!items || items.length === 0) {
    throw new Error('ORDER_EMPTY: Cannot calculate order total with empty item list');
  }

  let itemsSubtotalPaisa = 0;
  let taxAmountPaisa = 0;
  const itemBreakdowns: OrderTotalCalculationResult['itemBreakdowns'] = [];

  for (const item of items) {
    if (item.quantity <= 0 || !Number.isInteger(item.quantity)) {
      throw new Error(`INVALID_QUANTITY: Item quantity must be a positive integer (got ${item.quantity})`);
    }

    const dbItem = dbItems.get(item.skuOrId);
    if (!dbItem) {
      throw new Error(`ITEM_NOT_FOUND: Item with ID/SKU ${item.skuOrId} not found in database`);
    }

    if (!dbItem.isActive || !dbItem.outletAvailable) {
      throw new Error(`ITEM_UNAVAILABLE: Item ${dbItem.name} (${item.skuOrId}) is currently inactive or out of stock`);
    }

    let unitPricePaisa = dbItem.basePricePaisa;

    if (item.variantId) {
      const variant = dbVariants.get(item.variantId);
      if (variant && variant.isAvailable) {
        unitPricePaisa += variant.additionalPricePaisa;
      }
    }

    if (item.selectedOptionIds && item.selectedOptionIds.length > 0) {
      for (const optId of item.selectedOptionIds) {
        const option = dbOptions.get(optId);
        if (option) {
          unitPricePaisa += option.pricePaisa;
        }
      }
    }

    const lineTotalPaisa = unitPricePaisa * item.quantity;
    const itemTaxPaisa = Math.round((lineTotalPaisa * dbItem.taxRatePercent) / 100);

    itemsSubtotalPaisa += lineTotalPaisa;
    taxAmountPaisa += itemTaxPaisa;

    itemBreakdowns.push({
      itemId: dbItem.id,
      unitPricePaisa,
      quantity: item.quantity,
      lineTotalPaisa,
      taxPaisa: itemTaxPaisa,
    });
  }

  const effectiveDeliveryFeePaisa = Math.round(deliveryFeePaisa * Math.max(1.0, surgeMultiplier));
  const finalTotalPaisa = Math.max(
    0,
    itemsSubtotalPaisa +
      taxAmountPaisa +
      effectiveDeliveryFeePaisa +
      packagingFeePaisa +
      platformFeePaisa -
      discountPaisa
  );

  return {
    itemsSubtotalPaisa,
    taxAmountPaisa,
    deliveryFeePaisa: effectiveDeliveryFeePaisa,
    surgeMultiplier,
    packagingFeePaisa,
    platformFeePaisa,
    discountPaisa,
    finalTotalPaisa,
    itemBreakdowns,
  };
}
