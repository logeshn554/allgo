'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api-client';
import { FinanceOverviewTab } from '@/components/finance/FinanceOverviewTab';
import { FinanceLedgerTab } from '@/components/finance/FinanceLedgerTab';
import { FinanceSettlementsTab } from '@/components/finance/FinanceSettlementsTab';
import { FinanceCodTab } from '@/components/finance/FinanceCodTab';
import { FinancePayoutsTab } from '@/components/finance/FinancePayoutsTab';
import { FinanceRefundsTab } from '@/components/finance/FinanceRefundsTab';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@allgo/ui';
import { Button } from '@allgo/ui';

export default function FinanceDashboardPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [pendingCod, setPendingCod] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'settlements' | 'cod' | 'payouts' | 'payments'>('overview');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Settlement Form State
  const [partnerIdInput, setPartnerIdInput] = useState('');
  const [merchantIdInput, setMerchantIdInput] = useState('');
  const [settlementResult, setSettlementResult] = useState<any>(null);

  // Refund Form State
  const [refundPaymentId, setRefundPaymentId] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundDestination, setRefundDestination] = useState<'WALLET' | 'ORIGINAL_METHOD'>('WALLET');
  const [refundReason, setRefundReason] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [dash, ledger, cod, pouts, pmts, rfnds] = await Promise.all([
        adminApi.getFinanceDashboard().catch(() => null),
        adminApi.getLedgerEntries().catch(() => []),
        adminApi.getPendingCod().catch(() => []),
        adminApi.getPayouts().catch(() => []),
        adminApi.getPayments().catch(() => []),
        adminApi.getRefunds().catch(() => []),
      ]);

      if (dash) setDashboard(dash);
      setLedgerEntries(ledger || []);
      setPendingCod(cod || []);
      setPayouts(pouts || []);
      setPayments(pmts || []);
      setRefunds(rfnds || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load financial records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleGeneratePartnerSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerIdInput) return;
    try {
      const res = await adminApi.generatePartnerSettlement(partnerIdInput);
      setSettlementResult(res);
      setActionSuccess('Partner settlement statement generated successfully.');
    } catch (err: any) {
      setError(err?.message || 'Failed to generate partner settlement');
    }
  };

  const handleGenerateMerchantSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchantIdInput) return;
    try {
      const res = await adminApi.generateMerchantSettlement(merchantIdInput);
      setSettlementResult(res);
      setActionSuccess('Merchant settlement statement generated successfully.');
    } catch (err: any) {
      setError(err?.message || 'Failed to generate merchant settlement');
    }
  };

  const handleApprovePartnerSettlement = async (id: string) => {
    try {
      await adminApi.approvePartnerSettlement(id);
      setActionSuccess('Partner settlement approved and payout scheduled.');
      setSettlementResult(null);
      fetchDashboardData();
    } catch (err: any) {
      setError(err?.message || 'Failed to approve partner settlement');
    }
  };

  const handleApproveMerchantSettlement = async (id: string) => {
    try {
      await adminApi.approveMerchantSettlement(id);
      setActionSuccess('Merchant settlement approved and payout scheduled.');
      setSettlementResult(null);
      fetchDashboardData();
    } catch (err: any) {
      setError(err?.message || 'Failed to approve merchant settlement');
    }
  };

  const handleReconcileCod = async (id: string, adjustment?: number) => {
    try {
      await adminApi.reconcileCod(id, adjustment);
      setActionSuccess('COD handover reconciled successfully.');
      fetchDashboardData();
    } catch (err: any) {
      setError(err?.message || 'Failed to reconcile COD');
    }
  };

  const handleProcessPayout = async (id: string) => {
    try {
      await adminApi.processPayout(id);
      setActionSuccess('Payout submitted to payment gateway.');
      fetchDashboardData();
    } catch (err: any) {
      setError(err?.message || 'Failed to process payout');
    }
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.processRefund({
        paymentId: refundPaymentId,
        amountInr: parseFloat(refundAmount),
        destination: refundDestination,
        reason: refundReason,
      });
      setActionSuccess('Customer refund successfully executed.');
      setRefundPaymentId('');
      setRefundAmount('');
      setRefundReason('');
      fetchDashboardData();
    } catch (err: any) {
      setError(err?.message || 'Failed to process refund');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Financial Management & Accounting
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Authoritative double-entry ledger, wallets, settlements, COD reconciliation, payments, and payouts.
          </p>
        </div>
        <Button onClick={fetchDashboardData}>
          Refresh Financials
        </Button>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-lg bg-primary/10 text-primary border border-primary/20 text-sm">
          Success: {actionSuccess}
        </div>
      )}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-sm">
          Error: {error}
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v as any);
          setActionSuccess(null);
          setError(null);
        }}
        className="space-y-4"
      >
        <TabsList variant="line">
          <TabsTrigger value="overview">Financial Dashboard</TabsTrigger>
          <TabsTrigger value="ledger">Double-Entry Ledger</TabsTrigger>
          <TabsTrigger value="settlements">Settlements</TabsTrigger>
          <TabsTrigger value="cod">COD Reconciliation</TabsTrigger>
          <TabsTrigger value="payouts">Payout Management</TabsTrigger>
          <TabsTrigger value="payments">Payments & Refunds</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <FinanceOverviewTab dashboard={dashboard} />
        </TabsContent>
        <TabsContent value="ledger">
          <FinanceLedgerTab ledgerEntries={ledgerEntries} />
        </TabsContent>
        <TabsContent value="settlements">
          <FinanceSettlementsTab
            settlementResult={settlementResult}
            partnerIdInput={partnerIdInput} setPartnerIdInput={setPartnerIdInput}
            merchantIdInput={merchantIdInput} setMerchantIdInput={setMerchantIdInput}
            handleGeneratePartnerSettlement={handleGeneratePartnerSettlement}
            handleGenerateMerchantSettlement={handleGenerateMerchantSettlement}
            handleApprovePartnerSettlement={handleApprovePartnerSettlement}
            handleApproveMerchantSettlement={handleApproveMerchantSettlement}
          />
        </TabsContent>
        <TabsContent value="cod">
          <FinanceCodTab pendingCod={pendingCod} handleReconcileCod={handleReconcileCod} />
        </TabsContent>
        <TabsContent value="payouts">
          <FinancePayoutsTab payouts={payouts} handleProcessPayout={handleProcessPayout} />
        </TabsContent>
        <TabsContent value="payments">
          <FinanceRefundsTab
            payments={payments} refunds={refunds}
            refundPaymentId={refundPaymentId} setRefundPaymentId={setRefundPaymentId}
            refundAmount={refundAmount} setRefundAmount={setRefundAmount}
            refundDestination={refundDestination} setRefundDestination={setRefundDestination}
            refundReason={refundReason} setRefundReason={setRefundReason}
            handleProcessRefund={handleProcessRefund}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
