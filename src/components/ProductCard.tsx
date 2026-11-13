// Job: Display grocery product card with an Add to Cart button.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  title: string;
  priceCents: number;
  onAdd: () => void;
}

export const ProductCard: React.FC<Props> = ({ title, priceCents, onAdd }) => {
  return (
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.price}>₹{(priceCents / 100).toFixed(2)}</Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={onAdd}>
        <Text style={styles.buttonText}>Add</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600', color: '#111827' },
  price: { fontSize: 13, color: '#059669', marginTop: 2, fontWeight: '700' },
  button: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
});
