'use client';

import { MerchantHeader } from '@/components/MerchantHeader';
import { merchantApi } from '@/lib/api';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@allgo/ui';
import { useEffect, useState } from 'react';

export default function MerchantFinancePage() {
  const [earnings, setEarnings] = useState<any>(null);
  const [payouts, setPayouts] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [e, p] = await Promise.all([
        merchantApi.getEarnings().catch(() => null),
        merchantApi.getPayouts().catch(() => []),
      ]);
      setEarnings(e);
      setPayouts(Array.isArray(p) ? p : []);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <MerchantHeader />
      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <h1 className="text-2xl font-bold">Settlements & Payouts</h1>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Gross Sales</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              ₹{Number(earnings?.grossSalesInr ?? 0).toFixed(2)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Platform Commission</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              ₹{Number(earnings?.commissionInr ?? 0).toFixed(2)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Net Payout</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-green-600">
              ₹{Number(earnings?.netPayoutInr ?? 0).toFixed(2)}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Payout Batches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {payouts.length === 0 ? (
              <p className="text-muted-foreground">No payout settlements recorded yet.</p>
            ) : (
              payouts.map((p, idx) => (
                <div
                  key={p.id || idx}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <div>
                    <div className="font-medium">
                      {p.settlementNumber || p.id || `Payout #${idx + 1}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.createdAt || 'Pending cycle'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold">
                      ₹{Number(p.amountInr ?? p.netPayoutInr ?? 0).toFixed(2)}
                    </span>
                    <Badge variant="outline">{p.status || 'SCHEDULED'}</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
