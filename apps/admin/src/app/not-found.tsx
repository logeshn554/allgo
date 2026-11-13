import React from 'react';

export default function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: '#0F172A', margin: '0 0 12px 0' }}>404</h1>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#334155', margin: '0 0 8px 0' }}>
        Administrative Resource Not Found
      </h2>
      <p style={{ color: '#64748B', fontSize: '14px', maxWidth: '440px', margin: '0 0 24px 0' }}>
        The requested admin resource, console view, or identity record does not exist or has been moved.
      </p>
      <a
        href="/admin/dashboard"
        style={{
          padding: '10px 20px',
          borderRadius: '8px',
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          textDecoration: 'none',
          fontWeight: '600',
          fontSize: '14px',
        }}
      >
        Return to Dashboard
      </a>
    </div>
  );
}
