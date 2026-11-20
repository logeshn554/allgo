// Job: Real-time inventory badge for catalog products (In Stock, Low Stock, Out of Stock).

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  stockQuantity: number;
}

export const StockBadge: React.FC<Props> = ({ stockQuantity }) => {
  if (stockQuantity <= 0) {
    return (
      <View style={[styles.badge, styles.outOfStock]}>
        <Text style={[styles.text, styles.outOfStockText]}>OUT OF STOCK</Text>
      </View>
    );
  }

  if (stockQuantity <= 5) {
    return (
      <View style={[styles.badge, styles.lowStock]}>
        <Text style={[styles.text, styles.lowStockText]}>ONLY {stockQuantity} LEFT</Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, styles.inStock]}>
      <Text style={[styles.text, styles.inStockText]}>IN STOCK</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, marginTop: 4, marginBottom: 4 },
  text: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  inStock: { backgroundColor: '#DEF7EC' },
  inStockText: { color: '#03543F' },
  lowStock: { backgroundColor: '#FEF08A' },
  lowStockText: { color: '#713F12' },
  outOfStock: { backgroundColor: '#FEE2E2' },
  outOfStockText: { color: '#991B1B' },
});
