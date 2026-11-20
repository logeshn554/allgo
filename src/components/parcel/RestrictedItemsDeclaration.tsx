// Job: Compliance checklist and declaration checkbox for restricted and hazardous items.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  declared: boolean;
  onToggleDeclare: (val: boolean) => void;
}

export const RestrictedItemsDeclaration: React.FC<Props> = ({
  declared,
  onToggleDeclare,
}) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>⚠️ Prohibited & Restricted Items Policy</Text>
      <Text style={styles.desc}>
        Courier regulations prohibit dispatching:
      </Text>
      <View style={styles.list}>
        <Text style={styles.bullet}>• Flammable liquids, chemicals & firecrackers</Text>
        <Text style={styles.bullet}>• Currency notes, coins & bullion jewelry</Text>
        <Text style={styles.bullet}>• Weapons, ammunition & sharp unshielded tools</Text>
        <Text style={styles.bullet}>• Perishables exceeding 2-hour ambient limits</Text>
      </View>

      <TouchableOpacity
        style={styles.checkboxRow}
        onPress={() => onToggleDeclare(!declared)}
      >
        <View style={[styles.checkbox, declared && styles.checkboxActive]}>
          {declared && <Text style={styles.checkMark}>✓</Text>}
        </View>
        <Text style={styles.agreeText}>
          I certify that this package complies with transport regulations and contains no illegal or hazardous contents.
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFBEB', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#FDE68A' },
  title: { fontSize: 13, fontWeight: '800', color: '#92400E', marginBottom: 4 },
  desc: { fontSize: 11, color: '#B45309', marginBottom: 6 },
  list: { marginBottom: 12 },
  bullet: { fontSize: 11, color: '#78350F', lineHeight: 18 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: '#D97706', backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  checkboxActive: { backgroundColor: '#D97706' },
  checkMark: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  agreeText: { flex: 1, fontSize: 11, fontWeight: '700', color: '#92400E' },
});
