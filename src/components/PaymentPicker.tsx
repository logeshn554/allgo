// Job: Payment method selector supporting UPI, Card, and Cash on Delivery.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PaymentMethod } from '../data/paymentGateway';

interface Props {
  selectedMethod: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
}

const METHODS: { key: PaymentMethod; label: string; icon: string }[] = [
  { key: 'upi', label: 'UPI / GPay / PhonePe', icon: '⚡' },
  { key: 'card', label: 'Credit / Debit Card', icon: '💳' },
  { key: 'cod', label: 'Cash on Delivery', icon: '💵' },
];

export const PaymentPicker: React.FC<Props> = ({ selectedMethod, onSelect }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payment Method</Text>
      {METHODS.map((m) => (
        <TouchableOpacity
          key={m.key}
          style={[styles.row, selectedMethod === m.key && styles.rowSelected]}
          onPress={() => onSelect(m.key)}
        >
          <Text style={styles.icon}>{m.icon}</Text>
          <Text style={[styles.label, selectedMethod === m.key && styles.labelSelected]}>
            {m.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginVertical: 12 },
  title: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, marginBottom: 8, backgroundColor: '#FFF' },
  rowSelected: { borderColor: '#10B981', backgroundColor: '#ECFDF5' },
  icon: { fontSize: 16, marginRight: 10 },
  label: { fontSize: 13, color: '#4B5563', fontWeight: '600' },
  labelSelected: { color: '#065F46', fontWeight: '700' },
});
