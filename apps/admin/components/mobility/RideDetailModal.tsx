'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@allgo/ui';
import { Button } from '@allgo/ui';
import { Badge } from '@allgo/ui';

interface RideDetailModalProps {
  selectedRideDetail: any | null;
  onClose: () => void;
}

export function RideDetailModal({ selectedRideDetail, onClose }: RideDetailModalProps) {
  return (
    <Dialog open={Boolean(selectedRideDetail)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">
            Ride Details #{selectedRideDetail?.ride?.ride_number}
          </DialogTitle>
        </DialogHeader>

        {selectedRideDetail?.ride && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Status: </span>
              <Badge variant="outline">{selectedRideDetail.ride.status}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Vehicle: </span>
              <span className="font-medium text-foreground">{selectedRideDetail.ride.ride_type} ({selectedRideDetail.ride.registration_number || 'N/A'})</span>
            </div>
            <div>
              <span className="text-muted-foreground">Customer: </span>
              <span className="font-medium text-foreground">{selectedRideDetail.ride.customer_name} ({selectedRideDetail.ride.customer_phone})</span>
            </div>
            <div>
              <span className="text-muted-foreground">Driver: </span>
              <span className="font-medium text-foreground">{selectedRideDetail.ride.driver_name || 'Unassigned'} ({selectedRideDetail.ride.driver_phone || 'N/A'})</span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Pickup: </span>
              <span className="text-foreground">{selectedRideDetail.ride.pickup_address}</span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Drop: </span>
              <span className="text-foreground">{selectedRideDetail.ride.drop_address}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Fare: </span>
              <span className="font-bold text-foreground">₹{Number(selectedRideDetail.ride.total_fare_inr || 0).toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Created: </span>
              <span className="text-foreground">{new Date(selectedRideDetail.ride.created_at).toLocaleString()}</span>
            </div>
          </div>
        )}

        <div className="mt-4">
          <h4 className="text-sm font-semibold mb-2 text-foreground">
            Immutable Audit Event Timeline ({selectedRideDetail?.events?.length || 0})
          </h4>
          <div className="border border-border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
            {(selectedRideDetail?.events || []).length === 0 ? (
              <div className="text-muted-foreground text-xs">No audit events logged</div>
            ) : (
              selectedRideDetail.events.map((ev: any) => (
                <div key={ev.id} className="flex justify-between items-center text-xs py-1 border-b border-border last:border-0">
                  <span className="font-semibold text-primary">{ev.event_type}</span>
                  <span className="text-muted-foreground">{new Date(ev.created_at).toLocaleTimeString()}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
