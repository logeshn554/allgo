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

interface FinanceLedgerTabProps {
  ledgerEntries: any[];
}

export function FinanceLedgerTab({ ledgerEntries }: FinanceLedgerTabProps) {
  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        Showing latest immutable double-entry ledger entries from PostgreSQL authoritative source of truth.
      </div>
      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entry ID</TableHead>
              <TableHead>Tx Reference</TableHead>
              <TableHead>Account Type</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead>Amount (INR)</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ledgerEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No ledger entries found.
                </TableCell>
              </TableRow>
            ) : (
              ledgerEntries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.id.slice(0, 8)}...</TableCell>
                  <TableCell className="font-medium text-foreground">{e.transaction_reference}</TableCell>
                  <TableCell className="text-muted-foreground">{e.account_type}</TableCell>
                  <TableCell>
                    <Badge variant={e.direction === 'DEBIT' ? 'destructive' : 'default'}>
                      {e.direction}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">
                    ₹{parseFloat(e.amount_inr).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{e.description}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{new Date(e.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
