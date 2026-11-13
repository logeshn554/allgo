import React from 'react';
import { MerchantApplicationSummary } from '@/lib/api-client';

interface MerchantInfoCardsProps {
  merchant: MerchantApplicationSummary;
}

export const MerchantInfoCards: React.FC<MerchantInfoCardsProps> = ({ merchant }) => {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Business & Owner Info */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px', marginBottom: '14px' }}>
            🏪 Business & Category Details
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
            <div>
              <span style={{ color: '#64748B' }}>Commercial Category:</span>{' '}
              <strong>{merchant.merchant_type}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>Trade Name:</span>{' '}
              <span>{merchant.trade_name || merchant.business_name}</span>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>Platform Commission:</span>{' '}
              <strong>{merchant.commission_rate_percentage || 15.0}%</strong>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>Registered On:</span>{' '}
              <span>{new Date(merchant.created_at).toLocaleString()}</span>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>Owner Phone:</span>{' '}
              <strong>{merchant.owner_phone || 'N/A'}</strong>
            </div>
          </div>
        </div>

        {/* Regulatory & Compliance Documents */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px', marginBottom: '14px' }}>
            📑 Compliance & Tax Documents
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
            <div>
              <span style={{ color: '#64748B' }}>Permanent Account Number (PAN):</span>{' '}
              <strong style={{ fontFamily: 'monospace', letterSpacing: '1px' }}>{merchant.pan_number || 'NOT_SUBMITTED'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>FSSAI Food License Number:</span>{' '}
              <strong style={{ color: merchant.fssai_license_number ? '#00C853' : '#64748B' }}>
                {merchant.fssai_license_number ? `✓ ${merchant.fssai_license_number}` : 'Exempt / Not Submitted'}
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>GSTIN Number:</span>{' '}
              <strong style={{ fontFamily: 'monospace' }}>{merchant.gstin || 'Unregistered / Home Food'}</strong>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
        {/* Bank Details */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px', marginBottom: '14px' }}>
            💳 Bank Settlement Account
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
            <div>
              <span style={{ color: '#64748B' }}>Beneficiary Name:</span>{' '}
              <strong>{merchant.bank_beneficiary_name || 'N/A'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>Account Number:</span>{' '}
              <span style={{ fontFamily: 'monospace' }}>
                {merchant.bank_account_number
                  ? `•••• •••• •••• ${merchant.bank_account_number.slice(-4)}`
                  : 'N/A'}
              </span>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>IFSC Code:</span>{' '}
              <strong style={{ fontFamily: 'monospace' }}>{merchant.bank_ifsc || 'N/A'}</strong>
            </div>
          </div>
        </div>

        {/* Primary Outlet */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px', marginBottom: '14px' }}>
            📍 Primary Outlet Location
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
            <div>
              <span style={{ color: '#64748B' }}>Outlet Name:</span>{' '}
              <strong>{merchant.outlet_name || 'Primary Outlet'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>Address:</span>{' '}
              <span>{merchant.address_line1 || 'N/A'}, PIN: {merchant.postal_code || 'N/A'}</span>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>Operational Duty:</span>{' '}
              <strong style={{ color: merchant.is_open ? '#00C853' : '#64748B' }}>
                {merchant.is_open ? 'OPEN FOR ORDERS' : 'STORE CLOSED'}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
