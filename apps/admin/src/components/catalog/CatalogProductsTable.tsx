import React from 'react';

export interface CatalogProduct {
  id: string;
  name: string;
  description?: string;
  categoryName?: string;
  businessName?: string;
  outletName?: string;
  basePriceInr: number;
  salePriceInr?: number;
  productStatus: string;
  adminStatus: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  isVeg: boolean;
  dietaryFlags: string[];
  stockQuantity: number;
  preparationTimeMinutes?: number;
  createdAt?: string;
}

interface CatalogProductsTableProps {
  products: CatalogProduct[];
  loading: boolean;
  onApprove: (p: CatalogProduct) => void;
  onOpenReject: (p: CatalogProduct) => void;
}

export const CatalogProductsTable: React.FC<CatalogProductsTableProps> = ({
  products,
  loading,
  onApprove,
  onOpenReject,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
        <thead>
          <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
            <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '600' }}>Item Details</th>
            <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '600' }}>Category & Merchant</th>
            <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '600' }}>Pricing</th>
            <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '600' }}>Dietary & Stock</th>
            <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '600' }}>Status</th>
            <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '600', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                Loading catalog products...
              </td>
            </tr>
          ) : products.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                No catalog products found matching filter criteria.
              </td>
            </tr>
          ) : (
            products.map((p) => {
              let statusBg = '#FEF3C7';
              let statusColor = '#B45309';
              let statusLabel = 'PENDING REVIEW';

              if (p.adminStatus === 'APPROVED') {
                statusBg = '#DCFCE7';
                statusColor = '#15803D';
                statusLabel = 'APPROVED';
              } else if (p.adminStatus === 'REJECTED') {
                statusBg = '#FEE2E2';
                statusColor = '#B91C1C';
                statusLabel = 'REJECTED';
              }

              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: p.isVeg ? '#16A34A' : '#78350F',
                        }}
                      />
                      <span style={{ fontWeight: '600', color: '#0F172A' }}>{p.name}</span>
                    </div>
                    {p.description && (
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', maxWidth: '240px' }}>
                        {p.description}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontWeight: '500', color: '#334155' }}>{p.categoryName || 'General'}</div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>{p.businessName || p.outletName || 'Outlet'}</div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontWeight: '600', color: '#0F172A' }}>
                      ₹{p.salePriceInr ? p.salePriceInr.toFixed(2) : p.basePriceInr.toFixed(2)}
                    </div>
                    {p.salePriceInr && p.salePriceInr < p.basePriceInr && (
                      <div style={{ fontSize: '12px', color: '#94A3B8', textDecoration: 'line-through' }}>
                        ₹{p.basePriceInr.toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontSize: '13px', color: '#334155' }}>Stock: {p.stockQuantity}</div>
                    {p.dietaryFlags && p.dietaryFlags.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                        {p.dietaryFlags.map((flag) => (
                          <span
                            key={flag}
                            style={{
                              fontSize: '10px',
                              padding: '2px 6px',
                              backgroundColor: '#F1F5F9',
                              borderRadius: '4px',
                              color: '#475569',
                              fontWeight: '500',
                            }}
                          >
                            {flag}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        backgroundColor: statusBg,
                        color: statusColor,
                      }}
                    >
                      {statusLabel}
                    </span>
                    {p.rejectionReason && (
                      <div style={{ fontSize: '11px', color: '#DC2626', marginTop: '4px', maxWidth: '180px' }}>
                        Reason: {p.rejectionReason}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      {p.adminStatus !== 'APPROVED' && (
                        <button
                          onClick={() => onApprove(p)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#10B981',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          Approve
                        </button>
                      )}
                      {p.adminStatus !== 'REJECTED' && (
                        <button
                          onClick={() => onOpenReject(p)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#EF4444',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
