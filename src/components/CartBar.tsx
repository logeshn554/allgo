// Job: Floating bar showing total cart items and navigation to checkout.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  itemCount: number;
  subtotalCents: number;
  onViewCart: () => void;
}

export const CartBar: React.FC<Props> = ({ itemCount, subtotalCents, onViewCart }) => {
  if (itemCount === 0) return null;

  return (
    <View style={styles.bar}>
      <View>
        <Text style={styles.countText}>{itemCount} items</Text>
        <Text style={styles.subtotalText}>₹{(subtotalCents / 100).toFixed(2)}</Text>
      </View>
      <TouchableOpacity style={styles.checkoutBtn} onPress={onViewCart}>
        <Text style={styles.btnText}>View Cart & Checkout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  countText: { color: '#9CA3AF', fontSize: 12 },
  subtotalText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  checkoutBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
});
