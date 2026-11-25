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
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CustomerCheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<any>(null);
  const [estimate, setEstimate] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'WALLET' | 'COD'>('UPI');
  const [couponCode, setCouponCode] = useState('');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCheckout = async (coupon?: string) => {
    setLoading(true);
    setError(null);
    try {
      const [cartData, addrList] = await Promise.all([
        customerApi.getCart().catch(() => null),
        customerApi.listAddresses().catch(() => []),
      ]);
      setCart(cartData);
      setAddresses(Array.isArray(addrList) ? addrList : []);
      if (Array.isArray(addrList) && addrList.length > 0 && !selectedAddressId) {
        const def = addrList.find((a) => a.isDefault) || addrList[0];
        setSelectedAddressId(def.id);
      }

      if (cartData?.items?.length > 0) {
        const est = await customerApi
          .getCheckoutEstimate(
            cartData.outlet?.id || cartData.outletId || '',
            cartData.items.map((i: any) => ({ itemId: i.itemId, quantity: i.quantity })),
            coupon || undefined,
          )
          .catch(() => null);
        setEstimate(est);
      } else {
        setEstimate(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCheckout();
  }, []);

  const handleQuantity = async (cartItemId: string, qty: number) => {
    if (qty <= 0) {
      await customerApi.removeCartItem(cartItemId);
    } else {
      await customerApi.updateCartItem(cartItemId, qty);
    }
    await loadCheckout(couponCode);
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      setError('Please select or add a delivery address first.');
      return;
    }
    setPlacing(true);
    setError(null);
    try {
      const res = await customerApi.placeOrder({
        deliveryAddressId: selectedAddressId,
        paymentMethod,
        couponCode: couponCode.trim() || undefined,
        deliveryInstructions: instructions.trim() || undefined,
        idempotencyKey: `web_${Date.now()}`,
      });
      const orderId = res?.subOrderId || res?.subOrders?.[0]?.id || res?.id;
      router.push(orderId ? `/orders/${encodeURIComponent(orderId)}` : '/orders');
    } catch (err: any) {
      setError(err?.message || 'Unable to place order');
    } finally {
      setPlacing(false);
    }
  };

  const items = Array.isArray(cart?.items) ? cart.items : [];

  return (
    <div className="min-h-screen bg-background">
      <CustomerHeader />
      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <h1 className="text-2xl font-bold">Cart & Checkout</h1>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading checkout...</p>
        ) : items.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Your cart is empty</CardTitle>
              <CardDescription>Browse AllGo Food or AllGo Quick Mart to add items.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-4 md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Items ({items.length}) —{' '}
                    {cart?.outlet?.name || cart?.outletName || 'Selected Store'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {items.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between border-b pb-3 last:border-0"
                    >
                      <div>
                        <div className="font-medium">{item.name || item.itemName}</div>
                        <div className="text-xs text-muted-foreground">
                          ₹{Number(item.unitPriceInr || 0).toFixed(0)} each
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuantity(item.id, item.quantity - 1)}
                        >
                          -
                        </Button>
                        <span className="w-6 text-center text-sm font-semibold">
                          {item.quantity}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuantity(item.id, item.quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Delivery Address & Instructions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {addresses.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No saved addresses found for your account.
                    </p>
                  ) : (
                    <div className="grid gap-2">
                      {addresses.map((addr) => (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => setSelectedAddressId(addr.id)}
                          className={`rounded-lg border p-3 text-left text-sm ${
                            selectedAddressId === addr.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border'
                          }`}
                        >
                          <div className="flex items-center gap-2 font-semibold">
                            <span>{addr.label || 'Address'}</span>
                            {addr.isDefault && <Badge variant="secondary">Default</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {addr.addressLine1}, {addr.city}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <Input
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Delivery instructions (e.g. Leave at gate, No cutlery)"
                  />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Bill & Payment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex gap-2">
                    <Input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Promo code"
                    />
                    <Button variant="outline" size="sm" onClick={() => loadCheckout(couponCode)}>
                      Apply
                    </Button>
                  </div>
                  <Separator />
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Items Subtotal</span>
                      <span>₹{Number(estimate?.itemsSubtotalInr ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delivery Fee</span>
                      <span>₹{Number(estimate?.deliveryFeeInr ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Taxes</span>
                      <span>₹{Number(estimate?.taxTotalInr ?? 0).toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-base">
                      <span>Total Payable</span>
                      <span>₹{Number(estimate?.finalTotalInr ?? 0).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(['UPI', 'CARD', 'WALLET', 'COD'] as const).map((m) => (
                      <Button
                        key={m}
                        size="sm"
                        variant={paymentMethod === m ? 'default' : 'outline'}
                        onClick={() => setPaymentMethod(m)}
                      >
                        {m}
                      </Button>
                    ))}
                  </div>
                  <Button className="w-full" disabled={placing} onClick={handlePlaceOrder}>
                    {placing ? 'Placing Order...' : 'Place Order'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
