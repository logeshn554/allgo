import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@allgo/ui';
import { Badge } from '@allgo/ui';

interface ParcelServicesTableProps {
  services: any[];
  onRefresh?: () => void;
}

export const ParcelServicesTable: React.FC<ParcelServicesTableProps> = ({ services }) => {
  return (
    <div className="space-y-3">
      <div className="text-lg font-semibold tracking-tight">
        Authoritative Delivery Service Tiers & Multipliers
      </div>
      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SERVICE TYPE</TableHead>
              <TableHead>NAME</TableHead>
              <TableHead>BASE MULTIPLIER</TableHead>
              <TableHead>EST. DELIVERY</TableHead>
              <TableHead>MAX DISTANCE (KM)</TableHead>
              <TableHead>STATUS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-semibold text-foreground">{s.service_type}</TableCell>
                <TableCell className="text-foreground">{s.display_name}</TableCell>
                <TableCell className="font-semibold text-primary">
                  {Number(s.base_multiplier).toFixed(2)}x
                </TableCell>
                <TableCell className="text-muted-foreground">{s.estimated_delivery_hours} hours</TableCell>
                <TableCell className="text-muted-foreground">{s.max_distance_km} km</TableCell>
                <TableCell>
                  <Badge variant={s.is_enabled ? 'default' : 'secondary'}>
                    {s.is_enabled ? 'ENABLED' : 'DISABLED'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
