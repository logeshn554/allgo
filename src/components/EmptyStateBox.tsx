// Job: Display empty state message and call to action when no data exists.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  title: string;
  subtitle: string;
  buttonLabel?: string;
  onPressButton?: () => void;
}

export const EmptyStateBox: React.FC<Props> = ({ title, subtitle, buttonLabel, onPressButton }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📦</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {buttonLabel && onPressButton && (
        <TouchableOpacity style={styles.btn} onPress={onPressButton}>
          <Text style={styles.btnText}>{buttonLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 32, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 40, marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 4, marginBottom: 16 },
  btn: { backgroundColor: '#10B981', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});
