export interface OrderFundSplitRequest {
    orderId: string;
    grossAmountCents: number;
    merchantSubAccountId: string;
    driverSubAccountId?: string;
    packagingFeeCents?: number;
    deliveryFeeCents?: number;
    merchantCommissionPercent?: number;
    driverCommissionPercent?: number;
}
export interface SplitTransferInstruction {
    account: string;
    amountCents: number;
    currency: string;
    notes: Record<string, string>;
    onHold?: boolean;
}
export interface MarketplaceFundSplitResult {
    orderId: string;
    grossAmountCents: number;
    platformTakeCents: number;
    merchantPayoutCents: number;
    driverPayoutCents: number;
    transfers: SplitTransferInstruction[];
    calculatedAt: string;
}
export declare function calculateMarketplaceFundSplit(req: OrderFundSplitRequest): MarketplaceFundSplitResult;
//# sourceMappingURL=marketplace-fund-splitter.d.ts.map