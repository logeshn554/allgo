import { API_BASE, getAdminHeaders } from './base-client';
import { ProcessRefundDto } from '../types';

export class FinanceApi {
  async getFinancialDashboard(): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/finance/dashboard`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to get financial dashboard');
    return data;
  }

  async searchLedger(query?: any): Promise<any[]> {
    const params = new URLSearchParams(query || {});
    const res = await fetch(`${API_BASE}/v1/admin/finance/ledger?${params.toString()}`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to search ledger');
    return data;
  }

  async generatePartnerSettlement(partnerId: string, periodStart: string, periodEnd: string): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/finance/settlements/partner/generate`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ partnerId, periodStart, periodEnd }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to generate partner settlement');
    return data;
  }

  async approvePartnerSettlement(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/finance/settlements/partner/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to approve partner settlement');
    return data;
  }

  async generateMerchantSettlement(merchantId: string, outletId?: string, periodStart?: string, periodEnd?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/finance/settlements/merchant/generate`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ merchantId, outletId, periodStart, periodEnd }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to generate merchant settlement');
    return data;
  }

  async approveMerchantSettlement(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/finance/settlements/merchant/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to approve merchant settlement');
    return data;
  }

  async listPendingCod(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/v1/admin/finance/cod/pending`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to list pending COD');
    return data;
  }

  async reconcileCod(id: string, approvedAdjustmentInr?: number, notes?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/finance/cod/${encodeURIComponent(id)}/reconcile`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ approvedAdjustmentInr, notes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to reconcile COD');
    return data;
  }

  async listPayouts(status?: string): Promise<any[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const res = await fetch(`${API_BASE}/v1/admin/finance/payouts${query}`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to list payouts');
    return data;
  }

  async processPayout(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/finance/payouts/${encodeURIComponent(id)}/process`, {
      method: 'POST',
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to process payout');
    return data;
  }

  async listPayments(status?: string): Promise<any[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const res = await fetch(`${API_BASE}/v1/admin/finance/payments${query}`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to list payments');
    return data;
  }

  async listRefunds(status?: string): Promise<any[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const res = await fetch(`${API_BASE}/v1/admin/finance/refunds${query}`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to list refunds');
    return data;
  }

  async processRefund(body: ProcessRefundDto): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/finance/refunds/process`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to process refund');
    return data;
  }
}

export const financeApi = new FinanceApi();
