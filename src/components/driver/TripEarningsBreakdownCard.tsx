// Job: Per-trip earnings breakdown card displaying base fare, distance pay, surge, tip, and total.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TripEarningsDetails } from '../../data/driverCodEarningsService.ts';

interface Props {
  trip: TripEarningsDetails;
}

export const TripEarningsBreakdownCard: React.FC<Props> = ({ trip }) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.orderId}>#{trip.orderId} • {trip.vertical}</Text>
          <Text style={styles.time}>{trip.completedAt}</Text>
        </View>
        <Text style={styles.totalVal}>₹{trip.totalNetEarningsInr}</Text>
      </View>

      <View style={styles.line}>
        <Text style={styles.label}>Base Fare</Text>
        <Text style={styles.val}>₹{trip.baseFareInr}</Text>
      </View>
      <View style={styles.line}>
        <Text style={styles.label}>Distance Pay</Text>
        <Text style={styles.val}>₹{trip.distancePayInr}</Text>
      </View>
      {trip.waitingPayInr > 0 && (
        <View style={styles.line}>
          <Text style={styles.label}>Waiting Time Pay</Text>
          <Text style={styles.val}>₹{trip.waitingPayInr}</Text>
        </View>
      )}
      {trip.surgeBonusInr > 0 && (
        <View style={styles.line}>
          <Text style={styles.label}>Surge Bonus</Text>
          <Text style={[styles.val, { color: '#F59E0B' }]}>+₹{trip.surgeBonusInr}</Text>
        </View>
      )}
      {trip.customerTipInr > 0 && (
        <View style={styles.line}>
          <Text style={styles.label}>Customer Tip</Text>
          <Text style={[styles.val, { color: '#10B981' }]}>+₹{trip.customerTipInr}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  orderId: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  time: { fontSize: 11, color: '#64748B' },
  totalVal: { fontSize: 16, fontWeight: '900', color: '#16A34A' },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  label: { fontSize: 11, color: '#64748B' },
  val: { fontSize: 11, fontWeight: '700', color: '#334155' },
});
