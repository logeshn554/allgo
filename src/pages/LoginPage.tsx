// Job: Screen for customer or driver to sign in with phone number and name.

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { saveUserLogin } from '../data/userStorage.ts';

interface Props {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<Props> = ({ onLoginSuccess }) => {
  const [name, setName] = useState('Customer');
  const [phone, setPhone] = useState('+91 98765 43210');

  const handleLogin = (role: 'customer' | 'driver') => {
    saveUserLogin(phone, name, role);
    onLoginSuccess();
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Welcome to AllGo</Text>
      <Text style={styles.sub}>Groceries, Rides & Parcels in One App</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your Name" />
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone Number" />
      <TouchableOpacity style={styles.primaryBtn} onPress={() => handleLogin('customer')}>
        <Text style={styles.btnText}>Continue as Customer</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryBtn} onPress={() => handleLogin('driver')}>
        <Text style={styles.secText}>Sign In as Delivery Partner</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#FFFFFF' },
  title: { fontSize: 26, fontWeight: '800', color: '#111827' },
  sub: { fontSize: 14, color: '#6B7280', marginBottom: 24, marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, marginBottom: 12 },
  primaryBtn: { backgroundColor: '#4F46E5', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  secondaryBtn: { padding: 14, alignItems: 'center', marginTop: 8 },
  secText: { color: '#4F46E5', fontWeight: '600', fontSize: 14 },
});
