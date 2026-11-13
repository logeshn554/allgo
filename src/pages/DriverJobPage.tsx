// Job: Screen for the driver to view order, accept, navigate, and verify customer PIN.

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { loadOrderById, updateOrderStatus } from '../data/orderStorage';
import { verifyDeliveryPin } from '../data/otpVerifier';

interface Props {
  orderId: string;
  onJobComplete: () => void;
}

export const DriverJobPage: React.FC<Props> = ({ orderId, onJobComplete }) => {
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');
  const order = loadOrderById(orderId);

  const handleStartTrip = () => {
    updateOrderStatus(orderId, 'on_the_way');
    setMessage('Status: Out for delivery');
  };

  const handleVerify = () => {
    const res = verifyDeliveryPin(orderId, pin);
    setMessage(res.message);
    if (res.ok) {
      setTimeout(() => onJobComplete(), 1500);
    }
  };

  if (!order) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>No active delivery job</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Delivery Job #{order.id}</Text>
      <Text style={styles.status}>Current Status: {order.status.toUpperCase()}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Order Payout</Text>
        <Text style={styles.payout}>₹{(order.totalCents / 100).toFixed(2)}</Text>
        <Text style={styles.eta}>Customer ETA: {order.etaMinutes} mins</Text>
      </View>

      {order.status !== 'on_the_way' && order.status !== 'delivered' && (
        <TouchableOpacity style={styles.actionBtn} onPress={handleStartTrip}>
          <Text style={styles.btnText}>Start Delivery Trip</Text>
        </TouchableOpacity>
      )}

      {order.status === 'on_the_way' && (
        <View style={styles.verifyBox}>
          <Text style={styles.verifyLabel}>Enter Customer PIN at Door</Text>
          <TextInput
            style={styles.pinInput}
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="6-digit PIN"
          />
          <TouchableOpacity style={styles.verifyBtn} onPress={handleVerify}>
            <Text style={styles.btnText}>Confirm Delivery</Text>
          </TouchableOpacity>
        </View>
      )}

      {Boolean(message) && <Text style={styles.messageText}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', padding: 24 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  status: { fontSize: 13, color: '#059669', fontWeight: '700', marginTop: 4, marginBottom: 16 },
  card: { backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 },
  cardTitle: { fontSize: 12, color: '#6B7280', textTransform: 'uppercase' },
  payout: { fontSize: 24, fontWeight: '900', color: '#111827', marginVertical: 4 },
  eta: { fontSize: 13, color: '#4B5563' },
  actionBtn: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center' },
  verifyBox: { marginTop: 10 },
  verifyLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  pinInput: { borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, fontSize: 18, textAlign: 'center', letterSpacing: 4, marginBottom: 12 },
  verifyBtn: { backgroundColor: '#2563EB', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  messageText: { marginTop: 16, textAlign: 'center', fontSize: 14, fontWeight: '600', color: '#D97706' },
});
