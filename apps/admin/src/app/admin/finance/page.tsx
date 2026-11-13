'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api-client';
import { FinanceOverviewTab } from '@/components/finance/FinanceOverviewTab';
import { FinanceLedgerTab } from '@/components/finance/FinanceLedgerTab';
import { FinanceSettlementsTab } from '@/components/finance/FinanceSettlementsTab';
import { FinanceCodTab } from '@/components/finance/FinanceCodTab';
import { FinancePayoutsTab } from '@/components/finance/FinancePayoutsTab';
import { FinanceRefundsTab } from '@/components/finance/FinanceRefundsTab';

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'settlements' | 'cod' | 'payouts' | 'payments'>('overview');
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [pendingCod, setPendingCod] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [partnerIdInput, setPartnerIdInput] = useState('');
  const [merchantIdInput, setMerchantIdInput] = useState('');
  const [settlementResult, setSettlementResult] = useState<any>(null);

  const [refundPaymentId, setRefundPaymentId] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundDestination, setRefundDestination] = useState<'WALLET' | 'ORIGINAL_METHOD'>('WALLET');
  const [refundReason, setRefundReason] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true); setError(null);
      const data = await adminApi.getFinancialDashboard();
      setDashboard(data);
      setLedgerEntries((await adminApi.searchLedger()) || []);
      setPendingCod((await adminApi.listPendingCod()) || []);
      setPayouts((await adminApi.listPayouts()) || []);
      setPayments((await adminApi.listPayments()) || []);
      setRefunds((await adminApi.listRefunds()) || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboardData(); }, []);

  const handleGeneratePartnerSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerIdInput) return;
    try {
      const now = new Date().toISOString();
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const res = await adminApi.generatePartnerSettlement(partnerIdInput, weekAgo, now);
      setSettlementResult(res);
      setActionSuccess(`Generated partner settlement statement for ${partnerIdInput}`);
      fetchDashboardData();
    } catch (err: any) { setError(err.message || 'Failed to generate partner settlement'); }
  };

  const handleApprovePartnerSettlement = async (id: string) => {
    try {
      await adminApi.approvePartnerSettlement(id);
      setActionSuccess(`Approved settlement #${id} and scheduled payout.`);
      fetchDashboardData();
    } catch (err: any) { setError(err.message || 'Failed to approve settlement'); }
  };

  const handleGenerateMerchantSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchantIdInput) return;
    try {
      const res = await adminApi.generateMerchantSettlement(merchantIdInput);
      setSettlementResult(res);
      setActionSuccess(`Generated merchant settlement statement for ${merchantIdInput}`);
      fetchDashboardData();
    } catch (err: any) { setError(err.message || 'Failed to generate merchant settlement'); }
  };

  const handleApproveMerchantSettlement = async (id: string) => {
    try {
      await adminApi.approveMerchantSettlement(id);
      setActionSuccess(`Approved merchant settlement #${id} and scheduled payout.`);
      fetchDashboardData();
    } catch (err: any) { setError(err.message || 'Failed to approve merchant settlement'); }
  };

  const handleReconcileCod = async (id: string, adjustment = 0) => {
    try {
      await adminApi.reconcileCod(id, adjustment, 'Admin verified cash handover');
      setActionSuccess(`Reconciled COD record #${id}`);
      fetchDashboardData();
    } catch (err: any) { setError(err.message || 'Failed to reconcile COD'); }
  };

  const handleProcessPayout = async (id: string) => {
    try {
      await adminApi.processPayout(id);
      setActionSuccess(`Processed payout #${id} successfully.`);
      fetchDashboardData();
    } catch (err: any) { setError(err.message || 'Failed to process payout'); }
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundPaymentId || !refundAmount || !refundReason) return;
    try {
      await adminApi.processRefund({ paymentId: refundPaymentId, amountInr: parseFloat(refundAmount), destination: refundDestination, reason: refundReason });
      setActionSuccess(`Processed refund of ₹${refundAmount} for payment #${refundPaymentId}`);
      setRefundPaymentId(''); setRefundAmount(''); setRefundReason('');
      fetchDashboardData();
    } catch (err: any) { setError(err.message || 'Failed to process refund'); }
  };

  if (loading && !dashboard) return <div style={{ padding: '24px' }}>Loading authoritative financial system data...</div>;

  const tabs = [
    { key: 'overview', label: 'Financial Dashboard' },
    { key: 'ledger', label: 'Double-Entry Ledger' },
    { key: 'settlements', label: 'Partner & Merchant Settlements' },
    { key: 'cod', label: 'COD Reconciliation' },
    { key: 'payouts', label: 'Payout Management' },
    { key: 'payments', label: 'Payments & Refunds' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0', color: '#0F172A' }}>
            Financial Management & Accounting
          </h1>
          <p style={{ margin: 0, color: '#64748B', fontSize: '14px' }}>
            Authoritative double-entry ledger, wallets, settlements, COD reconciliation, payments, and payouts.
          </p>
        </div>
        <button onClick={fetchDashboardData} style={{ padding: '8px 16px', backgroundColor: '#00C853', color: '#FFFFFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
          Refresh Financials
        </button>
      </div>

      {actionSuccess && <div style={{ backgroundColor: '#DCFCE7', border: '1px solid #16A34A', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', color: '#166534' }}>✓ {actionSuccess}</div>}
      {error && <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #EF4444', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', color: '#991B1B' }}>⚠ {error}</div>}

      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #E2E8F0', marginBottom: '24px' }}>
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => { setActiveTab(tab.key as any); setActionSuccess(null); setError(null); }}
            style={{ padding: '10px 18px', border: 'none', background: 'none', fontWeight: activeTab === tab.key ? 'bold' : 'normal', color: activeTab === tab.key ? '#00C853' : '#64748B', borderBottom: activeTab === tab.key ? '3px solid #00C853' : '3px solid transparent', cursor: 'pointer', fontSize: '14px' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <FinanceOverviewTab dashboard={dashboard} />}
      {activeTab === 'ledger' && <FinanceLedgerTab ledgerEntries={ledgerEntries} />}
      {activeTab === 'settlements' && (
        <FinanceSettlementsTab
          settlementResult={settlementResult}
          partnerIdInput={partnerIdInput} setPartnerIdInput={setPartnerIdInput}
          merchantIdInput={merchantIdInput} setMerchantIdInput={setMerchantIdInput}
          handleGeneratePartnerSettlement={handleGeneratePartnerSettlement}
          handleGenerateMerchantSettlement={handleGenerateMerchantSettlement}
          handleApprovePartnerSettlement={handleApprovePartnerSettlement}
          handleApproveMerchantSettlement={handleApproveMerchantSettlement}
        />
      )}
      {activeTab === 'cod' && <FinanceCodTab pendingCod={pendingCod} handleReconcileCod={handleReconcileCod} />}
      {activeTab === 'payouts' && <FinancePayoutsTab payouts={payouts} handleProcessPayout={handleProcessPayout} />}
      {activeTab === 'payments' && (
        <FinanceRefundsTab
          payments={payments} refunds={refunds}
          refundPaymentId={refundPaymentId} setRefundPaymentId={setRefundPaymentId}
          refundAmount={refundAmount} setRefundAmount={setRefundAmount}
          refundDestination={refundDestination} setRefundDestination={setRefundDestination}
          refundReason={refundReason} setRefundReason={setRefundReason}
          handleProcessRefund={handleProcessRefund}
        />
      )}
    </div>
  );
}
