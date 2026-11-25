'use client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@allgo/ui';
import { Badge } from '@allgo/ui';

interface MobilityHireDriverTabProps {
  hireDriverBookings: any[];
}

export function MobilityHireDriverTab({ hireDriverBookings }: MobilityHireDriverTabProps) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>BOOKING #</TableHead>
            <TableHead>CUSTOMER</TableHead>
            <TableHead>CHAUFFEUR</TableHead>
            <TableHead>VEHICLE / TRANSMISSION</TableHead>
            <TableHead>PICKUP ADDRESS</TableHead>
            <TableHead>PRICING MODEL</TableHead>
            <TableHead>TOTAL FARE</TableHead>
            <TableHead>STATUS</TableHead>
            <TableHead>CREATED</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hireDriverBookings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                No hire driver bookings recorded yet.
              </TableCell>
            </TableRow>
          ) : (
            hireDriverBookings.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-semibold text-foreground">#{b.booking_number}</TableCell>
                <TableCell>
                  <div className="font-medium text-foreground">{b.customer_name || 'Customer'}</div>
                  <div className="text-xs text-muted-foreground">{b.customer_phone}</div>
                </TableCell>
                <TableCell>
                  {b.driver_name ? (
                    <div>
                      <div className="font-medium text-foreground">{b.driver_name}</div>
                      <div className="text-xs text-muted-foreground">{b.driver_phone}</div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs italic">Unassigned</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="font-medium text-foreground">
                    {b.customer_vehicle_make_model || b.vehicle_make_model || 'Customer Car'}
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground">
                    {b.customer_vehicle_transmission || b.transmission_type || 'MANUAL'} •{' '}
                    {b.customer_vehicle_fuel_type || 'PETROL'}
                  </div>
                </TableCell>
                <TableCell className="max-w-[240px]">
                  <div className="truncate text-xs">Pickup: {b.pickup_address}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    {b.pricing_model || 'HOURLY'}
                  </Badge>
                </TableCell>
                <TableCell className="font-semibold text-foreground">
                  ₹{Number(b.total_fare_inr || 0).toFixed(2)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      b.status === 'COMPLETED'
                        ? 'default'
                        : b.status === 'CANCELLED'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {b.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {new Date(b.created_at).toLocaleTimeString()}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
