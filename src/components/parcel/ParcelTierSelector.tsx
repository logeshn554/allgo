// Job: Parcel weight and dimension package tier selector with IATA volumetric calculation.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export interface ParcelTier {
  id: string;
  name: string;
  icon: string;
  maxWeightKg: number;
  dimensionsCm: { l: number; w: number; h: number };
  basePriceInr: number;
}

export const PARCEL_TIERS: ParcelTier[] = [
  { id: 'doc', name: 'Document / Envelope', icon: '📄', maxWeightKg: 0.5, dimensionsCm: { l: 30, w: 22, h: 2 }, basePriceInr: 40 },
  { id: 'small', name: 'Small Box (< 3 kg)', icon: '📦', maxWeightKg: 3.0, dimensionsCm: { l: 20, w: 15, h: 10 }, basePriceInr: 65 },
  { id: 'medium', name: 'Medium Box (< 10 kg)', icon: '🧰', maxWeightKg: 10.0, dimensionsCm: { l: 35, w: 25, h: 20 }, basePriceInr: 120 },
  { id: 'large', name: 'Large Box (< 25 kg)', icon: '🏷️', maxWeightKg: 25.0, dimensionsCm: { l: 50, w: 40, h: 35 }, basePriceInr: 250 },
];

interface Props {
  selectedTierId: string;
  onSelectTier: (tier: ParcelTier) => void;
}

export const ParcelTierSelector: React.FC<Props> = ({ selectedTierId, onSelectTier }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Package Type & Weight</Text>
      {PARCEL_TIERS.map((tier) => {
        const isSelected = tier.id === selectedTierId;
        const volWeightKg = ((tier.dimensionsCm.l * tier.dimensionsCm.w * tier.dimensionsCm.h) / 5000).toFixed(1);
        return (
          <TouchableOpacity
            key={tier.id}
            style={[styles.tierCard, isSelected && styles.tierCardActive]}
            onPress={() => onSelectTier(tier)}
          >
            <Text style={styles.tierIcon}>{tier.icon}</Text>
            <View style={styles.info}>
              <Text style={styles.tierName}>{tier.name}</Text>
              <Text style={styles.dimensions}>
                Max {tier.maxWeightKg} kg • {tier.dimensionsCm.l}x{tier.dimensionsCm.w}x{tier.dimensionsCm.h} cm
              </Text>
              <Text style={styles.volText}>Volumetric Weight: {volWeightKg} kg</Text>
            </View>
            <View style={styles.priceBox}>
              <Text style={styles.price}>₹{tier.basePriceInr}</Text>
              <Text style={styles.baseLabel}>Base Price</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  title: { fontSize: 13, fontWeight: '800', color: '#4B5563', marginBottom: 8, textTransform: 'uppercase' },
  tierCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1.5, borderColor: '#E5E7EB' },
  tierCardActive: { borderColor: '#10B981', backgroundColor: '#ECFDF5' },
  tierIcon: { fontSize: 28, marginRight: 12 },
  info: { flex: 1 },
  tierName: { fontSize: 14, fontWeight: '800', color: '#111827' },
  dimensions: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  volText: { fontSize: 10, color: '#059669', fontWeight: '700', marginTop: 1 },
  priceBox: { alignItems: 'flex-end' },
  price: { fontSize: 16, fontWeight: '900', color: '#111827' },
  baseLabel: { fontSize: 9, color: '#9CA3AF' },
});
