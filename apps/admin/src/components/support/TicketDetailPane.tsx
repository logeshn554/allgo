'use client';
import React from 'react';

export interface TicketDetailPaneProps {
  selectedTicket: any;
  messages: any[];
  replyText: string;
  setReplyText: (val: string) => void;
  isInternalNote: boolean;
  setIsInternalNote: (val: boolean) => void;
  onClose: () => void;
  onUpdateStatus: (status: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
}

export function TicketDetailPane({
  selectedTicket,
  messages,
  replyText,
  setReplyText,
  isInternalNote,
  setIsInternalNote,
  onClose,
  onUpdateStatus,
  onSendMessage,
}: TicketDetailPaneProps) {
  return (
    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px 0' }}>{selectedTicket.subject}</h2>
          <div style={{ fontSize: '12px', color: '#64748B' }}>
            From: {selectedTicket.creator_name || selectedTicket.creator_phone} ({selectedTicket.creator_role})
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#64748B' }}>✕</button>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <button onClick={() => onUpdateStatus('IN_PROGRESS')} style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', cursor: 'pointer' }}>Set IN_PROGRESS</button>
        <button onClick={() => onUpdateStatus('ESCALATED')} style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '4px', border: 'none', backgroundColor: '#FEE2E2', color: '#991B1B', fontWeight: 'bold', cursor: 'pointer' }}>Escalate Dispute</button>
        <button onClick={() => onUpdateStatus('RESOLVED')} style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '4px', border: 'none', backgroundColor: '#DCFCE7', color: '#166534', fontWeight: 'bold', cursor: 'pointer' }}>Mark RESOLVED</button>
        <button onClick={() => onUpdateStatus('CLOSED')} style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '4px', border: '1px solid #94A3B8', backgroundColor: '#F1F5F9', color: '#475569', cursor: 'pointer' }}>Close Ticket</button>
      </div>
      <div style={{ flex: 1, maxHeight: '350px', overflowY: 'auto', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.map((m) => (
          <div key={m.id} style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: m.is_internal ? '#FEF3C7' : m.sender_role === 'ADMIN' ? '#EFF6FF' : '#F1F5F9', border: m.is_internal ? '1px solid #F59E0B' : '1px solid #E2E8F0', alignSelf: m.sender_role === 'ADMIN' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: m.is_internal ? '#B45309' : '#475569' }}>
              {m.is_internal ? '🔒 INTERNAL ADMIN NOTE (Private)' : `${m.sender_name || m.sender_role}`} • {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ fontSize: '13px', color: '#0F172A', whiteSpace: 'pre-wrap' }}>{m.message}</div>
          </div>
        ))}
      </div>
      <form onSubmit={onSendMessage} style={{ borderTop: '1px solid #E2E8F0', paddingTop: '12px' }}>
        <div style={{ marginBottom: '8px' }}>
          <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder={isInternalNote ? 'Add internal note (visible ONLY to admins)...' : 'Write reply to customer/partner...'} rows={3} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: isInternalNote ? '2px solid #F59E0B' : '1px solid #CBD5E1', fontSize: '13px' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#B45309', fontWeight: 'bold' }}>
            <input type="checkbox" checked={isInternalNote} onChange={(e) => setIsInternalNote(e.target.checked)} />
            Mark as Internal Note (Never visible to customer)
          </label>
          <button type="submit" style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', backgroundColor: isInternalNote ? '#D97706' : '#00C853', color: '#FFFFFF', fontWeight: 'bold', cursor: 'pointer' }}>
            {isInternalNote ? 'Add Note' : 'Send Reply'}
          </button>
        </div>
      </form>
    </div>
  );
}
