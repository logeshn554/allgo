'use client';

import React from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@allgo/ui';
import { Badge } from '@allgo/ui';
import { Button } from '@allgo/ui';

interface CouponsTableProps {
  coupons: any[];
  isLoadingCoupons: boolean;
  onToggleCoupon: (couponId: string, currentStatus: boolean) => void;
}

export function CouponsTable({ coupons, isLoadingCoupons, onToggleCoupon }: CouponsTableProps) {
  if (isLoadingCoupons) {
    return <div className="text-center py-12 text-muted-foreground text-sm">Loading coupons...</div>;
  }

  if (coupons.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card p-12 text-center text-muted-foreground text-sm">
        No active coupons found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Coupon Code</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Discount</TableHead>
            <TableHead>Rules (Min / Cap)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-end">Toggle</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {coupons.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-bold text-primary font-mono text-sm">
                {c.code}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">{c.description || '—'}</TableCell>
              <TableCell className="font-semibold text-foreground text-sm">
                {c.discount_percentage ? `${c.discount_percentage}% OFF` : `₹${c.flat_discount_inr} FLAT`}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                Min Order: ₹{Number(c.min_order_amount_inr || 0).toFixed(0)}
                {c.max_discount_inr ? ` • Max Cap: ₹${Number(c.max_discount_inr).toFixed(0)}` : ''}
              </TableCell>
              <TableCell>
                <Badge
                  variant={c.is_active ? 'outline' : 'secondary'}
                  className={c.is_active ? 'border-primary/30 bg-primary/10 text-primary' : 'text-muted-foreground'}
                >
                  {c.is_active ? 'ACTIVE' : 'INACTIVE'}
                </Badge>
              </TableCell>
              <TableCell className="text-end">
                <Button
                  size="sm"
                  variant={c.is_active ? 'destructive' : 'default'}
                  onClick={() => onToggleCoupon(c.id, c.is_active)}
                  className="cursor-pointer"
                >
                  {c.is_active ? 'Deactivate' : 'Activate'}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
