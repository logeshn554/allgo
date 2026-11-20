// Job: Interactive Batch Picking & Packing checklist sorted by aisle/category with barcode check-off and prep timer.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AppIcon } from '../AppIcon.tsx';
import { KdsLiveOrder, KdsOrderItem } from '../../data/merchantOrderFulfillment.ts';

interface Props {
  order: KdsLiveOrder;
  onTogglePicked: (orderId: string, itemId: string) => void;
  onFlagOos: (order: KdsLiveOrder, item: KdsOrderItem) => void;
}

export const BatchPickingChecklist: React.FC<Props> = ({
  order,
  onTogglePicked,
  onFlagOos,
}) => {
  // Sort items by aisle and category for optimal dark-store picking path
  const sortedItems = [...order.items].sort((a, b) => a.aisle.localeCompare(b.aisle));
  const pickedCount = sortedItems.filter((i) => i.isPicked || i.isOos).length;
  const totalCount = sortedItems.length;
  const progressPercent = Math.round((pickedCount / totalCount) * 100);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.orderTitle}>Order #{order.id} • {order.customerName}</Text>
          <Text style={styles.orderSub}>
            Prep Time: {order.prepTimeMinutes}m • Status: {order.status}
          </Text>
        </View>
        <View style={styles.progressBadge}>
          <Text style={styles.progressText}>{pickedCount}/{totalCount} Picked</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
      </View>

      {/* Items List Sorted by Aisle */}
      <View style={styles.list}>
        {sortedItems.map((item) => (
          <View key={item.id} style={[styles.itemRow, item.isPicked && styles.itemRowPicked, item.isOos && styles.itemRowOos]}>
            <TouchableOpacity
              style={[styles.checkbox, item.isPicked && styles.checkboxActive]}
              onPress={() => onTogglePicked(order.id, item.id)}
              disabled={item.isOos}
            >
              {item.isPicked ? <AppIcon name="check" size={16} /> : null}
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <View style={styles.aisleTagRow}>
                <Text style={styles.aisleTag}>{item.aisle}</Text>
                <Text style={styles.skuCode}>[{item.sku}]</Text>
              </View>
              <Text style={[styles.itemName, item.isPicked && styles.itemNameStruck, item.isOos && styles.itemNameOos]}>
                {item.quantity}x {item.name}
              </Text>
              {item.notes && <Text style={styles.itemNotes}>Note: {item.notes}</Text>}
              {item.isOos && <Text style={styles.oosLabel}>⚠️ Flagged Out-of-Stock (86ed)</Text>}
            </View>

            {/* OOS Flag Button */}
            {!item.isPicked && !item.isOos && (
              <TouchableOpacity
                style={styles.oosBtn}
                onPress={() => onFlagOos(order, item)}
              >
                <Text style={styles.oosBtnText}>Flag OOS</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  orderTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  orderSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  progressBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  progressText: { fontSize: 12, fontWeight: '800', color: '#334155' },
  progressBarTrack: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, marginBottom: 14, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#10B981' },
  list: { gap: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9' },
  itemRowPicked: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  itemRowOos: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  checkbox: { width: 26, height: 26, borderRadius: 6, borderWidth: 2, borderColor: '#94A3B8', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  aisleTagRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 2 },
  aisleTag: { fontSize: 11, fontWeight: '700', color: '#6366F1' },
  skuCode: { fontSize: 10, color: '#64748B', fontFamily: 'monospace' },
  itemName: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  itemNameStruck: { textDecorationLine: 'line-through', color: '#64748B' },
  itemNameOos: { color: '#DC2626' },
  itemNotes: { fontSize: 11, color: '#F59E0B', fontStyle: 'italic', marginTop: 2 },
  oosLabel: { fontSize: 11, color: '#DC2626', fontWeight: '700', marginTop: 2 },
  oosBtn: { backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  oosBtnText: { color: '#DC2626', fontSize: 11, fontWeight: '800' },
});
