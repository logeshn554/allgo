// Job: Selectable row showing Bike, Auto, or Cab with arrival time and price.

import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { RideTier } from '../data/rideOptionsLoader';

interface Props {
  tier: RideTier;
  priceCents: number;
  isSelected: boolean;
  onSelect: () => void;
}

export const RideTierRow: React.FC<Props> = ({ tier, priceCents, isSelected, onSelect }) => {
  return (
    <TouchableOpacity
      style={[styles.row, isSelected && styles.rowActive]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.infoCol}>
        <Text style={[styles.name, isSelected && styles.nameActive]}>{tier.name}</Text>
        <Text style={styles.etaText}>{tier.etaMinutes} mins away</Text>
      </View>
      <Text style={styles.priceText}>₹{(priceCents / 100).toFixed(2)}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  rowActive: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  infoCol: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  nameActive: { color: '#065F46' },
  etaText: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  priceText: { fontSize: 16, fontWeight: '800', color: '#111827' },
});
