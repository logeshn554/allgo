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
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type React from 'react';

interface ManualAssignModalProps {
  assignJobId: string | null;
  assignPartnerId: string;
  setAssignPartnerId: (val: string) => void;
  assignReason: string;
  setAssignReason: (val: string) => void;
  onlinePartners: any[];
  actionLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ManualAssignModal: React.FC<ManualAssignModalProps> = ({
  assignJobId,
  assignPartnerId,
  setAssignPartnerId,
  assignReason,
  setAssignReason,
  onlinePartners,
  actionLoading,
  onClose,
  onConfirm,
}) => {
  return (
    <Dialog open={Boolean(assignJobId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Manual Dispatch Assignment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 my-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Select Partner</Label>
            <Select
              value={assignPartnerId || null}
              items={onlinePartners.map((p) => ({
                value: p.id,
                label: `${p.fullName || 'Partner'} (${p.phone}) - ${p.sessionStatus}`,
              }))}
              onValueChange={(val) => setAssignPartnerId(val ?? '')}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="-- Choose Partner --" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {onlinePartners.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.fullName || 'Partner'} ({p.phone}) - {p.sessionStatus}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              Reason for Override
            </Label>
            <Input
              type="text"
              placeholder="e.g. VIP express dispatch or nearest courier"
              value={assignReason}
              onChange={(e) => setAssignReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={actionLoading || !assignPartnerId}>
            {actionLoading ? 'Assigning...' : 'Confirm Assignment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface CancelJobModalProps {
  cancelJobId: string | null;
  cancelReasonCode?: string;
  setCancelReasonCode?: (val: string) => void;
  cancelReason?: string;
  setCancelReason?: (val: string) => void;
  cancelReasonDetails?: string;
  setCancelReasonDetails?: (val: string) => void;
  actionLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const CancelJobModal: React.FC<CancelJobModalProps> = ({
  cancelJobId,
  cancelReasonCode,
  setCancelReasonCode,
  cancelReason,
  setCancelReason,
  cancelReasonDetails,
  setCancelReasonDetails,
  actionLoading,
  onClose,
  onConfirm,
}) => {
  const currentReason = cancelReasonDetails ?? cancelReason ?? '';
  const handleReasonChange = (val: string) => {
    if (setCancelReasonDetails) setCancelReasonDetails(val);
    if (setCancelReason) setCancelReason(val);
  };

  return (
    <Dialog open={Boolean(cancelJobId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg text-destructive">Cancel Delivery Job</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 my-2">
          {setCancelReasonCode && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Cancellation Reason Code
              </Label>
              <Select
                value={cancelReasonCode || null}
                items={{
                  ADMIN_OVERRIDE: 'Admin Manual Override',
                  CUSTOMER_CANCELLED: 'Customer Requested Cancellation',
                  MERCHANT_REJECTED: 'Merchant Out of Stock / Unresponsive',
                  NO_PARTNERS_AVAILABLE: 'No Partner Available in Zone',
                  FRAUD_SUSPECTED: 'Suspected Fraudulent Activity',
                }}
                onValueChange={(val) => setCancelReasonCode(val ?? 'ADMIN_OVERRIDE')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Reason Code" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="ADMIN_OVERRIDE">Admin Manual Override</SelectItem>
                    <SelectItem value="CUSTOMER_CANCELLED">
                      Customer Requested Cancellation
                    </SelectItem>
                    <SelectItem value="MERCHANT_REJECTED">
                      Merchant Out of Stock / Unresponsive
                    </SelectItem>
                    <SelectItem value="NO_PARTNERS_AVAILABLE">
                      No Partner Available in Zone
                    </SelectItem>
                    <SelectItem value="FRAUD_SUSPECTED">Suspected Fraudulent Activity</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              Details / Audit Notes
            </Label>
            <Textarea
              rows={3}
              placeholder="Enter mandatory reason details for audit..."
              value={currentReason}
              onChange={(e) => handleReasonChange(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Dismiss
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={actionLoading}>
            {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface JobDetailsModalProps {
  selectedJob: any | null;
  onClose: () => void;
}

export const JobDetailsModal: React.FC<JobDetailsModalProps> = ({ selectedJob, onClose }) => {
  return (
    <Dialog open={Boolean(selectedJob)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Job #{selectedJob?.job_number}</DialogTitle>
        </DialogHeader>

        {selectedJob && (
          <div className="space-y-4 my-2 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-muted-foreground">Status: </span>
                <Badge variant="outline">{selectedJob.status}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Vertical: </span>
                <span className="font-medium text-foreground">{selectedJob.vertical_type}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Outlet: </span>
                <span className="font-medium text-foreground">{selectedJob.outlet_name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Courier Fee: </span>
                <span className="font-bold text-primary">
                  ₹{Number(selectedJob.courier_fee_inr || 0).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Handover OTP: </span>
                <span className="font-mono">{selectedJob.handover_otp || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Delivery PIN: </span>
                <span className="font-mono">{selectedJob.delivery_pin || 'N/A'}</span>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-muted-foreground">PICKUP ADDRESS</div>
              <div className="text-xs text-foreground mt-0.5">{selectedJob.pickup_address}</div>
            </div>

            <div>
              <div className="text-xs font-semibold text-muted-foreground">DROPOFF ADDRESS</div>
              <div className="text-xs text-foreground mt-0.5">{selectedJob.dropoff_address}</div>
            </div>

            <div className="pt-2 border-t border-border">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                Status Lifecycle Events
              </h4>
              <div className="space-y-1 text-xs">
                {(selectedJob.events || []).map((ev: any) => (
                  <div
                    key={ev.id}
                    className="flex justify-between items-center py-0.5 border-b border-border last:border-0"
                  >
                    <span className="inline-flex items-center gap-1">
                      <span>{ev.from_status || 'INIT'}</span>
                      <HugeiconsIcon
                        icon={ArrowRight01Icon}
                        className="size-3 text-muted-foreground rtl:rotate-180"
                      />
                      <strong>{ev.to_status}</strong> ({ev.actor_role})
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(ev.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                Dispatch Attempts
              </h4>
              <div className="space-y-1 text-xs">
                {(selectedJob.dispatch_attempts || []).length === 0 ? (
                  <div className="text-muted-foreground text-xs">No dispatch attempts yet.</div>
                ) : (
                  (selectedJob.dispatch_attempts || []).map((da: any) => (
                    <div key={da.id} className="flex justify-between items-center py-0.5">
                      <span>
                        #{da.attempt_number} {da.partner_name} ({da.status})
                      </span>
                      <span className="text-muted-foreground">Dist: {da.distance_meters}m</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export interface DispatchModalsProps {
  selectedJob: any | null;
  onCloseDetails: () => void;
  assignJobId: string | null;
  onCloseAssign: () => void;
  assignPartnerId: string;
  setAssignPartnerId: (val: string) => void;
  assignReason: string;
  setAssignReason: (val: string) => void;
  onConfirmAssign: () => void;
  cancelJobId: string | null;
  onCloseCancel: () => void;
  cancelReason: string;
  setCancelReason: (val: string) => void;
  onConfirmCancel: () => void;
  resolvingExId?: string | null;
  onCloseResolve?: () => void;
  resolveAction?: string;
  setResolveAction?: (val: string) => void;
  onConfirmResolve?: () => void;
  actionLoading: boolean;
  onlinePartners: any[];
}

export const DispatchModals: React.FC<DispatchModalsProps> = ({
  selectedJob,
  onCloseDetails,
  assignJobId,
  onCloseAssign,
  assignPartnerId,
  setAssignPartnerId,
  assignReason,
  setAssignReason,
  onConfirmAssign,
  cancelJobId,
  onCloseCancel,
  cancelReason,
  setCancelReason,
  onConfirmCancel,
  actionLoading,
  onlinePartners,
}) => {
  return (
    <>
      <JobDetailsModal selectedJob={selectedJob} onClose={onCloseDetails} />
      <ManualAssignModal
        assignJobId={assignJobId}
        assignPartnerId={assignPartnerId}
        setAssignPartnerId={setAssignPartnerId}
        assignReason={assignReason}
        setAssignReason={setAssignReason}
        onlinePartners={onlinePartners}
        actionLoading={actionLoading}
        onClose={onCloseAssign}
        onConfirm={onConfirmAssign}
      />
      <CancelJobModal
        cancelJobId={cancelJobId}
        cancelReason={cancelReason}
        setCancelReason={setCancelReason}
        actionLoading={actionLoading}
        onClose={onCloseCancel}
        onConfirm={onConfirmCancel}
      />
    </>
  );
};
