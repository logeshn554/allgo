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
} from '@allgo/ui';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function StoreCatalogPage() {
  const params = useParams<{ outletId: string }>();
  const outletId = params.outletId;

  const [outlet, setOutlet] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [details, prodRes, cartRes] = await Promise.all([
        customerApi.getOutletDetails(outletId).catch(() => null),
        customerApi.getOutletProducts(outletId).catch(() => ({ items: [] })),
        customerApi.getCart().catch(() => null),
      ]);
      setOutlet(details);
      setProducts(
        Array.isArray(prodRes?.items) ? prodRes.items : Array.isArray(prodRes) ? prodRes : [],
      );
      setCart(cartRes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (outletId) loadData();
  }, [outletId]);

  const handleAdd = async (itemId: string) => {
    setStatusMessage(null);
    try {
      const updated = await customerApi.addToCart(outletId, itemId, 1);
      setCart(updated);
      setStatusMessage('Item added to cart.');
    } catch (err: any) {
      setStatusMessage(err?.message || 'Please sign in to add items to your cart.');
    }
  };

  const filtered = products.filter((p) => {
    if (vegOnly && p.isVeg === false) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        String(p.name || '')
          .toLowerCase()
          .includes(q) ||
        String(p.description || '')
          .toLowerCase()
          .includes(q)
      );
    }
    return true;
  });

  const cartItemCount = Array.isArray(cart?.items)
    ? cart.items.reduce((sum: number, i: any) => sum + Number(i.quantity || 1), 0)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <CustomerHeader />
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="text-xs text-muted-foreground hover:underline">
              ← Back to Stores
            </Link>
            <h1 className="mt-1 text-2xl font-bold">
              {outlet?.outletName || outlet?.name || 'Store Menu'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {outlet?.addressLine1 || 'Fresh catalog items ready for express dispatch'}
            </p>
          </div>
          <Link href="/checkout">
            <Button>View Cart & Checkout ({cartItemCount})</Button>
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Input
            className="max-w-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter dishes or items..."
          />
          <Button
            variant={vegOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setVegOnly((v) => !v)}
          >
            Pure Veg Only
          </Button>
        </div>

        {statusMessage && (
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
            {statusMessage}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading store catalog...</p>
        ) : filtered.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No matching items</CardTitle>
              <CardDescription>Try adjusting your search or dietary filter.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => {
              const price = Number(
                item.effectivePriceInr ?? item.salePriceInr ?? item.basePriceInr ?? 0,
              );
              const inStock = item.isInStock !== false;
              return (
                <Card key={item.id} className="flex flex-col justify-between">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant={item.isVeg === false ? 'destructive' : 'secondary'}>
                        {item.isVeg === false ? 'Non-Veg' : 'Veg'}
                      </Badge>
                      {!inStock && <Badge variant="outline">Out of Stock</Badge>}
                    </div>
                    <CardTitle className="mt-2 text-base">{item.name}</CardTitle>
                    {item.description && (
                      <CardDescription className="line-clamp-2">{item.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <span className="font-bold text-base">₹{price.toFixed(0)}</span>
                    <Button size="sm" disabled={!inStock} onClick={() => handleAdd(item.id)}>
                      Add to Cart
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
