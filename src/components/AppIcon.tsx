// Job: Render icon badges mapped to design-system iconAssets and SVG paths.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { iconAssets } from '../design-system/iconAssets.ts';

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
  wallet: '💳',
  sos: '🚨',
  shield: '🛡️',
  chat: '💬',
  dispute: '⚖️',
  camera: '📷',
  share: '🔗',
  pin: '📍',
  bell: '🔔',
  check: '✅',
  printer: '🖨️',
  clock: '⏱️',
  box: '📦',
  truck: '🚚',
  pause: '⏸️',
  play: '▶️',
  barcode: '🏷️',
};

export const AppIcon: React.FC<Props> = ({ name, size = 40 }) => {
  const assetPath =
    (iconAssets.services as any)[name] ||
    (iconAssets.rides as any)[name] ||
    (iconAssets.grocery as any)[name] ||
    (iconAssets as any).ui?.[name];

  const symbol = EMOJI_FALLBACK[name] || '✨';

  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: size / 4 }]}>
      <Text style={{ fontSize: size * 0.55 }} testID={assetPath ? `icon-${name}` : undefined}>
        {symbol}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  box: { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
});
