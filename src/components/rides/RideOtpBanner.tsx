// Job: High-visibility 4-digit PIN banner for passenger ride verification.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  otp: string;
}

export const RideOtpBanner: React.FC<Props> = ({ otp = '4821' }) => {
  const digits = otp.slice(0, 4).split('');

  return (
    <View style={styles.banner}>
      <View style={styles.header}>
        <Text style={styles.lockIcon}>🔐</Text>
        <Text style={styles.title}>RIDE START PIN</Text>
      </View>
      <View style={styles.pinRow}>
        {digits.map((digit, idx) => (
          <View key={idx} style={styles.box}>
            <Text style={styles.digit}>{digit}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.subtitle}>
        Share this 4-digit security code with driver upon boarding to begin ride.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: { backgroundColor: '#FEF3C7', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1.5, borderColor: '#F59E0B', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  lockIcon: { fontSize: 14, marginRight: 6 },
  title: { fontSize: 12, fontWeight: '900', color: '#92400E', letterSpacing: 1 },
  pinRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 8 },
  box: { width: 44, height: 48, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 2, borderColor: '#D97706', justifyContent: 'center', alignItems: 'center', marginHorizontal: 6, shadowColor: '#B45309', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 },
  digit: { fontSize: 24, fontWeight: '900', color: '#92400E' },
  subtitle: { fontSize: 11, color: '#B45309', fontWeight: '600', textAlign: 'center' },
});
