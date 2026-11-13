import React from 'react';
import { MerchantApplicationSummary } from '@/lib/api-client';

interface MerchantOutletsListProps {
  merchant: MerchantApplicationSummary;
  outletUpdating: string | null;
  onUpdateStatus: (outletId: string, status: string) => void;
}

export const MerchantOutletsList: React.FC<MerchantOutletsListProps> = ({
  merchant,
  outletUpdating,
  onUpdateStatus,
}) => {
  const outlets = (merchant as any).outlets || [];

  return (
    <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0F172A', margin: '0 0 4px 0' }}>
            🏬 Registered Outlets & Branch Compliance
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
            Each branch outlet undergoes independent inspection and authorization. Primary activation does not auto-activate secondary branches.
          </p>
        </div>
        <span style={{ fontSize: '12px', fontWeight: '600', backgroundColor: '#F1F5F9', padding: '4px 8px', borderRadius: '6px' }}>
          {outlets.length > 0 ? outlets.length : (merchant.outlet_name ? 1 : 0)} Outlets
        </span>
      </div>

      {outlets.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {outlets.map((outlet: any) => {
            const status = outlet.outlet_status || 'PENDING_APPROVAL';
            const isUpdating = outletUpdating === outlet.id;

            return (
              <div
                key={outlet.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 18px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <strong style={{ fontSize: '15px', color: '#0F172A' }}>{outlet.outlet_name}</strong>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: status === 'ACTIVE' ? '#DCFCE7' : status === 'SUSPENDED' ? '#FEE2E2' : '#FEF3C7',
                        color: status === 'ACTIVE' ? '#15803D' : status === 'SUSPENDED' ? '#B91C1C' : '#B45309',
                      }}
                    >
                      {status}
                    </span>
                    <span style={{ fontSize: '12px', color: outlet.is_open ? '#15803D' : '#64748B' }}>
                      {outlet.is_open ? '● Duty: Open' : '○ Duty: Closed'}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                    {outlet.address_line1}, PIN: {outlet.postal_code}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {status !== 'ACTIVE' ? (
                    <button
                      onClick={() => onUpdateStatus(outlet.id, 'ACTIVE')}
                      disabled={isUpdating}
                      style={{
                        padding: '6px 14px',
                        backgroundColor: '#00C853',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: isUpdating ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isUpdating ? 'Updating...' : 'Approve Branch'}
                    </button>
                  ) : (
                    <button
                      onClick={() => onUpdateStatus(outlet.id, 'SUSPENDED')}
                      disabled={isUpdating}
                      style={{
                        padding: '6px 14px',
                        backgroundColor: '#64748B',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: isUpdating ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isUpdating ? 'Updating...' : 'Suspend Branch'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', color: '#64748B', fontSize: '14px' }}>
          Primary Outlet: {merchant.outlet_name || 'Main Store'} ({merchant.address_line1 || 'Registered Address'})
        </div>
      )}
    </div>
  );
};
