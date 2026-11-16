// Job: Screen to enter and verify the 6-digit phone SMS authentication OTP.

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { verifyPhoneOtp } from '../data/smsAuthLoader.ts';
import { saveUserLogin } from '../data/userStorage.ts';

interface Props {
  phone: string;
  role: 'customer' | 'driver';
  onVerified: () => void;
  onBack: () => void;
}

export const OtpVerifyPage: React.FC<Props> = ({ phone, role, onVerified, onBack }) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');

  const handleVerify = async () => {
    const isValid = await verifyPhoneOtp(phone, otp);
    if (isValid) {
      saveUserLogin(phone, 'User', role);
      onVerified();
    } else {
      setError('Invalid OTP. Please enter 123456.');
    }
  };

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.back}>← Back to Login</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Enter 6-Digit OTP</Text>
      <Text style={styles.subtitle}>Sent via SMS to {phone}</Text>

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

      <TouchableOpacity style={styles.btn} onPress={handleVerify}>
        <Text style={styles.btnText}>Verify & Proceed</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', padding: 24, justifyContent: 'center' },
  back: { color: '#4F46E5', fontWeight: '600', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 4, marginBottom: 20 },
  input: { borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 12, padding: 14, fontSize: 20, textAlign: 'center', letterSpacing: 6, marginBottom: 16 },
  error: { color: '#EF4444', fontSize: 13, textAlign: 'center', marginBottom: 12, fontWeight: '600' },
  btn: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
