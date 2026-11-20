// Job: Merchant Settlement & Payout Ledger page with order-level breakdowns and T+1 timeline.

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import {
  loadSettlementLedger,
  calculateLedgerSummary,
  OrderSettlementRecord,
} from '../../data/merchantSettlementLedger.ts';
import { MerchantPayoutLedgerCard } from '../../components/merchant/MerchantPayoutLedgerCard.tsx';

interface Props {
  onBack: () => void;
}

export const SettlementPage: React.FC<Props> = ({ onBack }) => {
  const [records] = useState<OrderSettlementRecord[]>(() => loadSettlementLedger());
  const summary = calculateLedgerSummary(records);

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backLink}>← Return Home</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Merchant Settlements & Payouts</Text>
      </View>

      {/* Aggregate Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Daily Net Reconciliation Summary</Text>
        <View style={styles.statGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Gross Sales</Text>
            <Text style={styles.statVal}>₹{(summary.totalGrossSalesCents / 100).toFixed(0)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Commission (15%)</Text>
            <Text style={[styles.statVal, { color: '#DC2626' }]}>
              -₹{(summary.totalCommissionCents / 100).toFixed(0)}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>GST + TCS (6%)</Text>
            <Text style={[styles.statVal, { color: '#DC2626' }]}>
              -₹{((summary.totalGstCents + summary.totalTcsCents) / 100).toFixed(0)}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Pending T+1</Text>
            <Text style={[styles.statVal, { color: '#2563EB' }]}>
              ₹{(summary.pendingT1Cents / 100).toFixed(0)}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />
        <View style={styles.netRow}>
          <View>
            <Text style={styles.netHeader}>Total Net Payable</Text>
            <Text style={styles.netSub}>Disbursed next business day (T+1)</Text>
          </View>
          <Text style={styles.netBigVal}>₹{(summary.netDisbursementCents / 100).toFixed(0)}</Text>
        </View>
      </View>

      {/* Order-Level Transactions */}
      <Text style={styles.sectionHeader}>Order-Level Transactions & Tax Invoices</Text>
      {records.map((r) => (
        <MerchantPayoutLedgerCard key={r.orderId} record={r} />
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  topBar: { marginBottom: 12 },
  backLink: { color: '#6200EA', fontWeight: '800', fontSize: 13, marginBottom: 4 },
  pageTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  summaryCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  summaryTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statBox: { flex: 1, minWidth: '45%', backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8 },
  statLabel: { fontSize: 11, color: '#64748B' },
  statVal: { fontSize: 15, fontWeight: '900', color: '#0F172A', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 12 },
  netRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  netHeader: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  netSub: { fontSize: 11, color: '#64748B', marginTop: 1 },
  netBigVal: { fontSize: 22, fontWeight: '900', color: '#16A34A' },
  sectionHeader: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 10 },
});
