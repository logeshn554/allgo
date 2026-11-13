// Job: 4-step progress bar for active deliveries.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { OrderStep } from '../data/orderStorage';

const STEPS: { key: OrderStep; label: string }[] = [
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'matched', label: 'Assigned' },
  { key: 'on_the_way', label: 'On the Way' },
  { key: 'delivered', label: 'Delivered' },
];

export const OrderStatusStepper: React.FC<{ currentStep: OrderStep }> = ({ currentStep }) => {
  const activeIndex = STEPS.findIndex((s) => s.key === currentStep);
  return (
    <View style={styles.row}>
      {STEPS.map((step, idx) => (
        <View key={step.key} style={styles.step}>
          <View style={[styles.dot, idx <= activeIndex && styles.dotActive]} />
          <Text style={[styles.label, idx <= activeIndex && styles.labelActive]}>{step.label}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 16 },
  step: { alignItems: 'center', flex: 1 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#E5E7EB', marginBottom: 6 },
  dotActive: { backgroundColor: '#10B981' },
  label: { fontSize: 11, color: '#9CA3AF' },
  labelActive: { color: '#111827', fontWeight: '600' },
});
