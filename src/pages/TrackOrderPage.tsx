// Job: Screen to watch live delivery status, track live GPS stream, and display delivery PIN.

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { loadOrderById, SavedOrder } from '../data/orderStorage';
import { connectOrderStream } from '../data/liveOrderStream';
import { OrderStatusStepper } from '../components/OrderStatusStepper';
import { OtpPinBox } from '../components/OtpPinBox';
import { LiveMapBox } from '../components/LiveMapBox';

interface Props {
  orderId: string;
  onBackHome: () => void;
  onOpenDriverView: () => void;
}

export const TrackOrderPage: React.FC<Props> = ({ orderId, onBackHome, onOpenDriverView }) => {
  const [order, setOrder] = useState<SavedOrder | undefined>(() => loadOrderById(orderId));
  const [driverLoc, setDriverLoc] = useState({ latitude: 12.975, longitude: 77.601 });

  useEffect(() => {
    const timer = setInterval(() => setOrder(loadOrderById(orderId)), 2000);
    const unsubscribe = connectOrderStream(orderId, (update) => {
      if (update.status) setOrder((prev) => (prev ? { ...prev, status: update.status } : prev));
      if (update.lat && update.lng) setDriverLoc({ latitude: update.lat, longitude: update.lng });
    });
    return () => {
      clearInterval(timer);
      unsubscribe();
    };
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

      <LiveMapBox
        pickup={{ latitude: 12.9716, longitude: 77.5946 }}
        driver={driverLoc}
      />

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
  link: { color: '#4F46E5', fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  eta: { fontSize: 13, color: '#4B5563', marginTop: 2, marginBottom: 10 },
  driverBtn: { marginTop: 14, padding: 12, backgroundColor: '#EEF2FF', borderRadius: 10, alignItems: 'center' },
  driverText: { color: '#4F46E5', fontWeight: '700', fontSize: 13 },
});
