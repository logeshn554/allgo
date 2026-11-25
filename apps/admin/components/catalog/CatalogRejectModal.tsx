import React from 'react';
import { CatalogProduct } from './CatalogProductsTable';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@allgo/ui';
import { Button } from '@allgo/ui';
import { Textarea } from '@allgo/ui';

interface CatalogRejectModalProps {
  product: CatalogProduct | null;
  rejectionReason: string;
  setRejectionReason: (val: string) => void;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const CatalogRejectModal: React.FC<CatalogRejectModalProps> = ({
  product,
  rejectionReason,
  setRejectionReason,
  isSubmitting,
  onClose,
  onConfirm,
}) => {
  return (
    <Dialog open={Boolean(product)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg text-destructive">
            Reject Catalog Product
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Specify the exact audit reason for rejecting <strong>{product?.name}</strong>. The merchant will receive this reason to rectify the item.
        </p>
        <div className="my-2 space-y-2">
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g. Non-compliant food safety claim / Unreasonable pricing / Duplicate SKU"
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
