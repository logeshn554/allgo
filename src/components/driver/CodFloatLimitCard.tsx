// Job: Real-time CoD cash-in-hand float limit tracker with ₹2,000 threshold warning and UPI settlement button.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MAX_COD_FLOAT_LIMIT_INR } from '../../data/driverCodEarningsService.ts';

interface Props {
  currentFloatInr: number;
  isBlocked: boolean;
  onSettleUpi: () => void;
}

export const CodFloatLimitCard: React.FC<Props> = ({
  currentFloatInr,
  isBlocked,
  onSettleUpi,
}) => {
  const percent = Math.min(100, Math.round((currentFloatInr / MAX_COD_FLOAT_LIMIT_INR) * 100));

  return (
    <View style={[styles.card, isBlocked && styles.cardBlocked]}>
      {/* Title */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Cash-on-Delivery (CoD) Float Limit</Text>
          <Text style={styles.sub}>Maximum cash in hand allowed: ₹{MAX_COD_FLOAT_LIMIT_INR}</Text>
        </View>
        <Text style={[styles.floatAmount, isBlocked && styles.floatAmountBlocked]}>
          ₹{currentFloatInr}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }, isBlocked && styles.fillBlocked]} />
      </View>

      {/* Blocked State Notice */}
      {isBlocked ? (
        <View style={styles.blockedBanner}>
          <Text style={styles.blockedText}>
            ⛔ Float limit exceeded! New Cash-on-Delivery orders are blocked until settled.
          </Text>
        </View>
      ) : (
        <Text style={styles.remainingText}>
          ₹{MAX_COD_FLOAT_LIMIT_INR - currentFloatInr} remaining before cash orders pause.
        </Text>
      )}

      {/* Settle Float Button */}
      <TouchableOpacity style={styles.settleBtn} onPress={onSettleUpi}>
        <Text style={styles.settleBtnText}>⚡ Settle ₹{currentFloatInr} Float via UPI</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  cardBlocked: { borderColor: '#EF4444', backgroundColor: '#FFF5F5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  sub: { fontSize: 11, color: '#64748B', marginTop: 1 },
  floatAmount: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  floatAmountBlocked: { color: '#DC2626' },
  track: { height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, marginBottom: 10, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#F59E0B' },
  fillBlocked: { backgroundColor: '#EF4444' },
  blockedBanner: { backgroundColor: '#FEE2E2', padding: 8, borderRadius: 6, marginBottom: 10 },
  blockedText: { fontSize: 11, fontWeight: '700', color: '#DC2626' },
  remainingText: { fontSize: 11, color: '#64748B', marginBottom: 10 },
  settleBtn: { backgroundColor: '#2563EB', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  settleBtnText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
});
