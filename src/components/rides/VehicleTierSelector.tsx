// Job: Tier selector for Bike, Auto, Mini, and Prime SUV with server-signed fare quote IDs.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AppIcon } from '../AppIcon.tsx';

export interface VehicleTierOption {
  id: string;
  name: string;
  iconName: string;
  capacity: number;
  etaMins: number;
  baseFareInr: number;
  quoteId: string;
  signature?: string;
}

interface Props {
  tiers: VehicleTierOption[];
  selectedTierId: string;
  onSelectTier: (tier: VehicleTierOption) => void;
}

export const VehicleTierSelector: React.FC<Props> = ({
  tiers,
  selectedTierId,
  onSelectTier,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Select Vehicle Category</Text>
      {tiers.map((t) => {
        const isSelected = t.id === selectedTierId;
        return (
          <TouchableOpacity
            key={t.id}
            style={[styles.tierCard, isSelected && styles.tierCardActive]}
            onPress={() => onSelectTier(t)}
          >
            <AppIcon name={t.iconName} size={36} />
            <View style={styles.info}>
              <View style={styles.titleRow}>
                <Text style={styles.name}>{t.name}</Text>
                <Text style={styles.capacity}>👥 {t.capacity}</Text>
              </View>
              <Text style={styles.eta}>ETA: {t.etaMins} mins away</Text>
              {t.signature && (
                <View style={styles.badgeRow}>
                  <Text style={styles.quoteBadge}>🛡️ Signed Quote: {t.quoteId.slice(0, 8)}...</Text>
                </View>
              )}
            </View>
            <View style={styles.priceBox}>
              <Text style={styles.price}>₹{t.baseFareInr}</Text>
              <Text style={styles.gstText}>incl. 5% GST</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  header: { fontSize: 13, fontWeight: '700', color: '#4B5563', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  tierCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1.5, borderColor: '#E5E7EB' },
  tierCardActive: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  info: { flex: 1, marginLeft: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '800', color: '#111827' },
  capacity: { fontSize: 11, color: '#6B7280', marginLeft: 8 },
  eta: { fontSize: 12, color: '#4B5563', marginTop: 2 },
  badgeRow: { marginTop: 4 },
  quoteBadge: { fontSize: 10, color: '#059669', fontWeight: '700' },
  priceBox: { alignItems: 'flex-end' },
  price: { fontSize: 16, fontWeight: '800', color: '#111827' },
  gstText: { fontSize: 9, color: '#9CA3AF' },
});
