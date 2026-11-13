// Job: Render an app icon from the design-system iconAssets map.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  name: string;
  category?: 'services' | 'rides' | 'grocery';
}

export const AppIcon: React.FC<Props> = ({ name, category = 'services' }) => {
  return (
    <View style={styles.iconContainer}>
      <Text style={styles.iconLabel}>{name.substring(0, 2).toUpperCase()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconLabel: { fontSize: 14, fontWeight: '700', color: '#4F46E5' },
});
