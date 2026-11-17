// Job: Screen to enter and atomically verify the 6-digit SMS authentication challenge.

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { verifySmsOtpAndLogin } from '../data/smsAuthLoader.ts';
import { type UserRole, type UserAccountRecord } from '../data/userRegistrationService.ts';

interface Props {
  phone: string;
  role: UserRole;
  mode?: 'LIVE_SMS' | 'OFFLINE_FALLBACK';
  onVerified: (isNewUser: boolean, role: UserRole, account?: UserAccountRecord) => void;
  onBack: () => void;
}

export const OtpVerifyPage: React.FC<Props> = ({ phone, role, mode = 'OFFLINE_FALLBACK', onVerified, onBack }) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (!otp.trim() || otp.trim().length < 6) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await verifySmsOtpAndLogin(phone, otp, role);
      setLoading(false);
      if (result.ok) {
        onVerified(result.isNewUser, role, result.account);
      } else {
        setError(result.message || 'Invalid code. Please retry.');
      }
    } catch {
      setLoading(false);
      setError('Network verification error. Please retry.');
    }
  };

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.back}>← Change Mobile Number</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Enter 6-Digit OTP</Text>
      <Text style={styles.subtitle}>
        Sent to {phone} ({role.toUpperCase()})
      </Text>

      {mode === 'OFFLINE_FALLBACK' && (
        <View style={styles.fallbackBanner}>
          <Text style={styles.fallbackTitle}>⚡ Offline / Standalone Device Mode</Text>
          <Text style={styles.fallbackText}>Standard fallback verification code: 123456</Text>
        </View>
      )}

      <TextInput
        style={styles.input}
        value={otp}
        onChangeText={(val) => {
          setOtp(val);
          setError('');
        }}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="123456"
      />

      {Boolean(error) && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.btn} onPress={handleVerify} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.btnText}>Atomically Verify & Proceed →</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', padding: 24, justifyContent: 'center' },
  back: { color: '#4F46E5', fontWeight: '600', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 4, marginBottom: 16 },
  fallbackBanner: { backgroundColor: '#EEF2FF', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#C7D2FE' },
  fallbackTitle: { fontSize: 12, fontWeight: '700', color: '#3730A3' },
  fallbackText: { fontSize: 12, color: '#4338CA', marginTop: 2 },
  input: { borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 12, padding: 14, fontSize: 22, textAlign: 'center', letterSpacing: 8, marginBottom: 16 },
  error: { color: '#EF4444', fontSize: 13, textAlign: 'center', marginBottom: 12, fontWeight: '600' },
  btn: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
