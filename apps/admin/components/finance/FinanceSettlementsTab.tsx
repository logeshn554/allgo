'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@allgo/ui';
import { Button } from '@allgo/ui';
import { Input } from '@allgo/ui';
import { Label } from '@allgo/ui';
import type React from 'react';

interface FinanceSettlementsTabProps {
  partnerIdInput: string;
  setPartnerIdInput: (id: string) => void;
  merchantIdInput: string;
  setMerchantIdInput: (id: string) => void;
  settlementResult: any;
  handleGeneratePartnerSettlement: (e: React.FormEvent) => Promise<void>;
  handleGenerateMerchantSettlement: (e: React.FormEvent) => Promise<void>;
  handleApprovePartnerSettlement: (id: string) => Promise<void>;
  handleApproveMerchantSettlement: (id: string) => Promise<void>;
}

export function FinanceSettlementsTab({
  partnerIdInput,
  setPartnerIdInput,
  merchantIdInput,
  setMerchantIdInput,
  settlementResult,
  handleGeneratePartnerSettlement,
  handleGenerateMerchantSettlement,
  handleApprovePartnerSettlement,
  handleApproveMerchantSettlement,
}: FinanceSettlementsTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generate Partner Settlement</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGeneratePartnerSettlement} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Partner UUID</Label>
                <Input
                  type="text"
                  value={partnerIdInput}
                  onChange={(e) => setPartnerIdInput(e.target.value)}
                  placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                  required
                />
              </div>
              <Button type="submit">Generate Partner Statement</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generate Merchant Settlement</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerateMerchantSettlement} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Merchant UUID</Label>
                <Input
                  type="text"
                  value={merchantIdInput}
                  onChange={(e) => setMerchantIdInput(e.target.value)}
                  placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                  required
                />
              </div>
              <Button type="submit" variant="secondary">
                Generate Merchant Statement
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {settlementResult && (
        <Card className="bg-muted">
          <CardHeader>
            <CardTitle className="text-sm">Newly Generated Settlement Statement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="text-xs bg-background p-3 rounded border border-border overflow-x-auto">
              {JSON.stringify(settlementResult, null, 2)}
            </pre>
            <Button
              onClick={() => {
                if (settlementResult.partner_id) {
                  handleApprovePartnerSettlement(settlementResult.id);
                } else {
                  handleApproveMerchantSettlement(settlementResult.id);
                }
              }}
            >
              Approve Statement & Schedule Payout
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
