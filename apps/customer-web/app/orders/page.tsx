'use client';

import { CustomerHeader } from '@/components/CustomerHeader';
import { customerApi } from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@allgo/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await customerApi.listOrders();
      setOrders(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err?.message || 'Sign in to view your orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <CustomerHeader />
      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Orders</h1>
          <Button variant="outline" size="sm" onClick={loadOrders}>
            Refresh
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading order history...</p>
        ) : orders.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No orders yet</CardTitle>
              <CardDescription>
                Place an order from AllGo Food or Quick Mart to track it live.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">
                        #{order.subOrderNumber || order.id?.slice(0, 8)}
                      </span>
                      <Badge variant="outline">{order.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {order.outlet?.name || 'AllGo Store'} • ₹
                      {Number(order.totalInr || 0).toFixed(0)}
                    </p>
                  </div>
                  <Link href={`/orders/${encodeURIComponent(order.id)}`}>
                    <Button size="sm" variant="outline">
                      Track & Details
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
