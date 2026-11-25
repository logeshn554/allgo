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
  Input,
  Separator,
} from '@allgo/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const VERTICAL_TABS = [
  { key: 'ALL', label: 'All Services' },
  { key: 'FOOD', label: 'AllGo Food' },
  { key: 'GROCERY', label: 'AllGo Quick Mart' },
  { key: 'HOME_MADE', label: 'Home Kitchens' },
] as const;

export default function CustomerHomePage() {
  const [vertical, setVertical] = useState<string>('ALL');
  const [query, setQuery] = useState('');
  const [outlets, setOutlets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOutlets = async (selectedVertical: string, searchQ: string) => {
    setLoading(true);
    setError(null);
    try {
      if (searchQ.trim()) {
        const res = await customerApi.searchDiscovery(searchQ.trim(), selectedVertical);
        setOutlets(Array.isArray(res?.outlets) ? res.outlets : []);
      } else {
        const list = await customerApi.listOutlets(selectedVertical);
        setOutlets(Array.isArray(list) ? list : []);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load nearby stores');
      setOutlets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOutlets(vertical, '');
  }, [vertical]);

  return (
    <div className="min-h-screen bg-background">
      <CustomerHeader />
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <Badge variant="secondary">AllGo Customer Portal</Badge>
            <h1 className="text-3xl font-bold tracking-tight">Food, Quick Mart & Express Rides</h1>
            <p className="text-sm text-muted-foreground">
              Browse nearby restaurants, 15-minute neighborhood groceries, or book an AllGo Ride.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/rides">
              <Button variant="outline">Book AllGo Ride</Button>
            </Link>
            <Link href="/orders">
              <Button variant="outline">Track Orders</Button>
            </Link>
          </div>
        </section>

        <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {VERTICAL_TABS.map((tab) => (
              <Button
                key={tab.key}
                size="sm"
                variant={vertical === tab.key ? 'default' : 'outline'}
                onClick={() => setVertical(tab.key)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
          <form
            className="flex w-full max-w-sm gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              loadOutlets(vertical, query);
            }}
          >
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dishes, groceries, or stores..."
            />
            <Button type="submit" size="sm">
              Search
            </Button>
          </form>
        </section>

        <Separator />

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <Card key={n} className="animate-pulse">
                <CardHeader>
                  <div className="h-5 w-2/3 rounded bg-muted" />
                  <div className="h-4 w-1/2 rounded bg-muted" />
                </CardHeader>
                <CardContent>
                  <div className="h-9 w-28 rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : outlets.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No outlets available right now</CardTitle>
              <CardDescription>
                Start the Core API on port 3000 or adjust your filter/search query.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => loadOutlets(vertical, query)}>
                Retry Discovery
              </Button>
            </CardContent>
          </Card>
        ) : (
          <section className="grid gap-4 md:grid-cols-3">
            {outlets.map((outlet) => {
              const id = outlet.outletId || outlet.id;
              const name = outlet.outletName || outlet.name || 'AllGo Store';
              const vType = outlet.verticalType || outlet.merchantType || 'FOOD';
              return (
                <Card key={id} className="flex flex-col justify-between">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline">{vType}</Badge>
                      <Badge variant={outlet.isOpen === false ? 'secondary' : 'default'}>
                        {outlet.isOpen === false ? 'Closed' : 'Open'}
                      </Badge>
                    </div>
                    <CardTitle className="mt-2 text-base">{name}</CardTitle>
                    <CardDescription>
                      {outlet.estimatedDeliveryMins || 25} mins • ★{' '}
                      {Number(outlet.rating || 4.2).toFixed(1)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href={`/store/${encodeURIComponent(id)}`}>
                      <Button className="w-full" size="sm">
                        Browse Catalog
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
