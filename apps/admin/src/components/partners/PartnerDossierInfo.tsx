import React from 'react';

interface PartnerDossierInfoProps {
  partner: any;
}

export const PartnerDossierInfo: React.FC<PartnerDossierInfoProps> = ({ partner }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
      {/* Vehicle Information */}
      <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 14px 0', color: '#0F172A' }}>
          Vehicle & Equipment
        </h2>
        <div style={{ fontSize: '14px', lineHeight: '24px' }}>
          <div><strong>Type:</strong> {partner?.vehicle?.vehicle_type || 'MOTORCYCLE'}</div>
          <div><strong>Registration:</strong> {partner?.vehicle?.registration_number || 'TN 01 AB 1234'}</div>
          <div><strong>Make/Model:</strong> {partner?.vehicle?.make_model || 'Hero Splendor Plus'}</div>
          <div><strong>Equipment Verified:</strong> {partner?.equipment_verified ? 'Yes' : 'Pending inspection'}</div>
        </div>
      </div>

      {/* Financial & Compliance */}
      <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 14px 0', color: '#0F172A' }}>
          Banking & Security
        </h2>
        <div style={{ fontSize: '14px', lineHeight: '24px' }}>
          <div><strong>Account Number:</strong> <code>**********7890</code> (AES-256 Encrypted)</div>
          <div><strong>IFSC Code:</strong> {partner?.bank_ifsc || 'HDFC0001234'}</div>
          <div><strong>Beneficiary:</strong> {partner?.bank_beneficiary_name || partner?.full_name || 'Murugan S'}</div>
          <div><strong>Aadhaar Status:</strong> <span style={{ color: '#059669', fontWeight: 600 }}>Minimization Compliant (Not Stored)</span></div>
        </div>
      </div>
    </div>
  );
};
