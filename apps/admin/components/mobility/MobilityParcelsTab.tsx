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
import { Badge } from '@allgo/ui';

interface MobilityParcelsTabProps {
  parcels: any[];
}

export function MobilityParcelsTab({ parcels }: MobilityParcelsTabProps) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PARCEL #</TableHead>
              <TableHead>CATEGORY</TableHead>
              <TableHead>WEIGHT</TableHead>
              <TableHead>SENDER</TableHead>
              <TableHead>RECIPIENT</TableHead>
              <TableHead>COURIER</TableHead>
              <TableHead>AMOUNT</TableHead>
              <TableHead>STATUS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parcels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  No parcels recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              parcels.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-semibold text-foreground">#{p.parcel_number}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      {p.package_category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {Number(p.estimated_weight_kg || 1).toFixed(1)} kg
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{p.sender_name || 'Sender'}</div>
                    <div className="text-xs text-muted-foreground">{p.sender_phone}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{p.recipient_name}</div>
                    <div className="text-xs text-muted-foreground">{p.recipient_phone}</div>
                  </TableCell>
                  <TableCell>
                    {p.courier_name ? (
                      <div className="text-foreground">{p.courier_name}</div>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">
                    ₹{Number(p.total_amount_inr || 0).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.status === 'DELIVERED' ? 'default' : 'secondary'}>
                      {p.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
    </div>
  );
}
