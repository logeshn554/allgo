'use client';

import { MerchantHeader } from '@/components/MerchantHeader';
import { merchantApi } from '@/lib/api';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@allgo/ui';
import { useEffect, useState } from 'react';

export default function MerchantHoursPage() {
  const [outletId, setOutletId] = useState('outlet-primary');
  const [hours, setHours] = useState<any[]>([]);
  const [reason, setReason] = useState('Kitchen rush pause');
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const dash = await merchantApi.getDashboard().catch(() => null);
        const oid = dash?.outletId || 'outlet-primary';
        setOutletId(oid);
        const list = await merchantApi.getHours(oid).catch(() => []);
        setHours(Array.isArray(list) ? list : []);
      } catch {}
    })();
  }, []);

  const handleClosure = async (closed: boolean) => {
    try {
      await merchantApi.toggleTemporaryClosure(outletId, closed, reason);
      setMsg(closed ? 'Store temporarily paused.' : 'Store reopened for orders.');
    } catch (err: any) {
      setMsg(err?.message || 'Failed to update closure status');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MerchantHeader />
      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <h1 className="text-2xl font-bold">Operating Hours & Emergency Pause</h1>

        {msg && (
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">{msg}</div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Emergency Temporary Closure</CardTitle>
            <CardDescription>
              Pause incoming orders during heavy kitchen rush or stocktaking.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Closure reason"
            />
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" onClick={() => handleClosure(true)}>
                Pause Store Now
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleClosure(false)}>
                Resume Accepting Orders
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {hours.length === 0 ? (
              <p className="text-muted-foreground">No schedule intervals configured yet.</p>
            ) : (
              hours.map((h, idx) => (
                <div key={idx} className="flex justify-between border-b pb-2 last:border-0">
                  <span className="font-medium">Day {h.dayOfWeek}</span>
                  <span>
                    {h.openTime} – {h.closeTime}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
