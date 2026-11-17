// Job: Onboarding screen for new customer profile (Full Name & Delivery Address).

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { updateCustomerProfile } from '../data/userRegistrationService.ts';

interface Props {
  phone: string;
  onCompleted: () => void;
}

export const CustomerOnboardingPage: React.FC<Props> = ({ phone, onCompleted }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!address.trim()) {
      setError('Please enter your delivery address.');
      return;
    }

    const res = updateCustomerProfile(phone, name, address);
    if (res.success) {
      onCompleted();
    } else {
      setError('Could not update profile. Please try again.');
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Welcome to AllGo! 🎉</Text>
      <Text style={styles.sub}>Please provide your details to complete setup for {phone}.</Text>

      <Text style={styles.label}>Full Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={(val) => {
          setName(val);
          setError('');
        }}
        placeholder="e.g. Rahul Sharma"
      />

      <Text style={styles.label}>Delivery Address</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={address}
        onChangeText={(val) => {
          setAddress(val);
          setError('');
        }}
        placeholder="Apartment, Street, Landmark, Area"
        multiline
        numberOfLines={3}
      />

      {Boolean(error) && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.btn} onPress={handleSubmit}>
        <Text style={styles.btnText}>Complete Profile & Start Shopping →</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', padding: 24, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: '#111827' },
  sub: { fontSize: 14, color: '#6B7280', marginTop: 6, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 15 },
  multiline: { height: 80, textAlignVertical: 'top' },
  error: { color: '#EF4444', fontSize: 13, fontWeight: '600', marginBottom: 12 },
  btn: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
