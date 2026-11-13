// Job: Screen for the driver to update trip status and verify customer's 6-digit PIN.

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { updateOrderStatus } from '../data/orderStorage';
import { verifyDeliveryPin } from '../data/otpVerifier';

interface Props {
  activeOrderId: string | null;
  onBack: () => void;
}

export const DriverJobPage: React.FC<Props> = ({ activeOrderId, onBack }) => {
  const [orderId, setOrderId] = useState(activeOrderId || '');
  const [pin, setPin] = useState('');
  const [feedback, setFeedback] = useState('');

  const handleVerify = () => {
    const res = verifyDeliveryPin(orderId, pin);
    setFeedback(res.message);
  };

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.back}>← Back to Home</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Driver Partner Console</Text>
      <TextInput style={styles.input} value={orderId} onChangeText={setOrderId} placeholder="Order ID (e.g. ORD-123456)" />
      <View style={styles.row}>
        <TouchableOpacity style={styles.stepBtn} onPress={() => updateOrderStatus(orderId, 'matched')}>
          <Text style={styles.stepText}>Accept Order</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.stepBtn} onPress={() => updateOrderStatus(orderId, 'on_the_way')}>
          <Text style={styles.stepText}>Start Trip</Text>
        </TouchableOpacity>
      </View>
      <TextInput style={styles.input} value={pin} onChangeText={setPin} placeholder="Enter Customer 6-Digit PIN" maxLength={6} />
      <TouchableOpacity style={styles.verifyBtn} onPress={handleVerify}>
        <Text style={styles.verifyText}>Verify PIN & Complete Drop-off</Text>
      </TouchableOpacity>
      {Boolean(feedback) && <Text style={styles.feedback}>{feedback}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', padding: 20 },
  back: { color: '#4F46E5', fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  stepBtn: { flex: 0.48, backgroundColor: '#EEF2FF', padding: 12, borderRadius: 10, alignItems: 'center' },
  stepText: { color: '#4F46E5', fontWeight: '700', fontSize: 13 },
  verifyBtn: { backgroundColor: '#10B981', padding: 15, borderRadius: 12, alignItems: 'center' },
  verifyText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  feedback: { marginTop: 14, fontSize: 14, fontWeight: '700', color: '#111827', textAlign: 'center' },
});
