// Job: Selectable row showing Bike, Auto, or Cab option with ETA and fare.

import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { RideOption, calculateRideFareCents } from '../data/rideOptionsLoader.ts';
import { AppIcon } from './AppIcon.tsx';

interface Props {
  option: RideOption;
  distanceKm: number;
  selected: boolean;
  onSelect: (option: RideOption) => void;
}

export const RideTierRow: React.FC<Props> = ({ option, distanceKm, selected, onSelect }) => {
  const fareCents = calculateRideFareCents(option, distanceKm);
  return (
    <TouchableOpacity
      style={[styles.row, selected && styles.rowSelected]}
      onPress={() => onSelect(option)}
    >
      <AppIcon name={option.iconKey} size={44} />
      <View style={styles.mid}>
        <Text style={styles.title}>{option.title}</Text>
        <Text style={styles.eta}>{option.etaMinutes} mins away</Text>
      </View>
      <Text style={styles.fare}>₹{(fareCents / 100).toFixed(0)}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  rowSelected: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  mid: { flex: 1, marginLeft: 12 },
  title: { fontSize: 15, fontWeight: '700', color: '#111827' },
  eta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  fare: { fontSize: 16, fontWeight: '800', color: '#111827' },
});
