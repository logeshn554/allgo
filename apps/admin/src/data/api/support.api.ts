import { API_BASE, getAdminHeaders } from './base-client';

export class SupportApi {
  async listSupportTickets(status?: string, priority?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (priority) params.append('priority', priority);
    const res = await fetch(`${API_BASE}/v1/admin/support/tickets?${params.toString()}`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to list support tickets');
    return data;
  }

  async getSupportTicket(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/support/tickets/${encodeURIComponent(id)}`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch support ticket details');
    return data;
  }

  async addSupportMessage(id: string, message: string, isInternal = false): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/support/tickets/${encodeURIComponent(id)}/messages`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ message, isInternal }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to post ticket message');
    return data;
  }

  async assignSupportTicket(id: string, adminId?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/support/tickets/${encodeURIComponent(id)}/assign`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ adminId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to assign support ticket');
    return data;
  }

  async updateSupportTicketStatus(id: string, status: string, resolutionNotes?: string, priority?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/support/tickets/${encodeURIComponent(id)}/status`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ status, resolutionNotes, priority }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update ticket status');
    return data;
  }
}

export const supportApi = new SupportApi();
