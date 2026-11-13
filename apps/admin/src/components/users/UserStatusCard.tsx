import React from 'react';

interface UserStatusCardProps {
  status: string;
  updating: boolean;
  onStatusChange: (status: string) => void;
}

export const UserStatusCard: React.FC<UserStatusCardProps> = ({
  status,
  updating,
  onStatusChange,
}) => {
  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 8px 0' }}>Account Status & Access Control</h2>
      <p style={{ color: '#64748B', fontSize: '13px', margin: '0 0 16px 0' }}>
        Changing status will immediately invalidate active device JWT sessions in Redis and reject downstream requests.
      </p>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={() => onStatusChange('ACTIVE')}
          disabled={updating || status === 'ACTIVE'}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #16A34A',
            backgroundColor: status === 'ACTIVE' ? '#16A34A' : '#FFFFFF',
            color: status === 'ACTIVE' ? '#FFFFFF' : '#16A34A',
            fontWeight: '600',
            cursor: updating ? 'not-allowed' : 'pointer',
          }}
        >
          Mark ACTIVE
        </button>

        <button
          onClick={() => onStatusChange('SUSPENDED')}
          disabled={updating || status === 'SUSPENDED'}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #D97706',
            backgroundColor: status === 'SUSPENDED' ? '#D97706' : '#FFFFFF',
            color: status === 'SUSPENDED' ? '#FFFFFF' : '#D97706',
            fontWeight: '600',
            cursor: updating ? 'not-allowed' : 'pointer',
          }}
        >
          SUSPEND (Temporary Lock)
        </button>

        <button
          onClick={() => onStatusChange('BLOCKED')}
          disabled={updating || status === 'BLOCKED'}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #DC2626',
            backgroundColor: status === 'BLOCKED' ? '#DC2626' : '#FFFFFF',
            color: status === 'BLOCKED' ? '#FFFFFF' : '#DC2626',
            fontWeight: '600',
            cursor: updating ? 'not-allowed' : 'pointer',
          }}
        >
          BLOCK (Permanent Revocation)
        </button>
      </div>
    </div>
  );
};
