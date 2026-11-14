// Job: Shared card displaying the customer's 4-digit handover PIN to prevent false drop-offs.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const OtpPinBox: React.FC<{ pin: string }> = ({ pin }) => (
  <View style={styles.card}>
    <Text style={styles.caption}>Share this 4-digit handover PIN with your driver</Text>
    <Text style={styles.pin}>{pin}</Text>
    <Text style={styles.sub}>Handover verified before order is marked Delivered</Text>
  </View>
);

const styles = StyleSheet.create({
  card: { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: '#BBF7D0' },
  caption: { fontSize: 13, color: '#166534', fontWeight: '700', marginBottom: 4 },
  pin: { fontSize: 32, fontWeight: '900', letterSpacing: 8, color: '#047857', marginVertical: 2 },
  sub: { fontSize: 11, color: '#65A30D' },
});
