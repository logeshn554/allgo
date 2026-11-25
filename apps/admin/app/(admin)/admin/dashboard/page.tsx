'use client';

import { type DashboardSummary, adminApi } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  HugeiconsIcon,
} from '@allgo/ui';
import {
  Activity01Icon,
  Alert02Icon,
  CheckmarkCircle01Icon,
  CloudServerIcon,
  Coins01Icon,
  Database01Icon,
  Motorbike01Icon,
  RefreshIcon,
  Store01Icon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getDashboardSummary();
      setSummary(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch platform metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 30000);
    return () => clearInterval(interval);
  }, []);

  const totalUsersStr = summary ? summary.totalUsers.toLocaleString() : '...';
  const newUsersStr = summary ? `+${summary.newUsersToday} today` : 'Loading...';
  const couriersStr = summary ? summary.activeCouriersAndDrivers.toLocaleString() : '...';
  const onlinePartnersStr = summary ? `${summary.onlinePartners} currently online` : 'Loading...';
  const outletsStr = summary ? summary.liveMerchantOutlets.toLocaleString() : '...';
  const outletsSubtitle = summary ? `${summary.activeZonesCount} active zones` : 'Loading...';
  const ordersStr = summary ? `${summary.todayOrdersCount.toLocaleString()} Orders` : '...';
  const gmvStr = summary ? `₹${(summary.todayGmvInr / 100000).toFixed(2)} Lakhs GMV` : 'Loading...';

  const isPgUp = summary?.infrastructure?.postgres?.status === 'up';
  const isRedisUp = summary?.infrastructure?.redis?.status === 'up';
  const isApiUp = summary?.infrastructure?.apiGateway?.status === 'up';

  return (
    <div className="space-y-6">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Operations Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back,{' '}
            <span className="font-semibold text-foreground">
              {user?.fullName || 'Super Administrator'}
            </span>
            . Platform metrics and real-time infrastructure telemetry.
          </p>
        </div>
        <Button
          onClick={fetchSummary}
          disabled={loading}
          variant="default"
          size="sm"
          className="gap-2 self-start sm:self-auto"
        >
          <HugeiconsIcon
            icon={RefreshIcon}
            strokeWidth={2}
            className={`size-4 ${loading ? 'animate-spin' : ''}`}
          />
          <span>{loading ? 'Refreshing...' : 'Refresh Metrics'}</span>
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Notice: API Connection Error</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {error}. Displaying last known or cached state.
            </p>
          </div>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="transition-colors hover:ring-foreground/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Users
            </CardDescription>
            <div className="size-9 rounded-lg bg-muted text-foreground flex items-center justify-center">
              <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="size-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{totalUsersStr}</div>
            <div className="mt-1">
              <Badge variant="outline">{newUsersStr}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-colors hover:ring-foreground/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Couriers & Drivers
            </CardDescription>
            <div className="size-9 rounded-lg bg-muted text-foreground flex items-center justify-center">
              <HugeiconsIcon icon={Motorbike01Icon} strokeWidth={2} className="size-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{couriersStr}</div>
            <div className="mt-1">
              <Badge variant="secondary">{onlinePartnersStr}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-colors hover:ring-foreground/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Live Merchant Outlets
            </CardDescription>
            <div className="size-9 rounded-lg bg-muted text-foreground flex items-center justify-center">
              <HugeiconsIcon icon={Store01Icon} strokeWidth={2} className="size-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{outletsStr}</div>
            <div className="mt-1">
              <Badge variant="secondary">{outletsSubtitle}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-colors hover:ring-foreground/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Today Transactions
            </CardDescription>
            <div className="size-9 rounded-lg bg-muted text-foreground flex items-center justify-center">
              <HugeiconsIcon icon={Coins01Icon} strokeWidth={2} className="size-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{ordersStr}</div>
            <p className="text-xs font-medium text-muted-foreground mt-1">{gmvStr}</p>
          </CardContent>
        </Card>
      </div>

      {/* Infrastructure Telemetry */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <HugeiconsIcon icon={Activity01Icon} strokeWidth={2} className="size-4 text-primary" />
            Infrastructure Health Status (Real-time Probe)
          </CardTitle>
          <CardDescription>
            Telemetry probes connected directly to core database, in-memory cache, and API gateway
            services.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Postgres */}
            <div className="p-4 rounded-xl border border-border bg-muted/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <HugeiconsIcon
                    icon={Database01Icon}
                    strokeWidth={2}
                    className="size-3.5 text-muted-foreground"
                  />
                  PostgreSQL / PostGIS
                </span>
                <Badge variant={isPgUp ? 'default' : 'destructive'}>
                  {isPgUp ? 'HEALTHY' : 'OFFLINE'}
                </Badge>
              </div>
              <p className="text-sm font-bold text-foreground">
                {summary?.infrastructure?.postgres?.details || 'Neon PostgreSQL 16 + PostGIS'}
              </p>
              <div className="flex items-center gap-1.5 text-xs">
                {isPgUp ? (
                  <>
                    <HugeiconsIcon
                      icon={CheckmarkCircle01Icon}
                      strokeWidth={2}
                      className="size-3.5 text-primary"
                    />
                    <span className="text-primary font-medium">
                      Connected ({summary?.infrastructure?.postgres?.latencyMs ?? 18}ms)
                    </span>
                  </>
                ) : (
                  <>
                    <HugeiconsIcon
                      icon={Alert02Icon}
                      strokeWidth={2}
                      className="size-3.5 text-destructive"
                    />
                    <span className="text-destructive font-medium">Unreachable</span>
                  </>
                )}
              </div>
            </div>

            {/* Redis */}
            <div className="p-4 rounded-xl border border-border bg-muted/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <HugeiconsIcon
                    icon={CloudServerIcon}
                    strokeWidth={2}
                    className="size-3.5 text-muted-foreground"
                  />
                  Redis Memory Store
                </span>
                <Badge variant={isRedisUp ? 'default' : 'destructive'}>
                  {isRedisUp ? 'HEALTHY' : 'OFFLINE'}
                </Badge>
              </div>
              <p className="text-sm font-bold text-foreground">
                {summary?.infrastructure?.redis?.details || 'Redis In-Memory Engine'}
              </p>
              <div className="flex items-center gap-1.5 text-xs">
                {isRedisUp ? (
                  <>
                    <HugeiconsIcon
                      icon={CheckmarkCircle01Icon}
                      strokeWidth={2}
                      className="size-3.5 text-primary"
                    />
                    <span className="text-primary font-medium">
                      Connected ({summary?.infrastructure?.redis?.latencyMs ?? 2}ms)
                    </span>
                  </>
                ) : (
                  <>
                    <HugeiconsIcon
                      icon={Alert02Icon}
                      strokeWidth={2}
                      className="size-3.5 text-destructive"
                    />
                    <span className="text-destructive font-medium">Unreachable</span>
                  </>
                )}
              </div>
            </div>

            {/* API Gateway */}
            <div className="p-4 rounded-xl border border-border bg-muted/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <HugeiconsIcon
                    icon={Activity01Icon}
                    strokeWidth={2}
                    className="size-3.5 text-muted-foreground"
                  />
                  Core API Gateway
                </span>
                <Badge variant={isApiUp ? 'default' : 'destructive'}>
                  {isApiUp ? 'HEALTHY' : 'PROBING'}
                </Badge>
              </div>
              <p className="text-sm font-bold text-foreground">
                NestJS Microservice (
                {summary?.infrastructure?.apiGateway?.environment || 'production'})
              </p>
              <div className="flex items-center gap-1.5 text-xs">
                {isApiUp ? (
                  <>
                    <HugeiconsIcon
                      icon={CheckmarkCircle01Icon}
                      strokeWidth={2}
                      className="size-3.5 text-primary"
                    />
                    <span className="text-primary font-medium">
                      Healthy (Uptime: {summary?.infrastructure?.apiGateway?.uptimeSeconds ?? 120}s)
                    </span>
                  </>
                ) : (
                  <>
                    <HugeiconsIcon
                      icon={Alert02Icon}
                      strokeWidth={2}
                      className="size-3.5 text-amber-600 dark:text-amber-400"
                    />
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      Probing gateway...
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
