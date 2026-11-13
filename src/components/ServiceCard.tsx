// Job: Clickable card component for services (Rides, Grocery, Parcel).

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { AppIcon } from './AppIcon';

interface Props {
  title: string;
  iconName: string;
  onPress: () => void;
}

export const ServiceCard: React.FC<Props> = ({ title, iconName, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <AppIcon name={iconName} category="services" />
      <Text style={styles.title}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    margin: 6,
  },
  title: { marginTop: 8, fontSize: 13, fontWeight: '600', color: '#1F2937' },
});
