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

interface FinancePayoutsTabProps {
  payouts: any[];
  handleProcessPayout: (id: string) => Promise<void>;
}

export function FinancePayoutsTab({ payouts, handleProcessPayout }: FinancePayoutsTabProps) {
  return (
    <div className="space-y-3">
      <div className="text-lg font-semibold tracking-tight">RazorpayX Payouts Console</div>
      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payout ID</TableHead>
              <TableHead>Recipient Type</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Net Amount</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-end">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payouts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No payout records found.
                </TableCell>
              </TableRow>
            ) : (
              payouts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.id.slice(0, 8)}...</TableCell>
                  <TableCell className="font-semibold text-foreground">{p.recipient_type}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{p.payout_channel}</TableCell>
                  <TableCell className="font-semibold text-foreground">₹{parseFloat(p.net_amount_inr).toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{p.destination_reference || 'UPI Verified'}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        p.status === 'SUCCESS'
                          ? 'default'
                          : p.status === 'FAILED'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-end">
                    {p.status === 'SCHEDULED' && (
                      <Button
                        size="sm"
                        onClick={() => handleProcessPayout(p.id)}
                      >
                        Execute Payout
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
