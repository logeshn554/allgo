// Job: Dual security PIN display showing Sender Pickup OTP and Recipient Delivery OTP.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  pickupOtp: string;
  deliveryOtp: string;
}

export const DualOtpDisplay: React.FC<Props> = ({
  pickupOtp = '6612',
  deliveryOtp = '8834',
}) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>🔒 Two-Factor Parcel Handover PINs</Text>

      <View style={styles.row}>
        {/* Sender Pickup OTP */}
        <View style={styles.pinCol}>
          <Text style={styles.pinLabel}>SENDER PICKUP PIN</Text>
          <View style={styles.pinBadge}>
            <Text style={styles.pinVal}>{pickupOtp}</Text>
          </View>
          <Text style={styles.pinHint}>Share with courier at pickup</Text>
        </View>

        <View style={styles.divider} />

        {/* Recipient Drop OTP */}
        <View style={styles.pinCol}>
          <Text style={styles.pinLabel}>RECIPIENT DROP PIN</Text>
          <View style={[styles.pinBadge, styles.dropBadge]}>
            <Text style={[styles.pinVal, styles.dropVal]}>{deliveryOtp}</Text>
          </View>
          <Text style={styles.pinHint}>Share with courier at doorstep</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  title: { fontSize: 13, fontWeight: '800', color: '#111827', marginBottom: 12, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  pinCol: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  pinLabel: { fontSize: 10, fontWeight: '800', color: '#6B7280', letterSpacing: 0.5, marginBottom: 6 },
  pinBadge: { backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1.5, borderColor: '#6366F1', marginBottom: 4 },
  pinVal: { fontSize: 20, fontWeight: '900', color: '#4338CA', letterSpacing: 2 },
  dropBadge: { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
  dropVal: { color: '#065F46' },
  pinHint: { fontSize: 9, color: '#9CA3AF', textAlign: 'center' },
  divider: { width: 1, height: 50, backgroundColor: '#E5E7EB' },
});
