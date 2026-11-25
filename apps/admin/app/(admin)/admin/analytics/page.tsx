'use client';

import { adminApi } from '@/lib/api-client';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@allgo/ui';
import { RefreshIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect, useState } from 'react';

export default function AdminAnalyticsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [dispatchStats, setDispatchStats] = useState<any>(null);
  const [mobilityStats, setMobilityStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [sum, ord, disp, mob] = await Promise.all([
        adminApi.getDashboardSummary().catch(() => null),
        adminApi.listAdminOrders('ALL', 200).catch(() => []),
        adminApi.getDispatchStats().catch(() => null),
        adminApi.getMobilityStats().catch(() => null),
      ]);
      setSummary(sum);
      setOrders(Array.isArray(ord) ? ord : []);
      setDispatchStats(disp);
      setMobilityStats(mob);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const verticalCounts = orders.reduce<Record<string, number>>((acc, o) => {
    const v = String(o.verticalType || o.vertical_type || 'FOOD').toUpperCase();
    acc[v] = (acc[v] || 0) + 1;
    return acc;
  }, {});

  const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
    const s = String(o.status || 'PLACED').toUpperCase();
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const totalOrders = orders.length || 1;
  const cancelledCount = statusCounts.CANCELLED || 0;
  const deliveredCount = (statusCounts.DELIVERED || 0) + (statusCounts.COMPLETED || 0);
  const completionRate = orders.length > 0 ? Math.round((deliveredCount / totalOrders) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Analytics & Funnel</h1>
          <p className="text-sm text-muted-foreground">
            Multi-vertical GMV, order lifecycle conversion, and dispatch SLA performance.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadAnalytics}
          disabled={loading}
          className="gap-2"
        >
          <HugeiconsIcon
            icon={RefreshIcon}
            strokeWidth={2}
            className={`size-4 ${loading ? 'animate-spin' : ''}`}
          />
          <span>{loading ? 'Refreshing...' : 'Refresh Analytics'}</span>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Today GMV</CardDescription>
            <CardTitle className="text-2xl">
              ₹{Number(summary?.todayGmvInr || 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {summary?.todayOrdersCount ?? orders.length} orders tracked
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Fulfillment Completion</CardDescription>
            <CardTitle className="text-2xl">{completionRate}%</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {deliveredCount} delivered / {cancelledCount} cancelled
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Mobility Rides</CardDescription>
            <CardTitle className="text-2xl">{mobilityStats?.activeRides ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {mobilityStats?.totalRides ?? 0} total rides • {mobilityStats?.totalParcels ?? 0}{' '}
            parcels
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Online Fleet Partners</CardDescription>
            <CardTitle className="text-2xl">
              {summary?.onlinePartners ?? dispatchStats?.onlinePartners ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {dispatchStats?.openExceptions ?? 0} open dispatch exceptions
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vertical Order Split</CardTitle>
            <CardDescription>
              Distribution across AllGo Food, Quick Mart, Rides, and Parcels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {['FOOD', 'GROCERY', 'HOME_MADE', 'PARCEL', 'RIDE'].map((v) => {
              const count = verticalCounts[v] || 0;
              const pct = Math.round((count / totalOrders) * 100);
              return (
                <div key={v} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span>{v}</span>
                    <span>
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Lifecycle Funnel</CardTitle>
            <CardDescription>Current snapshot across canonical order states</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.keys(statusCounts).length === 0 ? (
              <p className="text-sm text-muted-foreground">No order telemetry available yet.</p>
            ) : (
              Object.entries(statusCounts).map(([status, count]) => (
                <div
                  key={status}
                  className="flex items-center justify-between border-b pb-2 text-sm last:border-0"
                >
                  <Badge variant="outline">{status}</Badge>
                  <span className="font-semibold">{count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
