// Job: Display an icon badge mapped to public/icons/ and iconAssets.ts.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  name: string;
  size?: number;
}

const EMOJI_FALLBACK: Record<string, string> = {
  grocery: '🛒',
  rides: '🚕',
  parcel: '📦',
  food: '🍔',
  produce: '🍎',
  dairy: '🥛',
  bakery: '🍞',
  household: '🧼',
  bike: '🏍️',
  auto: '🛺',
  cab: '🚗',
  premium: '🚘',
};

export const AppIcon: React.FC<Props> = ({ name, size = 40 }) => {
  const symbol = EMOJI_FALLBACK[name] || '✨';
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: size / 4 }]}>
      <Text style={{ fontSize: size * 0.55 }}>{symbol}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  box: { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
});
