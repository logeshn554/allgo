import { adminApi } from '@/lib/api-client';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@allgo/ui';
import { Button } from '@allgo/ui';
import { Input } from '@allgo/ui';
import { Textarea } from '@allgo/ui';
import { Badge } from '@allgo/ui';
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

interface ReassignModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  partnerId: string;
  setPartnerId: (val: string) => void;
  reason: string;
  setReason: (val: string) => void;
  isSubmitting: boolean;
  onlinePartners?: any[];
}

export const ReassignModal: React.FC<ReassignModalProps> = ({
  show,
  onClose,
  onSubmit,
  partnerId,
  setPartnerId,
  reason,
  setReason,
  isSubmitting,
  onlinePartners = [],
}) => {
  return (
    <Dialog open={show} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Reassign Parcel Courier</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 my-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              Select New Delivery Partner:
            </Label>
            <Select
              value={partnerId || null}
              items={onlinePartners.map((p) => ({
                value: p.id,
                label: `${p.fullName || 'Partner'} (${p.phone}) - ${p.vehicle?.vehicleType || 'Vehicle'}`,
              }))}
              onValueChange={(val) => setPartnerId(val ?? '')}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="-- Choose Partner --" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {onlinePartners.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.fullName || 'Partner'} ({p.phone}) - {p.vehicle?.vehicleType || 'Vehicle'}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              Reason for Reassignment:
            </Label>
            <Input
              type="text"
              required
              placeholder="e.g. Courier vehicle puncture / dispatch emergency"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Reassigning...' : 'Confirm Reassign'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface CancelModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  reason: string;
  setReason: (val: string) => void;
  isSubmitting: boolean;
}

export const CancelModal: React.FC<CancelModalProps> = ({
  show,
  onClose,
  onSubmit,
  reason,
  setReason,
  isSubmitting,
}) => {
  return (
    <Dialog open={show} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg text-destructive">Cancel Parcel Delivery</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 my-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              Administrative Reason:
            </Label>
            <Input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface ReturnModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  reason: string;
  setReason: (val: string) => void;
  isSubmitting: boolean;
  notes?: string;
  setNotes?: (val: string) => void;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({
  show,
  onClose,
  onSubmit,
  reason,
  setReason,
  isSubmitting,
}) => {
  return (
    <Dialog open={show} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Authorize Return to Sender</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 my-2">
          <p className="text-xs text-muted-foreground">
            This flags the package as undeliverable and generates reverse routing waybills.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              Return Authorization Reason:
            </Label>
            <Select
              value={reason || null}
              items={{
                RECIPIENT_UNAVAILABLE: 'Recipient Unavailable / Phone Unreachable',
                PREMISES_LOCKED: 'Delivery Address Closed / Premises Locked',
                RECIPIENT_REJECTED: 'Recipient Refused Package',
                PROHIBITED_CONTRABAND: 'Prohibited Goods Detected on Inspection',
                DAMAGED_IN_TRANSIT: 'Package Damaged During Transit',
              }}
              onValueChange={(val) => setReason(val ?? 'RECIPIENT_UNAVAILABLE')}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Return Reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="RECIPIENT_UNAVAILABLE">
                    Recipient Unavailable / Phone Unreachable
                  </SelectItem>
                  <SelectItem value="PREMISES_LOCKED">
                    Delivery Address Closed / Premises Locked
                  </SelectItem>
                  <SelectItem value="RECIPIENT_REJECTED">Recipient Refused Package</SelectItem>
                  <SelectItem value="PROHIBITED_CONTRABAND">
                    Prohibited Goods Detected on Inspection
                  </SelectItem>
                  <SelectItem value="DAMAGED_IN_TRANSIT">Package Damaged During Transit</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Authorizing Return...' : 'Confirm Return'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export interface ParcelModalsProps {
  selectedParcel: any | null;
  onCloseDetails: () => void;
  isForceModalOpen: boolean;
  onCloseForce: () => void;
  forceTargetStatus: string;
  setForceTargetStatus: (s: string) => void;
  forceReason: string;
  setForceReason: (s: string) => void;
  submittingForce: boolean;
  setSubmittingForce: (s: boolean) => void;
  onRefresh: () => void;
}

export const ParcelModals: React.FC<ParcelModalsProps> = ({
  selectedParcel,
  onCloseDetails,
  isForceModalOpen,
  onCloseForce,
  forceTargetStatus,
  setForceTargetStatus,
  forceReason,
  setForceReason,
  submittingForce,
  setSubmittingForce,
  onRefresh,
}) => {
  const handleForceTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParcel || !forceTargetStatus) return;
    try {
      setSubmittingForce(true);
      await adminApi.forceTransitionParcel(selectedParcel.id, forceTargetStatus, forceReason);
      onCloseForce();
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to force status');
    } finally {
      setSubmittingForce(false);
    }
  };

  return (
    <>
      {/* Parcel Inspection Details Modal */}
      <Dialog
        open={Boolean(selectedParcel) && !isForceModalOpen}
        onOpenChange={(open) => !open && onCloseDetails()}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">
              Parcel #{selectedParcel?.parcel_number || selectedParcel?.parcelNumber}
            </DialogTitle>
          </DialogHeader>

          {selectedParcel && (
            <div className="space-y-3 text-sm my-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground text-xs">Status: </span>
                  <Badge variant="outline">{selectedParcel.status}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Service: </span>
                  <span className="font-semibold">
                    {selectedParcel.service_type || selectedParcel.serviceType}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Category: </span>
                  <span>{selectedParcel.package_category || selectedParcel.packageCategory}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Weight: </span>
                  <span>
                    {selectedParcel.estimated_weight_kg || selectedParcel.weightKg || 1} kg
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <div className="text-xs font-semibold text-primary">SENDER</div>
                <div className="font-medium">
                  {selectedParcel.sender_name || selectedParcel.senderName}
                </div>
                <div className="text-xs text-muted-foreground">
                  {selectedParcel.pickup_address || selectedParcel.pickupAddress}
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <div className="text-xs font-semibold text-primary">RECIPIENT</div>
                <div className="font-medium">
                  {selectedParcel.recipient_name || selectedParcel.recipientName}
                </div>
                <div className="text-xs text-muted-foreground">
                  {selectedParcel.drop_address || selectedParcel.dropAddress}
                </div>
              </div>

              <div className="pt-2 border-t border-border flex justify-between items-center">
                <span className="text-xs font-semibold text-muted-foreground">Total Fee:</span>
                <span className="text-base font-bold text-primary">
                  ₹
                  {Number(
                    selectedParcel.total_amount_inr || selectedParcel.totalAmountInr || 0,
                  ).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={onCloseDetails}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Force Status Transition Modal */}
      <Dialog open={isForceModalOpen} onOpenChange={(open) => !open && onCloseForce()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg text-destructive">Force State Transition</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleForceTransition} className="space-y-4 my-2">
            <p className="text-xs text-muted-foreground">
              Administrative state override for Parcel #
              {selectedParcel?.parcel_number || selectedParcel?.parcelNumber}.
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Target Status:</Label>
              <Select
                value={forceTargetStatus || null}
                onValueChange={(val) => setForceTargetStatus(val ?? '')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="-- Choose Status --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="DRAFT">DRAFT</SelectItem>
                    <SelectItem value="QUOTE_GENERATED">QUOTE_GENERATED</SelectItem>
                    <SelectItem value="ASSIGNMENT_PENDING">ASSIGNMENT_PENDING</SelectItem>
                    <SelectItem value="COURIER_ASSIGNED">COURIER_ASSIGNED</SelectItem>
                    <SelectItem value="COURIER_ARRIVED_PICKUP">COURIER_ARRIVED_PICKUP</SelectItem>
                    <SelectItem value="PICKED_UP">PICKED_UP</SelectItem>
                    <SelectItem value="IN_TRANSIT">IN_TRANSIT</SelectItem>
                    <SelectItem value="DELIVERED">DELIVERED</SelectItem>
                    <SelectItem value="RETURNED">RETURNED</SelectItem>
                    <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Reason / Audit Trail:
              </Label>
              <Textarea
                rows={3}
                required
                placeholder="e.g. Manual override requested by operations team"
                value={forceReason}
                onChange={(e) => setForceReason(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onCloseForce}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={submittingForce}>
                {submittingForce ? 'Applying...' : 'Apply Transition'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
