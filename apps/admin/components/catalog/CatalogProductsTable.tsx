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

export interface CatalogProduct {
  id: string;
  name: string;
  description?: string;
  categoryName?: string;
  category_name?: string;
  businessName?: string;
  business_name?: string;
  outletName?: string;
  outlet_name?: string;
  basePriceInr?: number;
  base_price_inr?: number | string;
  salePriceInr?: number;
  sale_price_inr?: number | string | null;
  productStatus?: string;
  product_status?: string;
  adminStatus?: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  admin_status?: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  rejection_reason?: string;
  isVeg?: boolean;
  is_veg?: boolean;
  dietaryFlags?: string[];
  dietary_flags?: any;
  stockQuantity?: number;
  stock_quantity?: number;
  preparationTimeMinutes?: number;
  preparation_time_minutes?: number;
  createdAt?: string;
  created_at?: string;
}

interface CatalogProductsTableProps {
  products: CatalogProduct[];
  loading: boolean;
  onApprove: (p: CatalogProduct) => void;
  onOpenReject: (p: CatalogProduct) => void;
}

export function CatalogProductsTable({
  products,
  loading,
  onApprove,
  onOpenReject,
}: CatalogProductsTableProps) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item Details</TableHead>
            <TableHead>Category & Merchant</TableHead>
            <TableHead>Pricing</TableHead>
            <TableHead>Dietary & Stock</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-end">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                Loading catalog products...
              </TableCell>
            </TableRow>
          ) : products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                No catalog products found matching filter criteria.
              </TableCell>
            </TableRow>
          ) : (
            products.map((p) => {
              const basePrice = Number(p.basePriceInr ?? p.base_price_inr ?? 0);
              const salePrice = p.salePriceInr != null ? Number(p.salePriceInr) : (p.sale_price_inr != null ? Number(p.sale_price_inr) : null);
              const adminStatus = p.adminStatus || p.admin_status || 'PENDING_REVIEW';
              const isVeg = Boolean(p.isVeg ?? p.is_veg ?? false);
              const flags = Array.isArray(p.dietaryFlags) ? p.dietaryFlags : (Array.isArray(p.dietary_flags) ? p.dietary_flags : []);
              const category = p.categoryName || p.category_name || 'General';
              const merchant = p.businessName || p.business_name || p.outletName || p.outlet_name || 'Outlet';
              const stock = p.stockQuantity ?? p.stock_quantity ?? 0;
              const rejection = p.rejectionReason || p.rejection_reason;

              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-2.5 rounded-full ${isVeg ? 'bg-primary' : 'bg-amber-800'}`}
                      />
                      <span className="font-semibold text-foreground">{p.name}</span>
                    </div>
                    {p.description && (
                      <div className="text-xs text-muted-foreground mt-0.5 max-w-[240px] truncate">
                        {p.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{category}</div>
                    <div className="text-xs text-muted-foreground">{merchant}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-foreground">
                      ₹{salePrice != null ? salePrice.toFixed(2) : basePrice.toFixed(2)}
                    </div>
                    {salePrice != null && salePrice < basePrice && (
                      <div className="text-xs text-muted-foreground line-through">
                        ₹{basePrice.toFixed(2)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-foreground font-medium">Stock: {stock}</div>
                    {flags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {flags.map((flag: string) => (
                          <Badge
                            key={flag}
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {flag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        adminStatus === 'APPROVED'
                          ? 'outline'
                          : adminStatus === 'REJECTED'
                          ? 'destructive'
                          : 'secondary'
                      }
                      className={adminStatus === 'APPROVED' ? 'border-primary/30 bg-primary/10 text-primary' : ''}
                    >
                      {adminStatus.replace(/_/g, ' ')}
                    </Badge>
                    {rejection && (
                      <div className="text-[11px] text-destructive mt-1 max-w-[180px]">
                        Reason: {rejection}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex gap-2 justify-end">
                      {adminStatus !== 'APPROVED' && (
                        <Button
                          size="sm"
                          onClick={() => onApprove(p)}
                          className="cursor-pointer"
                        >
                          Approve
                        </Button>
                      )}
                      {adminStatus !== 'REJECTED' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onOpenReject(p)}
                          className="cursor-pointer"
                        >
                          Reject
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
