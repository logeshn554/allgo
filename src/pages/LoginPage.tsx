// Job: Screen for customer or driver to sign in with phone number and OTP.

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { saveUserSession } from '../data/userStorage';

interface Props {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<Props> = ({ onLoginSuccess }) => {
  const [phone, setPhone] = useState('9876543210');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [role, setRole] = useState<'customer' | 'driver'>('customer');

  const handleSendOtp = () => {
    if (phone.length >= 10) setStep('otp');
  };

  const handleVerifyOtp = () => {
    if (otp === '123456' || otp.length === 6) {
      saveUserSession({
        id: `usr_${Date.now()}`,
        phone: `+91 ${phone}`,
        name: role === 'driver' ? 'Partner Driver' : 'AllGo User',
        role,
        address: 'MG Road Metro Station, Bengaluru',
      });
      onLoginSuccess();
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.brandTitle}>AllGo</Text>
      <Text style={styles.subtitle}>SuperApp for delivery & rides</Text>

      <View style={styles.roleRow}>
        <TouchableOpacity
          style={[styles.roleBtn, role === 'customer' && styles.roleBtnActive]}
          onPress={() => setRole('customer')}
        >
          <Text style={[styles.roleText, role === 'customer' && styles.roleTextActive]}>
            Customer
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.roleBtn, role === 'driver' && styles.roleBtnActive]}
          onPress={() => setRole('driver')}
        >
          <Text style={[styles.roleText, role === 'driver' && styles.roleTextActive]}>
            Driver Partner
          </Text>
        </TouchableOpacity>
      </View>

      {step === 'phone' ? (
        <View style={styles.form}>
          <Text style={styles.label}>Enter Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="10-digit mobile"
          />
          <TouchableOpacity style={styles.submitBtn} onPress={handleSendOtp}>
            <Text style={styles.submitBtnText}>Send OTP</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.label}>Enter 6-Digit OTP</Text>
          <TextInput
            style={styles.input}
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            placeholder="Default: 123456"
            maxLength={6}
          />
          <TouchableOpacity style={styles.submitBtn} onPress={handleVerifyOtp}>
            <Text style={styles.submitBtnText}>Verify & Login</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', padding: 24, justifyContent: 'center' },
  brandTitle: { fontSize: 32, fontWeight: '900', color: '#111827', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 28 },
  roleRow: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4, marginBottom: 24 },
  roleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  roleBtnActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  roleText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  roleTextActive: { color: '#111827', fontWeight: '700' },
  form: { marginTop: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 16 },
  submitBtn: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
