'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@allgo/ui';
import { Button } from '@allgo/ui';
import { Input } from '@allgo/ui';
import { Label } from '@allgo/ui';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from '@allgo/ui';

interface ServiceabilitySimulatorProps {
  showSimulator: boolean;
  simLat: string;
  setSimLat: (l: string) => void;
  simLng: string;
  setSimLng: (l: string) => void;
  simVertical: string;
  setSimVertical: (v: string) => void;
  simResult: any | null;
  isSimulating: boolean;
  handleRunSimulator: () => Promise<void>;
}

export function ServiceabilitySimulator({
  showSimulator,
  simLat,
  setSimLat,
  simLng,
  setSimLng,
  simVertical,
  setSimVertical,
  simResult,
  isSimulating,
  handleRunSimulator,
}: ServiceabilitySimulatorProps) {
  if (!showSimulator) return null;

  return (
    <Card className="border-primary/50 mb-6">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <CardTitle className="text-base">Customer Location Serviceability Simulator</CardTitle>
          <span className="text-xs text-muted-foreground">Runs live PostGIS ST_Contains point-in-polygon resolution</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Latitude</Label>
            <Input
              type="text"
              value={simLat}
              onChange={(e) => setSimLat(e.target.value)}
              className="w-32"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Longitude</Label>
            <Input
              type="text"
              value={simLng}
              onChange={(e) => setSimLng(e.target.value)}
              className="w-32"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Vertical</Label>
            <Select
              value={simVertical}
              onValueChange={(val) => setSimVertical(val ?? 'FOOD')}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Vertical" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="FOOD">FOOD</SelectItem>
                  <SelectItem value="GROCERY">GROCERY</SelectItem>
                  <SelectItem value="PARCEL">PARCEL</SelectItem>
                  <SelectItem value="RIDE">RIDE</SelectItem>
                  <SelectItem value="HOME_MADE">HOME_MADE</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleRunSimulator}
            disabled={isSimulating}
          >
            {isSimulating ? 'Checking...' : 'Check Location'}
          </Button>
        </div>

        {simResult && (
          <div
            className={`p-4 rounded-lg border text-sm ${
              simResult.isServiceable
                ? 'bg-primary/10 border-primary/20 text-primary'
                : 'bg-destructive/10 border-destructive/20 text-destructive'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold">
              <span>{simResult.isServiceable ? 'Serviceable' : 'Unserviceable'}</span>
              <span>
                {simResult.isServiceable ? 'Location is Serviceable' : 'Location Not Serviceable'}
              </span>
              {simResult.zone && (
                <span className="font-normal text-foreground">
                  — Zone: <strong>{simResult.zone.name}</strong> ({simResult.zone.code})
                </span>
              )}
            </div>
            {simResult.reason && <p className="mt-1 text-xs">{simResult.reason}</p>}
            {simResult.serviceSettings && (
              <div className="flex flex-wrap gap-4 mt-2 text-xs text-foreground font-normal">
                <div>
                  Base Delivery Fee: <strong>₹{simResult.serviceSettings.baseDeliveryFeeInr}</strong>
                </div>
                <div>
                  Free Distance: <strong>{simResult.serviceSettings.freeDeliveryDistanceKm} km</strong>
                </div>
                <div>
                  Surge: <strong>{simResult.serviceSettings.surgeMultiplier}x</strong>{' '}
                  {simResult.serviceSettings.isSurgeActive && <span className="text-destructive font-semibold">(Active)</span>}
                </div>
                <div>
                  Eligible Outlets: <strong>{simResult.eligibleOutletsCount}</strong>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
