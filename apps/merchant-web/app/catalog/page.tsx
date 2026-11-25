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
  Input,
  Textarea,
} from '@allgo/ui';
import type React from 'react';
import { useEffect, useState } from 'react';

export default function MerchantCatalogPage() {
  const [outletId, setOutletId] = useState('outlet-primary');
  const [products, setProducts] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('149');
  const [csvContent, setCsvContent] = useState(
    'name,categoryName,basePriceInr,salePriceInr,isVeg,isPerishable,prepTimeMinutes,stockQuantity,description\nVeg Biryani,Mains,210,189,true,false,20,40,Aromatic basmati rice',
  );
  const [msg, setMsg] = useState<string | null>(null);

  const loadCatalog = async () => {
    try {
      const [dash, items] = await Promise.all([
        merchantApi.getDashboard().catch(() => null),
        merchantApi.listProducts().catch(() => []),
      ]);
      if (dash?.outletId) setOutletId(dash.outletId);
      setProducts(Array.isArray(items) ? items : []);
    } catch {}
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await merchantApi.createProduct(outletId, {
        name: name.trim(),
        basePriceInr: Number(price) || 100,
        isVeg: true,
        stockQuantity: 50,
      });
      setName('');
      setMsg('Product added to catalog.');
      await loadCatalog();
    } catch (err: any) {
      setMsg(err?.message || 'Unable to add product');
    }
  };

  const handleCsvImport = async () => {
    try {
      const res = await merchantApi.uploadBulkCsv(outletId, csvContent);
      setMsg(`Imported ${res?.insertedCount ?? 0} of ${res?.totalRows ?? 0} CSV rows.`);
      await loadCatalog();
    } catch (err: any) {
      setMsg(err?.message || 'CSV upload failed');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MerchantHeader />
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <h1 className="text-2xl font-bold">Menu & Inventory Management</h1>

        {msg && (
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">{msg}</div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add Quick Item</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="space-y-3">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Item name"
                  required
                />
                <Input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  type="number"
                  placeholder="Price (INR)"
                  required
                />
                <Button type="submit" size="sm">
                  Add Product
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bulk CSV Menu Upload</CardTitle>
              <CardDescription>Paste menu or Quick Mart SKU rows below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                rows={4}
                className="font-mono text-xs"
              />
              <Button size="sm" variant="outline" onClick={handleCsvImport}>
                Import CSV
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    ₹{Number(p.basePriceInr || 0).toFixed(0)} • Stock {p.stockQuantity ?? 0}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={p.isInStock !== false ? 'default' : 'secondary'}>
                    {p.isInStock !== false ? 'In Stock' : 'Paused'}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await merchantApi.toggleStock(p.id, p.isInStock === false);
                      await loadCatalog();
                    }}
                  >
                    Toggle
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
