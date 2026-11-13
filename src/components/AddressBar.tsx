// Job: Top bar showing the customer's delivery address and profile name.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  address: string;
  userName: string;
  onSwitchRole?: () => void;
}

export const AddressBar: React.FC<Props> = ({ address, userName, onSwitchRole }) => (
  <View style={styles.bar}>
    <View>
      <Text style={styles.label}>DELIVERING TO</Text>
      <Text style={styles.address}>{address}</Text>
    </View>
    {onSwitchRole && (
      <TouchableOpacity style={styles.badge} onPress={onSwitchRole}>
        <Text style={styles.badgeText}>Hi, {userName}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  label: { fontSize: 10, fontWeight: '700', color: '#6B7280', letterSpacing: 0.8 },
  address: { fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 2 },
  badge: { backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#4F46E5' },
});
