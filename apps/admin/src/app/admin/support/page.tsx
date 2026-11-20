'use client';
import React, { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api-client';
import { TicketDetailPane } from '@/components/support/TicketDetailPane';
export default function SupportAdminPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.listSupportTickets(statusFilter || undefined);
      setTickets(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);
  const handleSelectTicket = async (id: string) => {
    try {
      setError(null);
      const res = await adminApi.getSupportTicket(id);
      setSelectedTicket(res.ticket);
      setMessages(res.messages || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load ticket details');
    }
  };
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;
    try {
      await adminApi.addSupportMessage(selectedTicket.id, replyText, isInternalNote);
      setReplyText('');
      setIsInternalNote(false);
      setActionSuccess(isInternalNote ? 'Internal note added.' : 'Customer reply sent.');
      handleSelectTicket(selectedTicket.id);
      fetchTickets();
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    }
  };
  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedTicket) return;
    try {
      await adminApi.updateSupportTicketStatus(selectedTicket.id, newStatus);
      setActionSuccess(`Ticket status updated to ${newStatus}`);
      handleSelectTicket(selectedTicket.id);
      fetchTickets();
    } catch (err: any) {
      setError(err.message || 'Failed to update ticket status');
    }
  };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0', color: '#0F172A' }}>
            Customer Support & Dispute Escalations
          </h1>
          <p style={{ margin: 0, color: '#64748B', fontSize: '14px' }}>
            Manage in-app support requests across food, grocery, parcel, mobility, and partner issues.
          </p>
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', fontSize: '14px' }}
          >
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="WAITING_FOR_CUSTOMER">WAITING_FOR_CUSTOMER</option>
            <option value="ESCALATED">ESCALATED</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </div>
      </div>
      {actionSuccess && (
        <div style={{ backgroundColor: '#DCFCE7', border: '1px solid #16A34A', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', color: '#166534' }}>
          ✓ {actionSuccess}
        </div>
      )}
      {error && (
        <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #EF4444', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', color: '#991B1B' }}>
          ⚠ {error}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: selectedTicket ? '1fr 1fr' : '1fr', gap: '24px' }}>
        {/* TICKET QUEUE */}
        <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>Ticket Queue ({tickets.length})</h2>
          {loading ? (
            <p style={{ color: '#64748B' }}>Loading tickets...</p>
          ) : tickets.length === 0 ? (
            <p style={{ color: '#94A3B8' }}>No tickets found matching the selected filter.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {tickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleSelectTicket(t.id)}
                  style={{
                    padding: '12px',
                    borderRadius: '6px',
                    border: selectedTicket?.id === t.id ? '2px solid #00C853' : '1px solid #E2E8F0',
                    backgroundColor: selectedTicket?.id === t.id ? '#F0FDF4' : '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#0F172A' }}>{t.subject}</span>
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      backgroundColor: t.status === 'RESOLVED' ? '#DCFCE7' : t.status === 'ESCALATED' ? '#FEE2E2' : '#FEF3C7',
                      color: t.status === 'RESOLVED' ? '#166534' : t.status === 'ESCALATED' ? '#991B1B' : '#92400E',
                    }}>
                      {t.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>
                    Category: <b>{t.category}</b> | Priority: <b>{t.priority}</b> | Role: <b>{t.creator_role}</b>
                  </div>
                  <div style={{ fontSize: '12px', color: '#334155' }}>
                    User: {t.user_name || t.user_phone} ({new Date(t.created_at).toLocaleDateString()})
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {selectedTicket && (
          <TicketDetailPane
            selectedTicket={selectedTicket}
            messages={messages}
            replyText={replyText}
            setReplyText={setReplyText}
            isInternalNote={isInternalNote}
            setIsInternalNote={setIsInternalNote}
            onClose={() => setSelectedTicket(null)}
            onUpdateStatus={handleUpdateStatus}
            onSendMessage={handleSendMessage}
          />
        )}
      </div>
    </div>
  );
}