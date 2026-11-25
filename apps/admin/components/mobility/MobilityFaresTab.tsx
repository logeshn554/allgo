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

interface MobilityFaresTabProps {
  faresData: {
    rideFares: any[];
    parcelFares: any[];
  };
}

export function MobilityFaresTab({ faresData }: MobilityFaresTabProps) {
  return (
    <div className="space-y-6">
      {/* Ride Fares */}
      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Ride Fare Configurations (Per Vehicle Category)</h3>
          <p className="text-sm text-muted-foreground">
            Active base rate, per-km distance fee, per-minute time fee, and platform commission.
          </p>
        </div>
        <div className="overflow-hidden rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CATEGORY</TableHead>
                <TableHead>BASE FARE</TableHead>
                <TableHead>BASE DISTANCE</TableHead>
                <TableHead>PER KM RATE</TableHead>
                <TableHead>PER MINUTE</TableHead>
                <TableHead>MINIMUM FARE</TableHead>
                <TableHead>CANCEL FEE</TableHead>
                <TableHead>COMMISSION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {faresData.rideFares.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No ride fare slabs configured.
                  </TableCell>
                </TableRow>
              ) : (
                faresData.rideFares.map((f: any) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-semibold text-foreground">{f.vehicle_category}</TableCell>
                    <TableCell>₹{Number(f.base_fare_inr || 0).toFixed(2)}</TableCell>
                    <TableCell>{Number(f.base_distance_km || 0).toFixed(1)} km</TableCell>
                    <TableCell>₹{Number(f.per_km_rate_inr || 0).toFixed(2)}/km</TableCell>
                    <TableCell>₹{Number(f.per_minute_rate_inr || 0).toFixed(2)}/min</TableCell>
                    <TableCell>₹{Number(f.minimum_fare_inr || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-destructive">₹{Number(f.cancellation_fee_inr || 0).toFixed(2)}</TableCell>
                    <TableCell className="font-semibold text-primary">{f.commission_rate_percentage || 20}%</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Parcel Fares */}
      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Parcel Courier Fare Configurations</h3>
          <p className="text-sm text-muted-foreground">
            Pricing slabs per package category and per-kg weight tiers.
          </p>
        </div>
        <div className="overflow-hidden rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CATEGORY</TableHead>
                <TableHead>BASE FARE</TableHead>
                <TableHead>BASE DISTANCE</TableHead>
                <TableHead>PER KM RATE</TableHead>
                <TableHead>PER KG RATE</TableHead>
                <TableHead>MAX WEIGHT</TableHead>
                <TableHead>COMMISSION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {faresData.parcelFares.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No parcel fare slabs configured.
                  </TableCell>
                </TableRow>
              ) : (
                faresData.parcelFares.map((pf: any) => (
                  <TableRow key={pf.id}>
                    <TableCell className="font-semibold text-foreground">
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        {pf.package_category}
                      </Badge>
                    </TableCell>
                    <TableCell>₹{Number(pf.base_fare_inr || 0).toFixed(2)}</TableCell>
                    <TableCell>{Number(pf.base_distance_km || 0).toFixed(1)} km</TableCell>
                    <TableCell>₹{Number(pf.per_km_rate_inr || 0).toFixed(2)}/km</TableCell>
                    <TableCell>₹{Number(pf.per_kg_rate_inr || 0).toFixed(2)}/kg</TableCell>
                    <TableCell>{Number(pf.max_weight_kg || 10).toFixed(1)} kg</TableCell>
                    <TableCell className="font-semibold text-primary">{pf.commission_rate_percentage || 15}%</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
