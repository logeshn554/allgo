// Job: Driver custody handover verification with sealed bag count entry and 4-digit mutual PIN check.

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { AppIcon } from '../AppIcon.tsx';
import { KdsLiveOrder } from '../../data/merchantOrderFulfillment.ts';

interface Props {
  order: KdsLiveOrder;
  onCompleteHandover: (orderId: string, enteredOtp: string, sealedBagsCount: number) => void;
}

export const DriverHandoverCustodyBox: React.FC<Props> = ({
  order,
  onCompleteHandover,
}) => {
  const [pin, setPin] = useState('');
  const [bagsCount, setBagsCount] = useState('1');

  const count = parseInt(bagsCount, 10) || 0;
  const canSubmit = pin.trim().length === 4 && count >= 1;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <AppIcon name="truck" size={24} />
        <Text style={styles.title}>Driver Custody Handover</Text>
      </View>
      <Text style={styles.subTitle}>
        Driver partner arrived. Verify tamper-proof sealed bag count and ask driver for their 4-digit PIN.
      </Text>

      {/* Sealed Bag Count */}
      <Text style={styles.label}>Number of Sealed Packages / Bags:</Text>
      <View style={styles.bagCounterRow}>
        {[1, 2, 3, 4].map((num) => (
          <TouchableOpacity
            key={num}
            style={[styles.bagBtn, count === num && styles.bagBtnActive]}
            onPress={() => setBagsCount(String(num))}
          >
            <Text style={[styles.bagText, count === num && styles.bagTextActive]}>
              {num} {num === 1 ? 'Bag' : 'Bags'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 4-Digit Handover PIN */}
      <Text style={styles.label}>Driver 4-Digit Handover PIN:</Text>
      <TextInput
        style={styles.pinInput}
        value={pin}
        onChangeText={setPin}
        placeholder="Enter 4-digit PIN (e.g. 4821)"
        keyboardType="number-pad"
        maxLength={4}
      />

      <TouchableOpacity
        style={[styles.handoverBtn, !canSubmit && styles.handoverBtnDisabled]}
        onPress={() => onCompleteHandover(order.id, pin, count)}
        disabled={!canSubmit}
      >
        <Text style={styles.handoverBtnText}>
          {canSubmit ? 'Verify & Transfer Custody' : 'Enter 4-Digit PIN & Bags'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 16, marginTop: 10, borderWidth: 1, borderColor: '#BBF7D0' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  title: { fontSize: 15, fontWeight: '800', color: '#166534' },
  subTitle: { fontSize: 12, color: '#15803D', marginBottom: 12, lineHeight: 17 },
  label: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6 },
  bagCounterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  bagBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFF', alignItems: 'center' },
  bagBtnActive: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  bagText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  bagTextActive: { color: '#FFF' },
  pinInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 16, fontWeight: '800', letterSpacing: 4, textAlign: 'center', marginBottom: 12 },
  handoverBtn: { backgroundColor: '#16A34A', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  handoverBtnDisabled: { backgroundColor: '#94A3B8' },
  handoverBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
});
