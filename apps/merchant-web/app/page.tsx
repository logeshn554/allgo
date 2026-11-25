'use client';

import { MerchantHeader } from '@/components/MerchantHeader';
import { merchantApi } from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@allgo/ui';
import { useEffect, useState } from 'react';

export default function MerchantDashboardPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [tab, setTab] = useState<'NEW' | 'PREPARING' | 'READY' | 'HISTORY'>('NEW');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, ordList] = await Promise.all([
        merchantApi.getDashboard().catch(() => null),
        merchantApi.listOrders().catch(() => []),
      ]);
      setDashboard(dash);
      setOrders(Array.isArray(ordList) ? ordList : []);
    } catch (err: any) {
      setError(err?.message || 'Sign in to load live store orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleStore = async () => {
    if (!dashboard?.outletId) return;
    try {
      await merchantApi.updateOutletStatus(dashboard.outletId, !dashboard.outletIsOpen);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Unable to toggle store status');
    }
  };

  const filtered = orders.filter((o) => {
    const s = String(o.status || '').toUpperCase();
    if (tab === 'NEW') return s === 'PLACED' || s === 'CREATED' || s === 'CONFIRMED';
    if (tab === 'PREPARING')
      return s === 'MERCHANT_ACCEPTED' || s === 'ACCEPTED' || s === 'PREPARING';
    if (tab === 'READY')
      return s === 'READY_FOR_PICKUP' || s === 'DISPATCHING' || s === 'DRIVER_ASSIGNED';
    return s === 'DELIVERED' || s === 'COMPLETED' || s === 'CANCELLED';
  });

  return (
    <div className="min-h-screen bg-background">
      <MerchantHeader />
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Live Order Kitchen & Dispatch Queue</h1>
            <p className="text-sm text-muted-foreground">
              Accept incoming orders, update prep readiness, or propose out-of-stock substitutions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {dashboard && (
              <Button
                variant={dashboard.outletIsOpen ? 'default' : 'destructive'}
                size="sm"
                onClick={handleToggleStore}
              >
                {dashboard.outletIsOpen
                  ? 'Store Open (Click to Pause)'
                  : 'Store Closed (Click to Open)'}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={loadData}>
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="NEW">New Orders</TabsTrigger>
            <TabsTrigger value="PREPARING">Preparing</TabsTrigger>
            <TabsTrigger value="READY">Ready for Pickup</TabsTrigger>
            <TabsTrigger value="HISTORY">History</TabsTrigger>
          </TabsList>
        </Tabs>

        <Separator />

        {loading && orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading store orders...</p>
        ) : filtered.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">No orders in {tab} queue</CardTitle>
              <CardDescription>
                New orders from AllGo Food and Quick Mart will appear here automatically.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      #{order.subOrderNumber || order.id?.slice(0, 8)}
                    </CardTitle>
                    <Badge>{order.status}</Badge>
                  </div>
                  <CardDescription>
                    {order.customerName || 'Customer'} • ₹
                    {Number(order.itemsTotalInr || 0).toFixed(0)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {(order.items || []).map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between border-b pb-2 last:border-0"
                    >
                      <span>
                        {item.quantity}x {item.itemName}
                      </span>
                      {(tab === 'NEW' || tab === 'PREPARING') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            await merchantApi.proposeSubstitution(order.id, {
                              orderItemId: item.itemId,
                              originalItemName: item.itemName,
                              originalPriceInr: Number(item.unitPriceInr || 0),
                              actionType: 'REMOVE',
                            });
                            await loadData();
                          }}
                        >
                          Mark Unavailable
                        </Button>
                      )}
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {tab === 'NEW' && (
                      <>
                        <Button
                          size="sm"
                          onClick={async () => {
                            await merchantApi.acceptOrder(order.id, 20);
                            await loadData();
                          }}
                        >
                          Accept Order (20m)
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            await merchantApi.rejectOrder(order.id, 'Rejected by merchant');
                            await loadData();
                          }}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {tab === 'PREPARING' && (
                      <Button
                        size="sm"
                        onClick={async () => {
                          await merchantApi.markReady(order.id);
                          await loadData();
                        }}
                      >
                        Mark Ready for Pickup
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
