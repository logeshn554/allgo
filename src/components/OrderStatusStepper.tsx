import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { OrderStep } from '../data/orderStorage';

interface Props {
  currentStep: OrderStep;
}

const STEPS: { key: OrderStep; label: string }[] = [
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'matched', label: 'Driver Assigned' },
  { key: 'on_the_way', label: 'On the Way' },
  { key: 'delivered', label: 'Delivered' },
];

export const OrderStatusStepper: React.FC<Props> = ({ currentStep }) => {
  const activeIndex = STEPS.findIndex((s) => s.key === currentStep);
  return (
    <View style={styles.row}>
      {STEPS.map((step, index) => {
        const isDone = index <= activeIndex;
        return (
          <View key={step.key} style={styles.stepBox}>
            <View style={[styles.dot, isDone && styles.dotActive]} />
            <Text style={[styles.label, isDone && styles.labelActive]}>{step.label}</Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 16 },
  stepBox: { alignItems: 'center', flex: 1 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#E5E7EB', marginBottom: 6 },
  dotActive: { backgroundColor: '#10B981' },
  label: { fontSize: 11, color: '#9CA3AF', textAlign: 'center' },
  labelActive: { color: '#111827', fontWeight: '600' },
});
