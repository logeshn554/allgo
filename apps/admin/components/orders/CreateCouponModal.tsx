'use client';

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@allgo/ui';
import { Button } from '@allgo/ui';
import { Input } from '@allgo/ui';
import { Label } from '@allgo/ui';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@allgo/ui';
import type React from 'react';

const COUPON_TYPE_ITEMS = {
  PERCENTAGE: 'Percentage (%)',
  FLAT: 'Flat INR (₹)',
};

interface CreateCouponModalProps {
  showNewCouponModal: boolean;
  setShowNewCouponModal: (s: boolean) => void;
  couponCode: string;
  setCouponCode: (c: string) => void;
  couponDesc: string;
  setCouponDesc: (d: string) => void;
  couponType: 'PERCENTAGE' | 'FLAT';
  setCouponType: (t: 'PERCENTAGE' | 'FLAT') => void;
  discountVal: string;
  setDiscountVal: (v: string) => void;
  minOrder: string;
  setMinOrder: (m: string) => void;
  maxDiscount: string;
  setMaxDiscount: (m: string) => void;
  isCreatingCoupon: boolean;
  handleCreateCoupon: (e: React.FormEvent) => Promise<void>;
}

export function CreateCouponModal({
  showNewCouponModal,
  setShowNewCouponModal,
  couponCode,
  setCouponCode,
  couponDesc,
  setCouponDesc,
  couponType,
  setCouponType,
  discountVal,
  setDiscountVal,
  minOrder,
  setMinOrder,
  maxDiscount,
  setMaxDiscount,
  isCreatingCoupon,
  handleCreateCoupon,
}: CreateCouponModalProps) {
  return (
    <Dialog open={showNewCouponModal} onOpenChange={(open) => setShowNewCouponModal(open)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Create Promotional Coupon</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleCreateCoupon} className="space-y-4 my-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Coupon Code *</Label>
            <Input
              type="text"
              required
              placeholder="e.g. ALLGO50, FEAST100"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Description</Label>
            <Input
              type="text"
              placeholder="e.g. 50% discount on food orders"
              value={couponDesc}
              onChange={(e) => setCouponDesc(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Type</Label>
              <Select
                value={couponType}
                items={COUPON_TYPE_ITEMS}
                onValueChange={(val) => setCouponType((val as any) ?? 'PERCENTAGE')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Coupon Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                    <SelectItem value="FLAT">Flat INR (₹)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                {couponType === 'PERCENTAGE' ? 'Discount % *' : 'Discount Amount (₹) *'}
              </Label>
              <Input
                type="number"
                required
                value={discountVal}
                onChange={(e) => setDiscountVal(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Min Order (₹)</Label>
              <Input type="number" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} />
            </div>
            {couponType === 'PERCENTAGE' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Max Cap (₹)</Label>
                <Input
                  type="number"
                  value={maxDiscount}
                  onChange={(e) => setMaxDiscount(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setShowNewCouponModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreatingCoupon}>
              {isCreatingCoupon ? 'Creating...' : 'Create Coupon'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
