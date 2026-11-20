// Job: Multi-stage visual tracker for grocery order confirmation, packing, and dispatch.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type GroceryOrderStage =
  | 'ORDER_PLACED'
  | 'MERCHANT_ACCEPTED'
  | 'READY_FOR_PICKUP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED';

interface Props {
  currentStage: GroceryOrderStage;
  estimatedDeliveryTime?: string;
  handoverOtp?: string;
}

const STAGES: Array<{ key: GroceryOrderStage; label: string; desc: string; icon: string }> = [
  { key: 'ORDER_PLACED', label: 'Order Confirmed', desc: 'Sent to dark store / outlet', icon: '✓' },
  { key: 'MERCHANT_ACCEPTED', label: 'Packing Items', desc: 'Store picker gathering fresh items', icon: '🛍️' },
  { key: 'READY_FOR_PICKUP', label: 'Bags Sealed', desc: 'Order packed & waiting for courier', icon: '📦' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'Partner on the way to your door', icon: '🛵' },
  { key: 'DELIVERED', label: 'Order Delivered', desc: 'Handed over successfully', icon: '🎉' },
];

export const GroceryStageTracker: React.FC<Props> = ({
  currentStage,
  estimatedDeliveryTime = '12-15 mins',
  handoverOtp = '9912',
}) => {
  const currentIndex = STAGES.findIndex((s) => s.key === currentStage);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.title}>Delivery Status</Text>
          <Text style={styles.etaText}>Estimated Delivery: {estimatedDeliveryTime}</Text>
        </View>
        {currentStage === 'OUT_FOR_DELIVERY' && (
          <View style={styles.otpBox}>
            <Text style={styles.otpLabel}>Delivery PIN</Text>
            <Text style={styles.otpVal}>{handoverOtp}</Text>
          </View>
        )}
      </View>

      <View style={styles.timeline}>
        {STAGES.map((s, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          return (
            <View key={s.key} style={styles.stageRow}>
              <View style={styles.indicatorCol}>
                <View
                  style={[
                    styles.circle,
                    isDone && styles.circleDone,
                    isCurrent && styles.circleCurrent,
                  ]}
                >
                  <Text style={[styles.circleText, (isDone || isCurrent) && styles.circleTextActive]}>
                    {isDone ? '✓' : idx + 1}
                  </Text>
                </View>
                {idx < STAGES.length - 1 && (
                  <View style={[styles.connector, isDone && styles.connectorDone]} />
                )}
              </View>
              <View style={styles.stageContent}>
                <Text style={[styles.stageLabel, isCurrent && styles.stageLabelCurrent]}>
                  {s.label}
                </Text>
                <Text style={styles.stageDesc}>{s.desc}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 15, fontWeight: '800', color: '#111827' },
  etaText: { fontSize: 12, color: '#059669', fontWeight: '700', marginTop: 2 },
  otpBox: { backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#F59E0B', alignItems: 'center' },
  otpLabel: { fontSize: 9, fontWeight: '800', color: '#92400E' },
  otpVal: { fontSize: 14, fontWeight: '900', color: '#92400E' },
  timeline: { paddingLeft: 4 },
  stageRow: { flexDirection: 'row', minHeight: 46 },
  indicatorCol: { alignItems: 'center', width: 24, marginRight: 12 },
  circle: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  circleDone: { backgroundColor: '#10B981' },
  circleCurrent: { backgroundColor: '#4F46E5', borderWidth: 2, borderColor: '#C7D2FE' },
  circleText: { fontSize: 10, fontWeight: '700', color: '#6B7280' },
  circleTextActive: { color: '#FFFFFF' },
  connector: { width: 2, flex: 1, backgroundColor: '#E5E7EB', marginVertical: 2 },
  connectorDone: { backgroundColor: '#10B981' },
  stageContent: { flex: 1, paddingBottom: 10 },
  stageLabel: { fontSize: 13, fontWeight: '700', color: '#4B5563' },
  stageLabelCurrent: { color: '#111827', fontWeight: '800' },
  stageDesc: { fontSize: 11, color: '#6B7280', marginTop: 1 },
});
