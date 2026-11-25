'use client';

import { CustomerHeader } from '@/components/CustomerHeader';
import { customerApi } from '@/lib/api';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Separator } from '@allgo/ui';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const LIFECYCLE_STEPS = [
  'PLACED',
  'MERCHANT_ACCEPTED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'PICKED_UP',
  'DELIVERED',
];

export default function CustomerOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const data = await customerApi.getOrderDetail(orderId);
      setOrder(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!orderId) return;
    loadOrder();
    const timer = setInterval(loadOrder, 10000);
    return () => clearInterval(timer);
  }, [orderId]);

  const handleInvoice = async () => {
    try {
      const inv = await customerApi.getOrderInvoice(orderId);
      if (inv?.signedUrl) {
        window.open(inv.signedUrl, '_blank', 'noopener,noreferrer');
      } else {
        setMsg(`Invoice ${inv?.invoiceNumber || ''} generated.`);
      }
    } catch (err: any) {
      setMsg(err?.message || 'Unable to generate invoice');
    }
  };

  const handleCancel = async () => {
    try {
      await customerApi.cancelOrder(orderId, 'Cancelled by customer from web');
      await loadOrder();
    } catch (err: any) {
      setMsg(err?.message || 'Cancellation failed');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <CustomerHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        {loading && !order ? (
          <p className="text-sm text-muted-foreground">Loading order tracking...</p>
        ) : !order ? (
          <Card>
            <CardHeader>
              <CardTitle>Order not found</CardTitle>
            </CardHeader>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">
                  Order #{order.subOrderNumber || order.id?.slice(0, 8)}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {order.outlet?.name || 'AllGo Partner Outlet'}
                </p>
              </div>
              <Badge>{order.status}</Badge>
            </div>

            {msg && (
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">{msg}</div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Live Progress</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {LIFECYCLE_STEPS.map((step) => {
                  const active = order.status === step;
                  return (
                    <div
                      key={step}
                      className={`rounded-md border p-2 text-center text-xs font-medium ${
                        active
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground'
                      }`}
                    >
                      {step.replaceAll('_', ' ')}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Items & Total</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {(order.items || []).map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span>
                      {item.quantity || 1}x {item.name || item.itemName}
                    </span>
                    <span>₹{Number(item.totalInr || item.totalPriceInr || 0).toFixed(0)}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>₹{Number(order.totalInr || 0).toFixed(2)}</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={handleInvoice}>
                    Download GST Invoice
                  </Button>
                  {(order.status === 'PLACED' || order.status === 'MERCHANT_ACCEPTED') && (
                    <Button variant="destructive" size="sm" onClick={handleCancel}>
                      Cancel Order
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
