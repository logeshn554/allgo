// Job: Order-level settlement ledger card displaying gross sales, 15% platform commission, GST/TCS, and T+1 status.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { OrderSettlementRecord } from '../../data/merchantSettlementLedger.ts';

interface Props {
  record: OrderSettlementRecord;
}

export const MerchantPayoutLedgerCard: React.FC<Props> = ({ record }) => {
  const isSettled = record.status === 'SETTLED';

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.orderId}>#{record.orderId} • {record.customerName}</Text>
          <Text style={styles.time}>{record.orderTimestamp}</Text>
        </View>
        <View style={[styles.statusBadge, isSettled ? styles.statusSettled : styles.statusPending]}>
          <Text style={[styles.statusText, isSettled ? styles.statusSettledText : styles.statusPendingText]}>
            {isSettled ? '✓ SETTLED' : '⏳ PENDING T+1'}
          </Text>
        </View>
      </View>

      {/* Financial Line Items */}
      <View style={styles.row}>
        <Text style={styles.label}>Gross Food Sales</Text>
        <Text style={styles.val}>₹{(record.grossSalesCents / 100).toFixed(0)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Packaging Collected</Text>
        <Text style={styles.val}>+₹{(record.packagingCents / 100).toFixed(0)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Platform Commission (15%)</Text>
        <Text style={[styles.val, styles.deduction]}>-₹{(record.commissionCents / 100).toFixed(0)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>GST / Tax (5%)</Text>
        <Text style={[styles.val, styles.deduction]}>-₹{(record.gstDeductionCents / 100).toFixed(0)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>TCS under Sec 52 CGST (1%)</Text>
        <Text style={[styles.val, styles.deduction]}>-₹{(record.tcsDeductionCents / 100).toFixed(0)}</Text>
      </View>
      {record.refundDeductionsCents > 0 && (
        <View style={styles.row}>
          <Text style={styles.label}>Customer OOS Refund</Text>
          <Text style={[styles.val, styles.deduction]}>-₹{(record.refundDeductionsCents / 100).toFixed(0)}</Text>
        </View>
      )}

      {/* Divider */}
      <View style={styles.divider} />

      {/* Net Payout */}
      <View style={styles.netRow}>
        <View>
          <Text style={styles.netLabel}>Net Payout</Text>
          <Text style={styles.bankSub}>{record.bankAccountMasked}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.netVal}>₹{(record.netPayoutCents / 100).toFixed(0)}</Text>
          <Text style={styles.settleDate}>{record.settlementDate}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  orderId: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  time: { fontSize: 11, color: '#64748B', marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusSettled: { backgroundColor: '#DCFCE7' },
  statusPending: { backgroundColor: '#EFF6FF' },
  statusText: { fontSize: 11, fontWeight: '800' },
  statusSettledText: { color: '#166534' },
  statusPendingText: { color: '#1D4ED8' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  label: { fontSize: 12, color: '#64748B' },
  val: { fontSize: 12, fontWeight: '700', color: '#1E293B' },
  deduction: { color: '#DC2626' },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 8 },
  netRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  netLabel: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  bankSub: { fontSize: 11, color: '#64748B' },
  netVal: { fontSize: 16, fontWeight: '900', color: '#16A34A' },
  settleDate: { fontSize: 11, color: '#64748B' },
});
