// Job: Screen to watch live dynamic ETA, route polyline, 4-digit PIN handover, masked calling, and cancellation window.

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { loadOrderById, SavedOrder } from '../data/orderStorage.ts';
import { connectOrderStream } from '../data/liveOrderStream.ts';
import { calculateDynamicEta, DynamicEtaUpdate } from '../data/dynamicEtaService.ts';
import { getOrderGracePeriodStatus, cancelOrderWithinGracePeriod, GracePeriodStatus } from '../data/orderModificationService.ts';
import { createMaskedCallSession, MaskedCallSession } from '../data/communicationMasking.ts';
import { OrderStatusStepper } from '../components/OrderStatusStepper.tsx';
import { OtpPinBox } from '../components/OtpPinBox.tsx';
import { RoutePolylineView } from '../components/RoutePolylineView.tsx';
import { MaskedCallModal } from '../components/MaskedCallModal.tsx';

interface Props {
  orderId: string;
  onBackHome: () => void;
  onOpenDriverView: () => void;
}

export const TrackOrderPage: React.FC<Props> = ({ orderId, onBackHome, onOpenDriverView }) => {
  const [order, setOrder] = useState<SavedOrder | undefined>(() => loadOrderById(orderId));
  const [driverLoc, setDriverLoc] = useState({ latitude: 12.975, longitude: 77.601 });
  const [destLoc] = useState({ latitude: 12.9716, longitude: 77.5946 });
  const [eta, setEta] = useState<DynamicEtaUpdate>(() =>
    calculateDynamicEta(driverLoc, destLoc, 3500)
  );
  const [grace, setGrace] = useState<GracePeriodStatus>(() => getOrderGracePeriodStatus(orderId));
  const [showMaskedModal, setShowMaskedModal] = useState(false);
  const [maskedSession] = useState<MaskedCallSession>(() =>
    createMaskedCallSession(orderId, 'cust_1', 'driver_1')
  );
  const [cancelFeedback, setCancelFeedback] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const refreshed = loadOrderById(orderId);
      setOrder(refreshed);
      setGrace(getOrderGracePeriodStatus(orderId));
      setEta(calculateDynamicEta(driverLoc, destLoc, 3500));
    }, 1000);

    const unsubscribe = connectOrderStream(orderId, (update) => {
      if (update.status) setOrder((prev) => (prev ? { ...prev, status: update.status } : prev));
      if (update.lat && update.lng) {
        setDriverLoc({ latitude: update.lat, longitude: update.lng });
        setEta(calculateDynamicEta({ latitude: update.lat, longitude: update.lng }, destLoc, 3500));
      }
    });

    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, [orderId, driverLoc, destLoc]);

  const handleCancelGraceOrder = () => {
    const res = cancelOrderWithinGracePeriod(orderId);
    setCancelFeedback(res.message);
    if (res.success) {
      setOrder(loadOrderById(orderId));
    }
  };

  if (!order) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Order not found</Text>
        <TouchableOpacity onPress={onBackHome}>
          <Text style={styles.link}>Return Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen}>
      <TouchableOpacity onPress={onBackHome}>
        <Text style={styles.link}>← Back to Home</Text>
      </TouchableOpacity>

      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Order #{order.id}</Text>
          <Text style={styles.etaSubtitle}>
            Live Dynamic ETA: ~{Math.ceil(eta.remainingSeconds / 60)} mins ({eta.remainingMeters}m away)
          </Text>
        </View>
        <TouchableOpacity style={styles.maskedBtn} onPress={() => setShowMaskedModal(true)}>
          <Text style={styles.maskedBtnText}>🔒 Masked Call / Chat</Text>
        </TouchableOpacity>
      </View>

      {/* 60-120s Grace Period Cancellation Bar */}
      {grace.isWithinGracePeriod && order.status === 'confirmed' && (
        <View style={styles.graceBox}>
          <View style={styles.graceHeader}>
            <Text style={styles.graceTitle}>⚡ Grace Period Active ({grace.secondsRemaining}s left)</Text>
            <TouchableOpacity style={styles.cancelGraceBtn} onPress={handleCancelGraceOrder}>
              <Text style={styles.cancelGraceText}>Cancel Order (100% Refund)</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.graceSub}>
            Cancel without penalty before merchant kitchen accepts. Instant refund to your AllGo wallet.
          </Text>
        </View>
      )}

      {cancelFeedback && (
        <View style={styles.feedbackBox}>
          <Text style={styles.feedbackText}>{cancelFeedback}</Text>
        </View>
      )}

      {/* Route Polyline & Dynamic Telematics Map */}
      <RoutePolylineView
        pickup={{ latitude: 12.980, longitude: 77.605 }}
        destination={destLoc}
        driver={driverLoc}
        etaUpdate={eta}
      />

      <OrderStatusStepper currentStep={order.status} />

      {/* 4-Digit Handover Verification PIN */}
      {order.status !== 'delivered' && order.status !== 'cancelled' && <OtpPinBox pin={order.otpPin} />}

      <TouchableOpacity style={styles.driverBtn} onPress={onOpenDriverView}>
        <Text style={styles.driverText}>Driver Partner Drop-off Console →</Text>
      </TouchableOpacity>

      {/* Masked Call & Ephemeral Chat Modal */}
      <MaskedCallModal
        visible={showMaskedModal}
        orderId={orderId}
        session={maskedSession}
        onClose={() => setShowMaskedModal(false)}
      />
      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', padding: 20 },
  link: { color: '#6200EA', fontWeight: '700', marginBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  etaSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  maskedBtn: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  maskedBtnText: { color: '#334155', fontSize: 11, fontWeight: '700' },
  graceBox: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 10, padding: 12, marginBottom: 12 },
  graceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  graceTitle: { fontSize: 13, fontWeight: '800', color: '#B91C1C' },
  cancelGraceBtn: { backgroundColor: '#DC2626', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  cancelGraceText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  graceSub: { fontSize: 11, color: '#991B1B' },
  feedbackBox: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', borderRadius: 10, padding: 10, marginBottom: 12 },
  feedbackText: { color: '#065F46', fontSize: 12, fontWeight: '600' },
  driverBtn: { marginTop: 14, padding: 14, backgroundColor: '#F3E8FF', borderRadius: 10, alignItems: 'center' },
  driverText: { color: '#6200EA', fontWeight: '800', fontSize: 13 },
});
