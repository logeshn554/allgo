import React from 'react';

interface DispatchStatsCardsProps {
  stats: any;
}

export const DispatchStatsCards: React.FC<DispatchStatsCardsProps> = ({ stats }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', marginBottom: '28px' }}>
      <div style={{ padding: '16px', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>PENDING DISPATCH</div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#D97706', marginTop: '6px' }}>
          {stats?.pendingJobs ?? 0}
        </div>
      </div>
      <div style={{ padding: '16px', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>PARTNER ASSIGNED</div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563EB', marginTop: '6px' }}>
          {stats?.assignedJobs ?? 0}
        </div>
      </div>
      <div style={{ padding: '16px', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>IN TRANSIT</div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#7C3AED', marginTop: '6px' }}>
          {stats?.inTransitJobs ?? 0}
        </div>
      </div>
      <div style={{ padding: '16px', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>DELIVERED TODAY</div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16A34A', marginTop: '6px' }}>
          {stats?.deliveredToday ?? 0}
        </div>
      </div>
      <div style={{ padding: '16px', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>ONLINE FLEET</div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0284C7', marginTop: '6px' }}>
          {stats?.onlinePartners ?? 0}
        </div>
      </div>
      <div style={{ padding: '16px', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>OPEN EXCEPTIONS</div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: (stats?.openExceptions ?? 0) > 0 ? '#DC2626' : '#16A34A', marginTop: '6px' }}>
          {stats?.openExceptions ?? 0}
        </div>
      </div>
    </div>
  );
};
