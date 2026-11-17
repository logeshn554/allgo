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
export declare function calculateOrderTotal(params: {
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
}): OrderTotalCalculationResult;
//# sourceMappingURL=price-integrity.d.ts.map