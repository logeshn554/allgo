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

interface MobilitySosTabProps {
  sosEvents: any[];
  onSelectSos: (sos: any) => void;
}

export function MobilitySosTab({ sosEvents, onSelectSos }: MobilitySosTabProps) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <Table>
          <TableHeader>
            <TableRow>
              <TableHead>TRIGGERED</TableHead>
              <TableHead>RIDE #</TableHead>
              <TableHead>REPORTER</TableHead>
              <TableHead>GPS COORDINATES</TableHead>
              <TableHead>ALERT REASON</TableHead>
              <TableHead>STATUS</TableHead>
              <TableHead className="text-end">ACTION</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sosEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No SOS emergency events recorded.
                </TableCell>
              </TableRow>
            ) : (
              sosEvents.map((ev) => (
                <TableRow
                  key={ev.id}
                  className={ev.status === 'TRIGGERED' ? 'bg-destructive/10' : ''}
                >
                  <TableCell className={`font-semibold text-xs ${ev.status === 'TRIGGERED' ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {new Date(ev.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">#{ev.ride_number}</TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{ev.reporter_name}</div>
                    <div className="text-xs text-muted-foreground">{ev.reporter_phone}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {ev.latitude?.toFixed(5)}, {ev.longitude?.toFixed(5)}
                  </TableCell>
                  <TableCell className="max-w-[260px] text-xs text-foreground">
                    {ev.reason || 'Customer panic SOS button pressed'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ev.status === 'TRIGGERED' ? 'destructive' : 'default'}>
                      {ev.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-end">
                    {ev.status === 'TRIGGERED' ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onSelectSos(ev)}
                      >
                        Resolve Alert
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Resolved: {ev.resolution_notes}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
    </div>
  );
}
