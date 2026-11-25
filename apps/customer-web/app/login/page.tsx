'use client';

import { CustomerHeader } from '@/components/CustomerHeader';
import { customerApi } from '@/lib/api';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@allgo/ui';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';

export default function CustomerLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('+91');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await customerApi.sendOtp(phone.trim());
      setOtpSent(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await customerApi.verifyOtp(phone.trim(), otp.trim());
      if (res?.accessToken) {
        localStorage.setItem('allgo_customer_token', res.accessToken);
      }
      router.push('/');
    } catch (err: any) {
      setError(err?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <CustomerHeader />
      <main className="mx-auto flex max-w-md flex-col justify-center px-6 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Sign in to AllGo</CardTitle>
            <CardDescription>
              Use your phone number to order food, quick groceries, and book rides.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {error}
              </div>
            )}
            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  required
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <Input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  required
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify & Continue'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setOtpSent(false)}
                >
                  Change Phone Number
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
