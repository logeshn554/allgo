'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { adminApi } from '@/lib/api-client';

export default function LoginPage() {
  const [phone, setPhone] = useState('+919876543210');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await adminApi.sendOtp(phone.trim());
      setStep('OTP');
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(phone.trim(), otpCode.trim());
      router.push('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0F172A',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#1E293B',
          borderRadius: '16px',
          padding: '36px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          border: '1px solid #334155',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              backgroundColor: '#00C853',
              borderRadius: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '900',
              fontSize: '32px',
              color: '#FFFFFF',
              marginBottom: '16px',
            }}
          >
            A
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#FFFFFF', margin: '0 0 6px 0' }}>
            AllGo Super Console
          </h2>
          <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>
            Restricted Back-Office Administrative Authentication
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: '#7F1D1D',
              border: '1px solid #DC2626',
              color: '#FECACA',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '20px',
            }}
          >
            {error}
          </div>
        )}

        {step === 'PHONE' ? (
          <form onSubmit={handleSendOtp}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#CBD5E1', marginBottom: '8px' }}>
                Admin Phone Number (E.164 +91)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919876543210"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid #475569',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  fontSize: '15px',
                  boxSizing: 'border-box',
                }}
                required
              />
              <span style={{ fontSize: '11px', color: '#64748B', marginTop: '6px', display: 'block' }}>
                Default local dev admin: +919876543210
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: '#00C853',
                color: '#FFFFFF',
                fontWeight: 'bold',
                fontSize: '15px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Dispatching OTP...' : 'Request Verification Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#CBD5E1', marginBottom: '8px' }}>
                Enter 6-Digit OTP Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid #475569',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  fontSize: '20px',
                  textAlign: 'center',
                  letterSpacing: '6px',
                  boxSizing: 'border-box',
                }}
                required
                autoFocus
              />
              <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px', display: 'block', textAlign: 'center' }}>
                Dispatched to {phone} (Check server console in dev mode)
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: '#00C853',
                color: '#FFFFFF',
                fontWeight: 'bold',
                fontSize: '15px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                marginBottom: '10px',
              }}
            >
              {loading ? 'Verifying...' : 'Authorize & Sign In'}
            </button>

            <button
              type="button"
              onClick={() => setStep('PHONE')}
              style={{
                width: '100%',
                padding: '10px',
                background: 'transparent',
                color: '#94A3B8',
                border: 'none',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Change Phone Number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

