'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@allgo/ui';
import { Button } from '@allgo/ui';
import { Input } from '@allgo/ui';
import { Badge } from '@allgo/ui';
import { Label } from '@allgo/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@allgo/ui';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@allgo/ui';
import type React from 'react';

const REFUND_DESTINATION_ITEMS = {
  WALLET: 'Customer Wallet',
  ORIGINAL_METHOD: 'Original Payment Method',
};

interface FinanceRefundsTabProps {
  refundPaymentId: string;
  setRefundPaymentId: (id: string) => void;
  refundAmount: string;
  setRefundAmount: (amt: string) => void;
  refundDestination: 'WALLET' | 'ORIGINAL_METHOD';
  setRefundDestination: (d: 'WALLET' | 'ORIGINAL_METHOD') => void;
  refundReason: string;
  setRefundReason: (r: string) => void;
  handleProcessRefund: (e: React.FormEvent) => Promise<void>;
  payments: any[];
  refunds: any[];
}

export function FinanceRefundsTab({
  refundPaymentId,
  setRefundPaymentId,
  refundAmount,
  setRefundAmount,
  refundDestination,
  setRefundDestination,
  refundReason,
  setRefundReason,
  handleProcessRefund,
  payments,
  refunds,
}: FinanceRefundsTabProps) {
  return (
    <div className="space-y-6">
      {/* Issue Refund Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Process Customer Refund</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleProcessRefund}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Payment ID</Label>
              <Input
                type="text"
                value={refundPaymentId}
                onChange={(e) => setRefundPaymentId(e.target.value)}
                placeholder="UUID or Payment Ref"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Refund Amount (INR)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="e.g. 150.00"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Destination</Label>
              <Select
                value={refundDestination}
                items={REFUND_DESTINATION_ITEMS}
                onValueChange={(val) => setRefundDestination((val as any) ?? 'WALLET')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Destination" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="WALLET">Customer Wallet</SelectItem>
                    <SelectItem value="ORIGINAL_METHOD">Original Payment Method</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Reason</Label>
              <Input
                type="text"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Order cancelled"
                required
              />
            </div>
            <div>
              <Button type="submit" variant="destructive" className="w-full">
                Submit Refund
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <div className="space-y-3">
        <div className="text-lg font-semibold tracking-tight">Recent Payment Transactions</div>
        <div className="overflow-hidden rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment ID</TableHead>
                <TableHead>Order Group</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                    No payment transactions recorded.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((pm) => (
                  <TableRow key={pm.id}>
                    <TableCell className="font-mono text-xs">{pm.id?.slice(0, 8)}...</TableCell>
                    <TableCell className="font-mono text-xs">
                      {pm.order_group_id ? `${pm.order_group_id.slice(0, 8)}...` : 'N/A'}
                    </TableCell>
                    <TableCell className="text-foreground">{pm.payment_method}</TableCell>
                    <TableCell className="font-semibold text-foreground">
                      ₹{Number.parseFloat(pm.amount_inr || '0').toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          pm.status === 'CAPTURED'
                            ? 'default'
                            : pm.status === 'FAILED'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {pm.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {pm.created_at ? new Date(pm.created_at).toLocaleDateString() : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Refunds Table */}
      <div className="space-y-3">
        <div className="text-lg font-semibold tracking-tight">Processed Refunds</div>
        <div className="overflow-hidden rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Refund ID</TableHead>
                <TableHead>Payment ID</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {refunds.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                    No refund records found.
                  </TableCell>
                </TableRow>
              ) : (
                refunds.map((rf) => (
                  <TableRow key={rf.id}>
                    <TableCell className="font-mono text-xs">{rf.id?.slice(0, 8)}...</TableCell>
                    <TableCell className="font-mono text-xs">
                      {rf.payment_id?.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="text-foreground">{rf.destination}</TableCell>
                    <TableCell className="font-semibold text-destructive">
                      ₹{Number.parseFloat(rf.amount_inr || '0').toFixed(2)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{rf.reason}</TableCell>
                    <TableCell>
                      <Badge variant={rf.status === 'PROCESSED' ? 'default' : 'secondary'}>
                        {rf.status}
                      </Badge>
                    </TableCell>
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
