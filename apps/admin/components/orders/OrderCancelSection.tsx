'use client';
import { Button } from '@allgo/ui';
import { Textarea } from '@allgo/ui';

export interface OrderCancelSectionProps {
  status: string;
  showCancelDialog: boolean;
  setShowCancelDialog: (s: boolean) => void;
  cancelReason: string;
  setCancelReason: (r: string) => void;
  handleCancelOrder: () => Promise<void>;
  isCancelling: boolean;
}

export function OrderCancelSection({
  status,
  showCancelDialog,
  setShowCancelDialog,
  cancelReason,
  setCancelReason,
  handleCancelOrder,
  isCancelling,
}: OrderCancelSectionProps) {
  if (status === 'DELIVERED' || status === 'CANCELLED') return null;

  return (
    <div className="border-t border-border pt-4 mt-4">
      {!showCancelDialog ? (
        <Button variant="destructive" className="w-full" onClick={() => setShowCancelDialog(true)}>
          Emergency Cancel & Refund Order
        </Button>
      ) : (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 space-y-3">
          <p className="text-xs font-semibold text-destructive">
            Reason for Admin Cancellation (Required for audit log):
          </p>
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="e.g. Customer dispute, restaurant outage, accidental order..."
            rows={3}
          />
          <div className="flex gap-2">
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleCancelOrder}
              disabled={isCancelling || !cancelReason.trim()}
            >
              {isCancelling ? 'Processing...' : 'Confirm Cancellation'}
            </Button>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Abort
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
