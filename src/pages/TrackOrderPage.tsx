// Job: Screen to watch live delivery status and display the 6-digit PIN.

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { loadOrderById, SavedOrder } from '../data/orderStorage';
import { OrderStatusStepper } from '../components/OrderStatusStepper';
import { OtpPinBox } from '../components/OtpPinBox';

interface Props {
  orderId: string;
  onBackHome: () => void;
  onOpenDriverView: () => void;
}

export const TrackOrderPage: React.FC<Props> = ({ orderId, onBackHome, onOpenDriverView }) => {
  const [order, setOrder] = useState<SavedOrder | undefined>(() => loadOrderById(orderId));

  useEffect(() => {
    const timer = setInterval(() => setOrder(loadOrderById(orderId)), 1500);
    return () => clearInterval(timer);
  }, [orderId]);

  if (!order) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Order not found</Text>
        <TouchableOpacity onPress={onBackHome}><Text style={styles.link}>Return Home</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={onBackHome}><Text style={styles.link}>← Back to Home</Text></TouchableOpacity>
      <Text style={styles.title}>Order #{order.id}</Text>
      <Text style={styles.eta}>Estimated Arrival: {order.etaMinutes} mins</Text>
      <OrderStatusStepper currentStep={order.status} />
      {order.status !== 'delivered' && <OtpPinBox pin={order.otpPin} />}
      <TouchableOpacity style={styles.driverBtn} onPress={onOpenDriverView}>
        <Text style={styles.driverText}>Simulate Driver PIN Check →</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', padding: 20 },
  link: { color: '#4F46E5', fontWeight: '600', marginBottom: 10 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  eta: { fontSize: 14, color: '#4B5563', marginTop: 4, marginBottom: 12 },
  driverBtn: { marginTop: 20, padding: 12, backgroundColor: '#EEF2FF', borderRadius: 10, alignItems: 'center' },
  driverText: { color: '#4F46E5', fontWeight: '700', fontSize: 13 },
});
