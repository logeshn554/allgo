// Job: Floating bottom bar showing cart item count, subtotal, and Checkout button.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CartItem } from '../data/cartStorage';

interface Props {
  items: CartItem[];
  onCheckout: () => void;
}

export const CartBar: React.FC<Props> = ({ items, onCheckout }) => {
  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);

  if (count === 0) return null;

  return (
    <View style={styles.bar}>
      <Text style={styles.summary}>
        {count} item(s) • ₹{(subtotal / 100).toFixed(0)}
      </Text>
      <TouchableOpacity style={styles.btn} onPress={onCheckout}>
        <Text style={styles.btnText}>Go to Checkout →</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 14,
    marginTop: 12,
  },
  summary: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  btn: { backgroundColor: '#10B981', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  btnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
