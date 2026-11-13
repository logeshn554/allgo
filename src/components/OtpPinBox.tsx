// Job: Shared card displaying the customer's 6-digit delivery PIN.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const OtpPinBox: React.FC<{ pin: string }> = ({ pin }) => (
  <View style={styles.card}>
    <Text style={styles.caption}>Share this 6-digit PIN with your driver at the door</Text>
    <Text style={styles.pin}>{pin}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 },
  caption: { fontSize: 12, color: '#4B5563', marginBottom: 4 },
  pin: { fontSize: 26, fontWeight: '800', letterSpacing: 6, color: '#111827' },
});
