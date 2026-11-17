// Job: Screen for Customer, Delivery Partner, or Merchant to sign in via Phone Number and SMS OTP.

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { sendSmsOtp } from '../data/smsAuthLoader.ts';
import { type UserRole } from '../data/userRegistrationService.ts';

interface Props {
  onOtpSent: (phone: string, role: UserRole, mode: 'LIVE_SMS' | 'OFFLINE_FALLBACK', code: string) => void;
}

export const LoginPage: React.FC<Props> = ({ onOtpSent }) => {
  const [role, setRole] = useState<UserRole>('customer');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async () => {
    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await sendSmsOtp(cleanPhone);
      setLoading(false);
      onOtpSent(cleanPhone, role, result.mode, result.code);
    } catch {
      setLoading(false);
      setError('Failed to dispatch verification code. Please retry.');
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.badge}>ALLGO ECOSYSTEM</Text>
      <Text style={styles.title}>Phone Authentication</Text>
      <Text style={styles.sub}>Groceries, Rides, Parcels & Kitchen Operations</Text>

      <View style={styles.roleTabs}>
        <TouchableOpacity
          style={[styles.roleTab, role === 'customer' && styles.roleTabActive]}
          onPress={() => setRole('customer')}
        >
          <Text style={[styles.roleText, role === 'customer' && styles.roleTextActive]}>Customer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.roleTab, role === 'driver' && styles.roleTabActive]}
          onPress={() => setRole('driver')}
        >
          <Text style={[styles.roleText, role === 'driver' && styles.roleTextActive]}>Partner</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.roleTab, role === 'merchant' && styles.roleTabActive]}
          onPress={() => setRole('merchant')}
        >
          <Text style={[styles.roleText, role === 'merchant' && styles.roleTextActive]}>Merchant</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Mobile Number (+91)</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={(val) => {
          setPhone(val);
          setError('');
        }}
        keyboardType="phone-pad"
        placeholder="+91 98765 43210"
      />

      {Boolean(error) && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.primaryBtn} onPress={handleSendOtp} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.btnText}>Send Verification Code →</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.footerNote}>
        🔒 Dual-Mode Authentication: Dispatches live SMS or enables standalone offline fallback (123456).
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#FFFFFF' },
  badge: { fontSize: 11, fontWeight: '800', color: '#4F46E5', letterSpacing: 1.5, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827' },
  sub: { fontSize: 13, color: '#6B7280', marginBottom: 24, marginTop: 4 },
  roleTabs: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 10, padding: 4, marginBottom: 20 },
  roleTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  roleTabActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  roleText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  roleTextActive: { color: '#4F46E5', fontWeight: '700' },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 10, padding: 14, fontSize: 16, marginBottom: 14 },
  primaryBtn: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  error: { color: '#EF4444', fontSize: 13, fontWeight: '600', marginBottom: 10 },
  footerNote: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 24, lineHeight: 16 },
});
