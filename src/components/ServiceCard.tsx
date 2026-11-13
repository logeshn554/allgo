// Job: Clickable card for picking Grocery, Rides, Parcel, or Driver mode.

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { AppIcon } from './AppIcon';

interface Props {
  title: string;
  subtitle: string;
  iconKey: string;
  onPress: () => void;
}

export const ServiceCard: React.FC<Props> = ({ title, subtitle, iconKey, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
    <AppIcon name={iconKey} size={48} />
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>{subtitle}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  title: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 10 },
  subtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});
