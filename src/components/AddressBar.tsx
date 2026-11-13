// Job: Header bar showing current delivery address with quick edit trigger.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  address: string;
  onPressAddress?: () => void;
}

export const AddressBar: React.FC<Props> = ({ address, onPressAddress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPressAddress} activeOpacity={0.8}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>DELIVER TO</Text>
      </View>
      <Text style={styles.addressText} numberOfLines={1}>
        {address || 'Select delivery location'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginBottom: 12,
  },
  badge: { marginBottom: 2 },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#6B7280', letterSpacing: 0.8 },
  addressText: { fontSize: 14, fontWeight: '600', color: '#111827' },
});
