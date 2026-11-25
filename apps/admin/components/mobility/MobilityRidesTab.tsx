'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@allgo/ui';
import { Button } from '@allgo/ui';
import { Badge } from '@allgo/ui';

interface MobilityRidesTabProps {
  rides: any[];
  isLoadingRideDetail: boolean;
  onViewRide: (rideId: string) => void;
}

export function MobilityRidesTab({ rides, isLoadingRideDetail, onViewRide }: MobilityRidesTabProps) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <Table>
          <TableHeader>
            <TableRow>
              <TableHead>RIDE #</TableHead>
              <TableHead>VEHICLE</TableHead>
              <TableHead>CUSTOMER</TableHead>
              <TableHead>DRIVER</TableHead>
              <TableHead>PICKUP / DROPOFF</TableHead>
              <TableHead>TOTAL FARE</TableHead>
              <TableHead>STATUS</TableHead>
              <TableHead className="text-end">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rides.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  No rides recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              rides.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-semibold text-foreground">#{r.ride_number}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      {r.ride_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{r.customer_name || 'Customer'}</div>
                    <div className="text-xs text-muted-foreground">{r.customer_phone}</div>
                  </TableCell>
                  <TableCell>
                    {r.driver_name ? (
                      <div>
                        <div className="font-medium text-foreground">{r.driver_name}</div>
                        <div className="text-xs text-muted-foreground">{r.driver_phone}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[240px]">
                    <div className="truncate text-xs">Pickup: {r.pickup_address}</div>
                    <div className="truncate text-xs text-muted-foreground mt-0.5">Drop: {r.drop_address}</div>
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">
                    ₹{Number(r.total_fare_inr || 0).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.status === 'COMPLETED'
                          ? 'default'
                          : r.status === 'CANCELLED'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewRide(r.id)}
                      disabled={isLoadingRideDetail}
                    >
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
    </div>
  );
}
