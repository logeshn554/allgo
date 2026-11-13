import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { loadOrderById, SavedOrder } from '../data/orderStorage';
import { OrderStatusStepper } from '../components/OrderStatusStepper';
import { OtpPinBox } from '../components/OtpPinBox';

interface Props {
  orderId: string;
}

export const TrackOrderPage: React.FC<Props> = ({ orderId }) => {
  const [order, setOrder] = useState<SavedOrder | undefined>(() => loadOrderById(orderId));

  useEffect(() => {
    const timer = setInterval(() => setOrder(loadOrderById(orderId)), 2000);
    return () => clearInterval(timer);
  }, [orderId]);

  if (!order) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Order not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Tracking Order #{order.id}</Text>
      <Text style={styles.eta}>Estimated Arrival: {order.etaMinutes} mins</Text>
      <OrderStatusStepper currentStep={order.status} />
      {order.status !== 'delivered' && <OtpPinBox pin={order.otpPin} />}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', padding: 24 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  eta: { fontSize: 14, color: '#4B5563', marginTop: 4, marginBottom: 12 },
});
