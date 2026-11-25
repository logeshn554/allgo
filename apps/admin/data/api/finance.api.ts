import { adminFetch } from './base-client';
import { ProcessRefundDto } from '../types';

export class FinanceApi {
  async getFinancialDashboard(): Promise<any> {
    return adminFetch<any>('/v1/admin/finance/dashboard');
  }

  async searchLedger(query?: any): Promise<any[]> {
    const params = new URLSearchParams(query || {});
    return adminFetch<any[]>(`/v1/admin/finance/ledger?${params.toString()}`);
  }

  async generatePartnerSettlement(
    partnerId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<any> {
    return adminFetch<any>('/v1/admin/finance/settlements/partner/generate', {
      method: 'POST',
      body: JSON.stringify({ partnerId, periodStart, periodEnd }),
    });
  }

  async approvePartnerSettlement(id: string): Promise<any> {
    return adminFetch<any>(
      `/v1/admin/finance/settlements/partner/${encodeURIComponent(id)}/approve`,
      { method: 'POST' },
    );
  }

  async generateMerchantSettlement(
    merchantId: string,
    outletId?: string,
    periodStart?: string,
    periodEnd?: string,
  ): Promise<any> {
    return adminFetch<any>('/v1/admin/finance/settlements/merchant/generate', {
      method: 'POST',
      body: JSON.stringify({ merchantId, outletId, periodStart, periodEnd }),
    });
  }

  async approveMerchantSettlement(id: string): Promise<any> {
    return adminFetch<any>(
      `/v1/admin/finance/settlements/merchant/${encodeURIComponent(id)}/approve`,
      { method: 'POST' },
    );
  }

  async listPendingCod(): Promise<any[]> {
    return adminFetch<any[]>('/v1/admin/finance/cod/pending');
  }

  async reconcileCod(
    id: string,
    approvedAdjustmentInr?: number,
    notes?: string,
  ): Promise<any> {
    return adminFetch<any>(`/v1/admin/finance/cod/${encodeURIComponent(id)}/reconcile`, {
      method: 'POST',
      body: JSON.stringify({ approvedAdjustmentInr, notes }),
    });
  }

  async listPayouts(status?: string): Promise<any[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return adminFetch<any[]>(`/v1/admin/finance/payouts${query}`);
  }

  async processPayout(id: string): Promise<any> {
    return adminFetch<any>(`/v1/admin/finance/payouts/${encodeURIComponent(id)}/process`, {
      method: 'POST',
    });
  }

  async listPayments(status?: string): Promise<any[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return adminFetch<any[]>(`/v1/admin/finance/payments${query}`);
  }

  async listRefunds(status?: string): Promise<any[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return adminFetch<any[]>(`/v1/admin/finance/refunds${query}`);
  }

  async processRefund(body: ProcessRefundDto): Promise<any> {
    return adminFetch<any>('/v1/admin/finance/refunds/process', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}

export const financeApi = new FinanceApi();
