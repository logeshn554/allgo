// Job: Native marketplace payment routing (Razorpay Route / Stripe Connect) splitting transactions at checkout.
export function calculateMarketplaceFundSplit(req) {
    const commPercent = req.merchantCommissionPercent ?? 15;
    const packaging = req.packagingFeeCents ?? 0;
    const delivery = req.deliveryFeeCents ?? 0;
    // Merchant item revenue = gross minus delivery fee minus packaging
    const foodGross = Math.max(0, req.grossAmountCents - delivery - packaging);
    // Platform cut on merchant products (e.g. 15%)
    const merchantPlatformCut = Math.round((foodGross * commPercent) / 100);
    const merchantPayout = Math.max(0, foodGross - merchantPlatformCut + packaging);
    // Driver compensation: distance fare + tip + courier share (e.g. 80% of delivery fee)
    const driverPercent = req.driverCommissionPercent ?? 80;
    const driverPayout = req.driverSubAccountId
        ? Math.round((delivery * driverPercent) / 100)
        : 0;
    const driverPlatformCut = delivery - driverPayout;
    const platformTake = merchantPlatformCut + driverPlatformCut;
    const transfers = [];
    // Transfer 1: Merchant sub-account transfer
    if (req.merchantSubAccountId && merchantPayout > 0) {
        transfers.push({
            account: req.merchantSubAccountId,
            amountCents: merchantPayout,
            currency: 'INR',
            notes: {
                order_id: req.orderId,
                recipient_type: 'MERCHANT',
                commission_deducted: String(merchantPlatformCut),
            },
            onHold: false,
        });
    }
    // Transfer 2: Driver / Courier partner transfer
    if (req.driverSubAccountId && driverPayout > 0) {
        transfers.push({
            account: req.driverSubAccountId,
            amountCents: driverPayout,
            currency: 'INR',
            notes: {
                order_id: req.orderId,
                recipient_type: 'DRIVER',
                delivery_share: String(driverPayout),
            },
            onHold: false,
        });
    }
    return {
        orderId: req.orderId,
        grossAmountCents: req.grossAmountCents,
        platformTakeCents: platformTake,
        merchantPayoutCents: merchantPayout,
        driverPayoutCents: driverPayout,
        transfers,
        calculatedAt: new Date().toISOString(),
    };
}
//# sourceMappingURL=marketplace-fund-splitter.js.map