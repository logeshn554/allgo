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
import { Switch } from '@allgo/ui';
import { Badge } from '@allgo/ui';

interface MobilityFlagsTabProps {
  featureFlags: any[];
  onToggleFlag: (stateCode: string, field: 'ridesEnabled' | 'hireDriverEnabled' | 'bikeTaxiEnabled', currentValue: boolean) => void;
}

export function MobilityFlagsTab({ featureFlags, onToggleFlag }: MobilityFlagsTabProps) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold text-foreground">State-by-State Mobility Regulatory Feature Clearances</h3>
        <p className="text-sm text-muted-foreground">
          Strict legal compliance gating: Bike taxi, commercial auto/cab rides, and hire-driver services are legally gated per State Transport Department regulations.
        </p>
      </div>
      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>STATE</TableHead>
              <TableHead>STATE CODE</TableHead>
              <TableHead>RIDES (CAB / AUTO)</TableHead>
              <TableHead>BIKE TAXI CLEARANCE</TableHead>
              <TableHead>HIRE-DRIVER PERMISSION</TableHead>
              <TableHead>LAST UPDATED</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {featureFlags.map((ff) => (
              <TableRow key={ff.id}>
                <TableCell className="font-semibold text-foreground">{ff.state_name}</TableCell>
                <TableCell className="font-bold text-foreground font-mono">{ff.state_code}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={ff.rides_enabled}
                      onCheckedChange={() => onToggleFlag(ff.state_code, 'ridesEnabled', ff.rides_enabled)}
                    />
                    <Badge variant={ff.rides_enabled ? 'default' : 'secondary'}>
                      {ff.rides_enabled ? 'ALLOWED' : 'DISABLED'}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={ff.bike_taxi_enabled}
                      onCheckedChange={() => onToggleFlag(ff.state_code, 'bikeTaxiEnabled', ff.bike_taxi_enabled)}
                    />
                    <Badge variant={ff.bike_taxi_enabled ? 'default' : 'secondary'}>
                      {ff.bike_taxi_enabled ? 'ALLOWED' : 'PROHIBITED'}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={ff.hire_driver_enabled}
                      onCheckedChange={() => onToggleFlag(ff.state_code, 'hireDriverEnabled', ff.hire_driver_enabled)}
                    />
                    <Badge variant={ff.hire_driver_enabled ? 'default' : 'secondary'}>
                      {ff.hire_driver_enabled ? 'ALLOWED' : 'DISABLED'}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {new Date(ff.updated_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
