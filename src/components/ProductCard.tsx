// Job: Shared card displaying one grocery item with its price and Add button.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GroceryProduct } from '../data/catalogLoader';
import { AppIcon } from './AppIcon';

interface Props {
  product: GroceryProduct;
  onAdd: (product: GroceryProduct) => void;
}

export const ProductCard: React.FC<Props> = ({ product, onAdd }) => (
  <View style={styles.card}>
    <AppIcon name={product.iconKey} size={44} />
    <View style={styles.info}>
      <Text style={styles.title}>{product.title}</Text>
      <Text style={styles.price}>₹{(product.priceCents / 100).toFixed(0)}</Text>
    </View>
    <TouchableOpacity style={styles.button} onPress={() => onAdd(product)}>
      <Text style={styles.buttonText}>+ ADD</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  info: { flex: 1, marginLeft: 12 },
  title: { fontSize: 15, fontWeight: '600', color: '#111827' },
  price: { fontSize: 13, fontWeight: '700', color: '#059669', marginTop: 2 },
  button: { backgroundColor: '#10B981', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  buttonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});
