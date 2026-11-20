// Job: Reusable Merchant Settlement Summary Card showing gross sales, deductions, tax, and net disbursement.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DailySettlementSummary } from '../data/merchantSettlementService.ts';

interface Props {
  settlement: DailySettlementSummary;
}

export const KdsSettlementCard: React.FC<Props> = ({ settlement }) => {
  return (
    <View style={styles.settleCard}>
      <View style={styles.settleRow}>
        <Text style={styles.settleLabel}>Gross Food Sales</Text>
        <Text style={styles.settleVal}>₹{(settlement.totalGrossSalesCents / 100).toFixed(0)}</Text>
      </View>
      <View style={styles.settleRow}>
        <Text style={styles.settleLabel}>Packaging Charges Collected</Text>
        <Text style={styles.settleVal}>+ ₹{(settlement.totalPackagingCents / 100).toFixed(0)}</Text>
      </View>
      <View style={styles.settleRow}>
        <Text style={styles.settleLabel}>Platform Commission (15%)</Text>
        <Text style={[styles.settleVal, { color: '#DC2626' }]}>
          - ₹{(settlement.totalPlatformCommissionCents / 100).toFixed(0)}
        </Text>
      </View>
      <View style={styles.settleRow}>
        <Text style={styles.settleLabel}>Customer Refunds Deductions</Text>
        <Text style={[styles.settleVal, { color: '#DC2626' }]}>
          - ₹{(settlement.totalRefundDeductionsCents / 100).toFixed(0)}
        </Text>
      </View>
      <View style={styles.settleRow}>
        <Text style={styles.settleLabel}>GST / Tax (5%)</Text>
        <Text style={styles.settleVal}>₹{(settlement.totalGstTaxCents / 100).toFixed(0)}</Text>
      </View>
      <View style={styles.settleDivider} />
      <View style={styles.settleRow}>
        <Text style={styles.netDisburseLabel}>Net Merchant Disbursement</Text>
        <Text style={styles.netDisburseVal}>₹{(settlement.netDisbursementCents / 100).toFixed(0)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  settleCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 18, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 10 },
  settleRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  settleLabel: { fontSize: 13, color: '#64748B' },
  settleVal: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  settleDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 10 },
  netDisburseLabel: { fontSize: 15, fontWeight: '900', color: '#0F172A' },
  netDisburseVal: { fontSize: 20, fontWeight: '900', color: '#00C853' },
});
