'use client';
import { Card, CardContent } from '@allgo/ui';

interface FinanceOverviewTabProps {
  dashboard: any;
}

export function FinanceOverviewTab({ dashboard }: FinanceOverviewTabProps) {
  if (!dashboard) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card size="sm">
        <CardContent>
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            GROSS TRANSACTION VOLUME
          </div>
          <div className="text-2xl font-bold text-foreground mt-1.5">
            ₹{dashboard.grossTransactionVolumeInr?.toFixed(2) || '0.00'}
          </div>
          <div className="text-xs text-primary mt-1">
            {dashboard.completedTransactionsCount || 0} completed payments
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardContent>
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            PLATFORM COMMISSION
          </div>
          <div className="text-2xl font-bold text-primary mt-1.5">
            ₹{dashboard.platformCommissionInr?.toFixed(2) || '0.00'}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Net fee revenue retained</div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardContent>
          <div className="text-xs font-semibold uppercase text-muted-foreground">REFUND TOTALS</div>
          <div className="text-2xl font-bold text-destructive mt-1.5">
            ₹{dashboard.refundTotalsInr?.toFixed(2) || '0.00'}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {dashboard.refundCount || 0} processed refunds
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardContent>
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            PARTNER EARNINGS
          </div>
          <div className="text-2xl font-bold text-foreground mt-1.5">
            ₹{dashboard.partnerEarningsInr?.toFixed(2) || '0.00'}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Gross fleet disbursements</div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardContent>
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            OUTSTANDING COD
          </div>
          <div className="text-2xl font-bold text-foreground mt-1.5">
            ₹{dashboard.outstandingCodInr?.toFixed(2) || '0.00'}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Cash in hand awaiting handover</div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardContent>
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            PENDING SETTLEMENTS
          </div>
          <div className="text-2xl font-bold text-foreground mt-1.5">
            ₹{dashboard.pendingSettlementsInr?.toFixed(2) || '0.00'}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Approved pending payout</div>
        </CardContent>
      </Card>
    </div>
  );
}
