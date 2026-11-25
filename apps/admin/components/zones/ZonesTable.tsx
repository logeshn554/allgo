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

interface ZonesTableProps {
  zones: any[];
  isLoading: boolean;
  onOpenSurgeModal: (zone: any) => void;
}

export function ZonesTable({ zones, isLoading, onOpenSurgeModal }: ZonesTableProps) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">ZONE NAME & CODE</TableHead>
              <TableHead>STATUS</TableHead>
              <TableHead>AREA</TableHead>
              <TableHead>FOOD SETTINGS</TableHead>
              <TableHead>GROCERY SETTINGS</TableHead>
              <TableHead>SURGE MULTIPLIER</TableHead>
              <TableHead className="text-end">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  Loading service zones...
                </TableCell>
              </TableRow>
            ) : zones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No service zones found.
                </TableCell>
              </TableRow>
            ) : (
              zones.map((zone) => {
                const food = zone.service_settings?.find((s: any) => s.verticalType === 'FOOD');
                const grocery = zone.service_settings?.find((s: any) => s.verticalType === 'GROCERY');
                const isSurge = food?.isSurgeActive && food?.surgeMultiplier > 1.0;

                return (
                  <TableRow key={zone.id}>
                    <TableCell>
                      <div className="font-semibold text-foreground">{zone.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{zone.code}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={zone.is_active ? 'default' : 'secondary'}>
                        {zone.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {zone.area_sq_km ? `${parseFloat(zone.area_sq_km).toFixed(1)} km²` : 'Polygon'}
                    </TableCell>
                    <TableCell>
                      {food ? (
                        <div className="text-sm">
                          <div>Min ₹{food.minOrderValueInr} • Base ₹{food.baseDeliveryFeeInr}</div>
                          <div className="text-xs text-muted-foreground">Free up to {food.freeDeliveryDistanceKm} km</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Disabled</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {grocery ? (
                        <div className="text-sm">
                          <div>Min ₹{grocery.minOrderValueInr} • Base ₹{grocery.baseDeliveryFeeInr}</div>
                          <div className="text-xs text-muted-foreground">Free up to {grocery.freeDeliveryDistanceKm} km</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Disabled</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isSurge ? (
                        <Badge variant="destructive" className="bg-destructive/15 text-destructive border-destructive/20">
                          {food.surgeMultiplier}x Active
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">1.0x (Standard)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenSurgeModal(zone)}
                      >
                        Surge Control
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
    </div>
  );
}
