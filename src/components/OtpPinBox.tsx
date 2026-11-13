import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  pin: string;
}

export const OtpPinBox: React.FC<Props> = ({ pin }) => (
  <View style={styles.card}>
    <Text style={styles.caption}>Share this PIN with your driver at the door</Text>
    <Text style={styles.pinText}>{pin}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 },
  caption: { fontSize: 12, color: '#4B5563', marginBottom: 4 },
  pinText: { fontSize: 26, fontWeight: '800', letterSpacing: 6, color: '#111827' },
});
