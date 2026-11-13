import React from 'react';
import { StatusBadge } from '@/components/StatusBadge';

interface PartnerServicesApprovalProps {
  services: any[];
  submitting: boolean;
  onServiceStatus: (serviceType: string, newStatus: string) => void;
}

export const PartnerServicesApproval: React.FC<PartnerServicesApprovalProps> = ({
  services,
  submitting,
  onServiceStatus,
}) => {
  return (
    <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '24px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px 0', color: '#0F172A' }}>
        Independent Service Category Applications
      </h2>
      <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748B' }}>
        RULE: Each service application must be approved independently. Food delivery approval does not authorize bike taxi or cab rides.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {services.map((s: any) => (
          <div
            key={s.service_type}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 16px',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              backgroundColor: '#F8FAFC',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '15px' }}>{s.service_type.replace('_', ' ')}</div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                Current Status: <StatusBadge status={s.status} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={submitting || s.status === 'APPROVED'}
                onClick={() => onServiceStatus(s.service_type, 'APPROVED')}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Approve Service
              </button>
              <button
                disabled={submitting || s.status === 'REJECTED'}
                onClick={() => onServiceStatus(s.service_type, 'REJECTED')}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
