// Job: Driver wallet earnings breakdown card and instant bank payout button.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DriverWalletBreakdown } from '../data/driverWalletService.ts';

interface Props {
  wallet: DriverWalletBreakdown;
  onInstantPayout: () => void;
}

export const DriverWalletView: React.FC<Props> = ({ wallet, onInstantPayout }) => {
  return (
    <View style={styles.walletCard}>
      <Text style={styles.walletBalanceHeading}>Total Withdrawable Earnings</Text>
      <Text style={styles.walletBalance}>₹{(wallet.availableBalanceCents / 100).toFixed(0)}</Text>
      <View style={styles.earningsTable}>
        <View style={styles.earningsRow}>
          <Text style={styles.earnLabel}>Base Fares</Text>
          <Text style={styles.earnVal}>₹{(wallet.baseFareSumCents / 100).toFixed(0)}</Text>
        </View>
        <View style={styles.earningsRow}>
          <Text style={styles.earnLabel}>Distance Compensation</Text>
          <Text style={styles.earnVal}>₹{(wallet.distancePaySumCents / 100).toFixed(0)}</Text>
        </View>
        <View style={styles.earningsRow}>
          <Text style={styles.earnLabel}>Wait Time Pay</Text>
          <Text style={styles.earnVal}>₹{(wallet.waitingTimeSumCents / 100).toFixed(0)}</Text>
        </View>
        <View style={styles.earningsRow}>
          <Text style={styles.earnLabel}>Peak Surge Bonuses</Text>
          <Text style={styles.earnVal}>₹{(wallet.surgeBonusSumCents / 100).toFixed(0)}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.payoutBtn} onPress={onInstantPayout}>
        <Text style={styles.payoutText}>⚡ Request Instant Bank Payout (IMPS)</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  walletCard: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  walletBalanceHeading: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  walletBalance: { fontSize: 32, fontWeight: '900', color: '#00C853', marginVertical: 6 },
  earningsTable: { marginVertical: 12, backgroundColor: '#FFF', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  earningsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  earnLabel: { fontSize: 13, color: '#64748B' },
  earnVal: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  payoutBtn: { backgroundColor: '#6200EA', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  payoutText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
});
