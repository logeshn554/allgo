// Job: 1-tap SKU stock toggle row with immediate PostgreSQL/Redis sync feedback.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SkuCatalogItem } from '../../data/merchantInventoryApi.ts';

interface Props {
  item: SkuCatalogItem;
  onToggle: (skuId: string) => void;
}

export const SkuStockToggleRow: React.FC<Props> = ({ item, onToggle }) => {
  return (
    <View style={[styles.row, !item.isAvailable && styles.rowOos]}>
      <View style={{ flex: 1 }}>
        <View style={styles.badgeRow}>
          <Text style={styles.category}>{item.category} • {item.aisle}</Text>
          <Text style={styles.sku}>[{item.sku}]</Text>
        </View>
        <Text style={[styles.name, !item.isAvailable && styles.nameOos]}>
          {item.name}
        </Text>
        <Text style={styles.sub}>
          ₹{(item.priceCents / 100).toFixed(0)} • Stock: {item.stockQuantity} units
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.toggleBtn, item.isAvailable ? styles.inStockBtn : styles.outOfStockBtn]}
        onPress={() => onToggle(item.id)}
      >
        <Text style={[styles.toggleText, item.isAvailable ? styles.inStockText : styles.outOfStockText]}>
          {item.isAvailable ? 'IN STOCK' : '86ed (OUT OF STOCK)'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  rowOos: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  badgeRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 2 },
  category: { fontSize: 11, fontWeight: '700', color: '#6366F1' },
  sku: { fontSize: 10, color: '#64748B', fontFamily: 'monospace' },
  name: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  nameOos: { color: '#DC2626' },
  sub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  inStockBtn: { backgroundColor: '#DCFCE7' },
  outOfStockBtn: { backgroundColor: '#FEE2E2' },
  toggleText: { fontSize: 11, fontWeight: '800' },
  inStockText: { color: '#166534' },
  outOfStockText: { color: '#DC2626' },
});
