import { adminFetch } from './base-client';

export class SupportApi {
  async listSupportTickets(status?: string, priority?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (priority) params.append('priority', priority);
    return adminFetch<any[]>(`/v1/admin/support/tickets?${params.toString()}`);
  }

  async getSupportTicket(id: string): Promise<any> {
    return adminFetch<any>(`/v1/support/tickets/${encodeURIComponent(id)}`);
  }

  async addSupportMessage(id: string, message: string, isInternal = false): Promise<any> {
    return adminFetch<any>(`/v1/support/tickets/${encodeURIComponent(id)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message, isInternal }),
    });
  }

  async assignSupportTicket(id: string, adminId?: string): Promise<any> {
    return adminFetch<any>(`/v1/admin/support/tickets/${encodeURIComponent(id)}/assign`, {
      method: 'POST',
      body: JSON.stringify({ adminId }),
    });
  }

  async updateSupportTicketStatus(
    id: string,
    status: string,
    resolutionNotes?: string,
    priority?: string,
  ): Promise<any> {
    return adminFetch<any>(`/v1/admin/support/tickets/${encodeURIComponent(id)}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, resolutionNotes, priority }),
    });
  }
}

export const supportApi = new SupportApi();
