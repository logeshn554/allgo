// Job: Modal for out-of-stock item handling triggering customer substitution rule or partial refund.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { KdsLiveOrder, KdsOrderItem } from '../../data/merchantOrderFulfillment.ts';

interface Props {
  visible: boolean;
  order: KdsLiveOrder | null;
  item: KdsOrderItem | null;
  onConfirmOos: (orderId: string, itemId: string) => void;
  onClose: () => void;
}

export const ItemOosSubstitutionModal: React.FC<Props> = ({
  visible,
  order,
  item,
  onConfirmOos,
  onClose,
}) => {
  if (!visible || !order || !item) return null;

  const itemTotalCents = item.priceCents * item.quantity;
  const rule = order.substitutionRule;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.header}>Out-of-Stock (86) Action</Text>
          <Text style={styles.subHeader}>
            Flagging: <Text style={styles.bold}>{item.quantity}x {item.name}</Text> ({item.sku})
          </Text>

          {/* Customer Chosen Rule Banner */}
          <View style={styles.ruleCard}>
            <Text style={styles.ruleLabel}>Customer's Checkout Preference:</Text>
            {rule === 'REFUND_ITEM' && (
              <View>
                <Text style={styles.ruleName}>💰 Instant Partial Refund</Text>
                <Text style={styles.ruleDesc}>
                  Customer opted to automatically refund missing items. A wallet refund of ₹
                  {(itemTotalCents / 100).toFixed(0)} will be credited immediately.
                </Text>
              </View>
            )}
            {rule === 'BEST_MATCH' && (
              <View>
                <Text style={styles.ruleName}>🔄 Best Match Substitution</Text>
                <Text style={styles.ruleDesc}>
                  Customer approved automatic replacement with a similar brand or size of equal or lesser value.
                </Text>
              </View>
            )}
            {rule === 'CALL_ME' && (
              <View>
                <Text style={styles.ruleName}>📞 Call Customer First</Text>
                <Text style={styles.ruleDesc}>
                  Customer requested a call before substitution:
                </Text>
                <Text style={styles.phoneLink}>{order.customerPhone}</Text>
              </View>
            )}
          </View>

          {/* Recalculated Bill Note */}
          <View style={styles.billBox}>
            <Text style={styles.billText}>
              Order Subtotal Reduction: -₹{(itemTotalCents / 100).toFixed(0)}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => {
                onConfirmOos(order.id, item.id);
                onClose();
              }}
            >
              <Text style={styles.confirmText}>Confirm & Apply Rule</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, width: '100%', maxWidth: 420 },
  header: { fontSize: 16, fontWeight: '800', color: '#DC2626', marginBottom: 4 },
  subHeader: { fontSize: 13, color: '#334155', marginBottom: 14 },
  bold: { fontWeight: '700', color: '#0F172A' },
  ruleCard: { backgroundColor: '#FEF3C7', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#FDE68A', marginBottom: 14 },
  ruleLabel: { fontSize: 11, fontWeight: '700', color: '#92400E', textTransform: 'uppercase', marginBottom: 4 },
  ruleName: { fontSize: 14, fontWeight: '800', color: '#B45309', marginBottom: 4 },
  ruleDesc: { fontSize: 12, color: '#78350F', lineHeight: 18 },
  phoneLink: { fontSize: 13, fontWeight: '800', color: '#1E40AF', marginTop: 4 },
  billBox: { backgroundColor: '#F1F5F9', padding: 10, borderRadius: 8, marginBottom: 16 },
  billText: { fontSize: 12, fontWeight: '700', color: '#475569', textAlign: 'center' },
  btnRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center' },
  cancelText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  confirmBtn: { flex: 2, backgroundColor: '#DC2626', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  confirmText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
});
