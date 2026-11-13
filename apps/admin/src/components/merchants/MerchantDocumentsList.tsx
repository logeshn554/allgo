import React from 'react';
import { MerchantApplicationSummary } from '@/lib/api-client';

interface MerchantDocumentsListProps {
  merchant: MerchantApplicationSummary;
}

export const MerchantDocumentsList: React.FC<MerchantDocumentsListProps> = ({ merchant }) => {
  const documents = (merchant as any).documents || [];

  return (
    <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0F172A', marginBottom: '14px' }}>
        📄 KYC & Regulatory Documents
      </h2>
      {documents.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {documents.map((doc: any) => (
            <div
              key={doc.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '14px', color: '#0F172A' }}>{doc.document_type}</strong>
                  <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#E0E7FF', color: '#3730A3', fontWeight: '600' }}>
                    v{doc.version || 1}
                  </span>
                  <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', backgroundColor: doc.is_current ? '#DCFCE7' : '#F1F5F9', color: doc.is_current ? '#15803D' : '#64748B' }}>
                    {doc.is_current ? 'Current' : 'Superseded'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Document #: {doc.document_number || 'N/A'} • Status: {doc.verification_status || 'PENDING'}
                </div>
              </div>
              <a
                href={`/v1/storage/documents/${doc.storage_key || doc.id}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#6200EA',
                  textDecoration: 'none',
                  padding: '6px 12px',
                  backgroundColor: '#EDE7F6',
                  borderRadius: '6px',
                }}
              >
                Download / Verify
              </a>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
          No binary documents submitted yet for this merchant profile.
        </p>
      )}
    </div>
  );
};
