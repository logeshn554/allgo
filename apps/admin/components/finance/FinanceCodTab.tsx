'use client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@allgo/ui';
import { Button } from '@allgo/ui';
import { Badge } from '@allgo/ui';

interface FinanceCodTabProps {
  pendingCod: any[];
  handleReconcileCod: (id: string, adjustment?: number) => Promise<void>;
}

export function FinanceCodTab({ pendingCod, handleReconcileCod }: FinanceCodTabProps) {
  return (
    <div className="space-y-3">
      <div className="text-lg font-semibold tracking-tight">
        Pending COD Cash Handover Reconciliations
      </div>
      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reconciliation ID</TableHead>
              <TableHead>Partner Phone</TableHead>
              <TableHead>Expected (INR)</TableHead>
              <TableHead>Deposited (INR)</TableHead>
              <TableHead>Discrepancy</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingCod.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No pending COD reconciliation records.
                </TableCell>
              </TableRow>
            ) : (
              pendingCod.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.id.slice(0, 8)}...</TableCell>
                  <TableCell className="text-foreground">
                    {item.partner_phone || item.partner_id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">
                    ₹{Number.parseFloat(item.amount_expected_inr).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-foreground">
                    ₹{Number.parseFloat(item.amount_deposited_inr).toFixed(2)}
                  </TableCell>
                  <TableCell
                    className={`font-semibold ${Number.parseFloat(item.discrepancy_inr) !== 0 ? 'text-destructive' : 'text-primary'}`}
                  >
                    ₹{Number.parseFloat(item.discrepancy_inr).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.status}</Badge>
                  </TableCell>
                  <TableCell className="text-end">
                    <Button
                      size="sm"
                      onClick={() =>
                        handleReconcileCod(item.id, Number.parseFloat(item.discrepancy_inr))
                      }
                    >
                      Reconcile & Clear
                    </Button>
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
