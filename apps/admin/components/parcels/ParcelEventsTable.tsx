import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@allgo/ui';
import { Badge } from '@allgo/ui';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type React from 'react';

interface ParcelEventsTableProps {
  events: any[];
}

export const ParcelEventsTable: React.FC<ParcelEventsTableProps> = ({ events }) => {
  return (
    <div className="space-y-3">
      <div className="text-lg font-semibold tracking-tight">
        Immutable Delivery Events Log ({events.length})
      </div>
      <div className="overflow-hidden rounded-md border border-border">
        {events.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No events logged yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>TIMESTAMP</TableHead>
                <TableHead>EVENT TYPE</TableHead>
                <TableHead>ACTOR ROLE</TableHead>
                <TableHead>
                  <span className="inline-flex items-center gap-1">
                    <span>FROM</span>
                    <HugeiconsIcon icon={ArrowRight01Icon} className="size-3 rtl:rotate-180" />
                    <span>TO</span>
                  </span>
                </TableHead>
                <TableHead>REASON & DETAILS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((e, idx) => (
                <TableRow key={e.id || idx}>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(e.created_at || e.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">
                    {e.event_type || e.eventType}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {e.actor_role || e.actorRole}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    <span className="inline-flex items-center gap-1">
                      <span>{e.from_status || e.fromStatus || '—'}</span>
                      <HugeiconsIcon icon={ArrowRight01Icon} className="size-3 rtl:rotate-180" />
                      <span>{e.to_status || e.toStatus || '—'}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-foreground text-xs">{e.reason || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};
