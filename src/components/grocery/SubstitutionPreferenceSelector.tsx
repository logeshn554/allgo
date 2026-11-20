// Job: Selector for out-of-stock item substitution preferences during grocery checkout.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export type SubstitutionPreference = 'BEST_MATCH' | 'CALL_ME' | 'REFUND';

interface Props {
  selectedPreference: SubstitutionPreference;
  onSelectPreference: (pref: SubstitutionPreference) => void;
}

const PREFERENCE_OPTIONS: Array<{
  id: SubstitutionPreference;
  title: string;
  desc: string;
  icon: string;
}> = [
  { id: 'BEST_MATCH', title: 'Best Match Substitute', desc: 'Picker chooses closest brand or size', icon: '✨' },
  { id: 'CALL_ME', title: 'Call Me First', desc: 'Confirm substitute by phone before bagging', icon: '📞' },
  { id: 'REFUND', title: 'Refund Item Immediately', desc: 'Do not substitute, instant wallet credit', icon: '💳' },
];

export const SubstitutionPreferenceSelector: React.FC<Props> = ({
  selectedPreference,
  onSelectPreference,
}) => {
  return (
    <View style={styles.card}>
      <Text style={styles.header}>If an item is out of stock:</Text>
      {PREFERENCE_OPTIONS.map((opt) => {
        const isSelected = opt.id === selectedPreference;
        return (
          <TouchableOpacity
            key={opt.id}
            style={[styles.row, isSelected && styles.rowActive]}
            onPress={() => onSelectPreference(opt.id)}
          >
            <Text style={styles.icon}>{opt.icon}</Text>
            <View style={styles.info}>
              <Text style={[styles.title, isSelected && styles.titleActive]}>{opt.title}</Text>
              <Text style={styles.desc}>{opt.desc}</Text>
            </View>
            <View style={[styles.radio, isSelected && styles.radioActive]}>
              {isSelected && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  header: { fontSize: 13, fontWeight: '800', color: '#374151', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 10, borderRadius: 10, marginBottom: 8, borderWidth: 1.5, borderColor: '#E5E7EB' },
  rowActive: { borderColor: '#10B981', backgroundColor: '#F0FDF4' },
  icon: { fontSize: 20, marginRight: 10 },
  info: { flex: 1 },
  title: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
  titleActive: { color: '#065F46' },
  desc: { fontSize: 11, color: '#6B7280', marginTop: 1 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#9CA3AF', justifyContent: 'center', alignItems: 'center' },
  radioActive: { borderColor: '#10B981' },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
});
