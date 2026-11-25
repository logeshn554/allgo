'use client';
import { Card, CardContent } from '@allgo/ui';

interface OrdersKpiCardsProps {
  orders: any[];
}

export function OrdersKpiCards({ orders }: OrdersKpiCardsProps) {
  const totalOrders = orders.length;
  const placedCount = orders.filter(
    (o) => o.status === 'PLACED' || o.status === 'MERCHANT_ACCEPTED',
  ).length;
  const prepCount = orders.filter((o) => o.status === 'PREPARING' || o.status === 'READY').length;
  const dispatchedCount = orders.filter((o) => o.status === 'DISPATCHED').length;
  const cancelledCount = orders.filter(
    (o) => o.status === 'CANCELLED' || o.status === 'REJECTED',
  ).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      <Card size="sm">
        <CardContent>
          <p className="text-xs font-semibold text-muted-foreground uppercase">Total Orders</p>
          <h2 className="text-2xl font-bold text-foreground mt-1.5">{totalOrders}</h2>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardContent>
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase">
            Placed / Awaiting Prep
          </p>
          <h2 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1.5">
            {placedCount}
          </h2>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardContent>
          <p className="text-xs font-semibold text-muted-foreground uppercase">
            In Kitchen / Ready
          </p>
          <h2 className="text-2xl font-bold text-foreground mt-1.5">{prepCount}</h2>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardContent>
          <p className="text-xs font-semibold text-primary uppercase">Out for Delivery</p>
          <h2 className="text-2xl font-bold text-primary mt-1.5">{dispatchedCount}</h2>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardContent>
          <p className="text-xs font-semibold text-destructive uppercase">Cancelled / Refunded</p>
          <h2 className="text-2xl font-bold text-destructive mt-1.5">{cancelledCount}</h2>
        </CardContent>
      </Card>
    </div>
  );
}
