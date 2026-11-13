import React from 'react';

interface ParcelStatsCardsProps {
  stats: any;
  totalCount: number;
}

export const ParcelStatsCards: React.FC<ParcelStatsCardsProps> = ({ stats, totalCount }) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '28px',
      }}
    >
      <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: '13px', color: '#64748B', fontWeight: '600' }}>TOTAL BOOKINGS</div>
        <div style={{ fontSize: '28px', fontWeight: '800', color: '#0F172A', marginTop: '8px' }}>
          {stats.total || totalCount}
        </div>
        <div style={{ fontSize: '12px', color: '#10B981', marginTop: '4px' }}>Across all service tiers</div>
      </div>

      <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: '13px', color: '#64748B', fontWeight: '600' }}>IN DISPATCH / TRANSIT</div>
        <div style={{ fontSize: '28px', fontWeight: '800', color: '#0284C7', marginTop: '8px' }}>
          {stats.inTransit || 0}
        </div>
        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Active couriers on road</div>
      </div>

      <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: '13px', color: '#64748B', fontWeight: '600' }}>COMPLETED / DELIVERED</div>
        <div style={{ fontSize: '28px', fontWeight: '800', color: '#10B981', marginTop: '8px' }}>
          {stats.delivered || 0}
        </div>
        <div style={{ fontSize: '12px', color: '#10B981', marginTop: '4px' }}>Dual OTP verified</div>
      </div>

      <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: '13px', color: '#64748B', fontWeight: '600' }}>EXCEPTIONS & RETURNS</div>
        <div style={{ fontSize: '28px', fontWeight: '800', color: '#EF4444', marginTop: '8px' }}>
          {stats.failedOrReturned || 0}
        </div>
        <div style={{ fontSize: '12px', color: '#EF4444', marginTop: '4px' }}>Return to sender / disputed</div>
      </div>
    </div>
  );
};
