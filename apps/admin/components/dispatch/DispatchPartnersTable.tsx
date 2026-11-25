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

interface DispatchPartnersTableProps {
  onlinePartners: any[];
}

export const DispatchPartnersTable: React.FC<DispatchPartnersTableProps> = ({ onlinePartners }) => {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Partner Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Account Status</TableHead>
              <TableHead>Session Status</TableHead>
              <TableHead>GPS Telemetry</TableHead>
              <TableHead>Last Heartbeat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {onlinePartners.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No delivery partners currently active or online.
                </TableCell>
              </TableRow>
            ) : (
              onlinePartners.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-semibold text-foreground">{p.fullName || 'Partner'}</TableCell>
                  <TableCell className="text-muted-foreground">{p.phone}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      {p.accountStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.sessionStatus === 'BUSY' ? 'secondary' : 'default'}>
                      {p.sessionStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.currentLocation ? (
                      <span>
                        {p.currentLocation.latitude.toFixed(4)}, {p.currentLocation.longitude.toFixed(4)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Awaiting lock</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {p.lastHeartbeatAt ? new Date(p.lastHeartbeatAt).toLocaleTimeString() : 'N/A'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
    </div>
  );
};
