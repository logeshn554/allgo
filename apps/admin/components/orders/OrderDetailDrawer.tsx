'use client';

import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { OrderCancelSection } from './OrderCancelSection';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@allgo/ui';
import { Button } from '@allgo/ui';
import { Separator } from '@allgo/ui';

interface OrderDetailDrawerProps {
  selectedOrder: any | null;
  isLoadingDetail: boolean;
  onClose: () => void;
  showCancelDialog: boolean;
  setShowCancelDialog: (s: boolean) => void;
  cancelReason: string;
  setCancelReason: (r: string) => void;
  handleCancelOrder: () => Promise<void>;
  isCancelling: boolean;
}

export function OrderDetailDrawer({
  selectedOrder,
  isLoadingDetail,
  onClose,
  showCancelDialog,
  setShowCancelDialog,
  cancelReason,
  setCancelReason,
  handleCancelOrder,
  isCancelling,
}: OrderDetailDrawerProps) {
  if (isLoadingDetail) {
    return (
      <div className="fixed top-5 end-5 px-4 py-2 bg-popover text-popover-foreground rounded-2xl shadow-lg ring-1 ring-foreground/10 z-[1100] text-xs font-semibold">
        Loading Order Details...
      </div>
    );
  }

  if (!selectedOrder) return null;

  return (
    <Sheet open={!!selectedOrder} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-1">
          <SheetTitle className="text-xl font-bold">
            Order #{selectedOrder.subOrderNumber}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Group: {selectedOrder.orderGroupId || selectedOrder.subOrderNumber}
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 pb-6">
        {/* Status & PIN Banner */}
        <div className="p-4 bg-muted/50 rounded-lg border border-border mb-6 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground text-xs">Order Status:</span>
            <span className="font-bold text-primary">{selectedOrder.status}</span>
          </div>
          {selectedOrder.deliveryPin && (
            <div className="flex justify-between items-center text-sm pt-1">
              <span className="text-muted-foreground text-xs">Customer Delivery PIN:</span>
              <span className="font-bold tracking-widest text-foreground text-base">
                {selectedOrder.deliveryPin}
              </span>
            </div>
          )}
          {selectedOrder.handoverOtp && (
            <div className="flex justify-between items-center text-sm pt-1">
              <span className="text-muted-foreground text-xs">Merchant Handover OTP:</span>
              <span className="font-bold tracking-widest text-foreground text-base">
                {selectedOrder.handoverOtp}
              </span>
            </div>
          )}
        </div>

        {/* Items */}
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Itemized Items ({selectedOrder.items?.length || 0})
        </h3>
        <div className="border border-border rounded-lg p-3 mb-6 divide-y divide-border">
          {selectedOrder.items?.map((it: any, i: number) => (
            <div
              key={i}
              className="flex justify-between items-start py-2.5 first:pt-0 last:pb-0 text-sm"
            >
              <div>
                <div className="font-semibold text-foreground">
                  {it.quantity}x {it.itemName || it.item_name_snapshot}
                </div>
                {it.customizations && it.customizations.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {it.customizations.map((c: any) => c.option_name_snapshot).join(', ')}
                  </div>
                )}
              </div>
              <div className="font-semibold text-foreground">
                ₹{it.totalPriceInr || it.total_price_inr}
              </div>
            </div>
          ))}
        </div>

        {/* Financial Summary */}
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Financial Breakdown
        </h3>
        <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6 space-y-2 text-sm">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Items Subtotal:</span>
            <span className="text-foreground">₹{selectedOrder.pricing?.itemsSubtotalInr || selectedOrder.pricing?.items_total_inr || 0}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Delivery Fee:</span>
            <span className="text-foreground">₹{selectedOrder.pricing?.deliveryFeeInr || selectedOrder.pricing?.delivery_fee_inr || 0}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Packaging Fee:</span>
            <span className="text-foreground">₹{selectedOrder.pricing?.packagingFeeInr || selectedOrder.pricing?.packaging_fee_inr || 0}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Platform Fee:</span>
            <span className="text-foreground">₹{selectedOrder.pricing?.platformFeeInr || selectedOrder.pricing?.platform_fee_inr || 0}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">GST (5%):</span>
            <span className="text-foreground">₹{selectedOrder.pricing?.gstAmountInr || selectedOrder.pricing?.tax_total_inr || 0}</span>
          </div>
          {selectedOrder.pricing?.discountAmountInr > 0 && (
            <div className="flex justify-between text-xs text-primary font-medium">
              <span>Discount:</span>
              <span>-₹{selectedOrder.pricing.discountAmountInr}</span>
            </div>
          )}
          <Separator className="my-2" />
          <div className="flex justify-between font-bold text-sm pt-1">
            <span className="text-foreground">Total Paid:</span>
            <span className="text-primary">
              ₹{selectedOrder.pricing?.finalPayableAmountInr || selectedOrder.pricing?.total_payable_inr || 0}
            </span>
          </div>
        </div>

        <OrderCancelSection
          status={selectedOrder.status}
          showCancelDialog={showCancelDialog}
          setShowCancelDialog={setShowCancelDialog}
          cancelReason={cancelReason}
          setCancelReason={setCancelReason}
          handleCancelOrder={handleCancelOrder}
          isCancelling={isCancelling}
        />
        </div>
      </SheetContent>
    </Sheet>
  );
}
