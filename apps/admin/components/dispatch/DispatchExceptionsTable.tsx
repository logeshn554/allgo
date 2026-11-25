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

interface DispatchExceptionsTableProps {
  exceptions: any[];
  onOpenResolve?: (exId: string) => void;
}

export const DispatchExceptionsTable: React.FC<DispatchExceptionsTableProps> = ({ exceptions }) => {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Exception ID</TableHead>
              <TableHead>Job #</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Partner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Recorded</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exceptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No delivery exceptions reported. Operations running cleanly.
                </TableCell>
              </TableRow>
            ) : (
              exceptions.map((ex) => (
                <TableRow key={ex.id}>
                  <TableCell className="font-mono text-xs">{ex.id.substring(0, 8)}...</TableCell>
                  <TableCell className="font-semibold text-foreground">{ex.job_number}</TableCell>
                  <TableCell>
                    <Badge variant="destructive" className="bg-destructive/15 text-destructive border-destructive/20">
                      {ex.exception_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{ex.details}</TableCell>
                  <TableCell className="text-muted-foreground">{ex.partner_name || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={ex.status === 'OPEN' ? 'secondary' : 'default'}>
                      {ex.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(ex.created_at).toLocaleTimeString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
    </div>
  );
};
