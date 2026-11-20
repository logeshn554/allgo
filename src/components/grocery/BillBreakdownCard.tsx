// Job: Server-authoritative bill summary display with item taxes, delivery slab, small cart fee, and surge.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface BillPricing {
  itemsTotalInr: number;
  deliveryFeeInr: number;
  surgeFeeInr: number;
  smallCartFeeInr: number;
  packagingFeeInr: number;
  platformFeeInr: number;
  taxGstInr: number;
  discountInr: number;
  finalTotalInr: number;
}

interface Props {
  pricing: BillPricing;
}

export const BillBreakdownCard: React.FC<Props> = ({ pricing }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Bill Details</Text>

      {/* Item Total */}
      <View style={styles.row}>
        <Text style={styles.label}>Items Total</Text>
        <Text style={styles.val}>₹{pricing.itemsTotalInr.toFixed(0)}</Text>
      </View>

      {/* Small Cart Fee */}
      {pricing.smallCartFeeInr > 0 && (
        <View style={styles.row}>
          <Text style={styles.label}>Small Cart Fee (Order &lt; ₹150)</Text>
          <Text style={styles.val}>₹{pricing.smallCartFeeInr.toFixed(0)}</Text>
        </View>
      )}

      {/* Delivery Fee & Surge */}
      <View style={styles.row}>
        <Text style={styles.label}>
          Delivery Partner Fee {pricing.surgeFeeInr > 0 ? '⚡ Peak Surge' : ''}
        </Text>
        <Text style={styles.val}>
          ₹{(pricing.deliveryFeeInr + pricing.surgeFeeInr).toFixed(0)}
        </Text>
      </View>

      {/* Packaging & Platform */}
      <View style={styles.row}>
        <Text style={styles.label}>Eco Bag & Packaging Fee</Text>
        <Text style={styles.val}>₹{pricing.packagingFeeInr.toFixed(0)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Platform Fee</Text>
        <Text style={styles.val}>₹{pricing.platformFeeInr.toFixed(0)}</Text>
      </View>

      {/* Taxes GST */}
      <View style={styles.row}>
        <Text style={styles.label}>Taxes & GST (5% split)</Text>
        <Text style={styles.val}>₹{pricing.taxGstInr.toFixed(0)}</Text>
      </View>

      {/* Discount */}
      {pricing.discountInr > 0 && (
        <View style={styles.row}>
          <Text style={styles.discountLabel}>Coupon Discount</Text>
          <Text style={styles.discountVal}>-₹{pricing.discountInr.toFixed(0)}</Text>
        </View>
      )}

      <View style={styles.divider} />

      {/* Final Total */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>To Pay</Text>
        <Text style={styles.totalVal}>₹{pricing.finalTotalInr.toFixed(0)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  title: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 12, color: '#4B5563' },
  val: { fontSize: 12, fontWeight: '600', color: '#111827' },
  discountLabel: { fontSize: 12, color: '#059669', fontWeight: '700' },
  discountVal: { fontSize: 12, color: '#059669', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 15, fontWeight: '800', color: '#111827' },
  totalVal: { fontSize: 17, fontWeight: '900', color: '#111827' },
});
