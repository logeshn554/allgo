// Job: High-priority incoming order alert modal with persistent audio ring loop and 90s countdown timer.

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { AppIcon } from '../AppIcon.tsx';
import { KdsLiveOrder } from '../../data/merchantOrderFulfillment.ts';

interface Props {
  order: KdsLiveOrder | null;
  visible: boolean;
  onAccept: (orderId: string, prepTimeMinutes: number) => void;
  onReject: (orderId: string, reason: string) => void;
}

export const IncomingOrderAlertModal: React.FC<Props> = ({
  order,
  visible,
  onAccept,
  onReject,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(90);
  const [isAudioRinging, setIsAudioRinging] = useState(true);
  const [prepTime, setPrepTime] = useState(20);

  useEffect(() => {
    if (!visible || !order) return;
    setSecondsRemaining(order.secondsRemaining > 0 ? order.secondsRemaining : 90);
    setIsAudioRinging(true);

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onReject(order.id, 'Auto-expired: 90s timeout reached');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible, order?.id]);

  if (!visible || !order) return null;

  const isUrgent = secondsRemaining < 30;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.modalCard, isUrgent && styles.modalCardUrgent]}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.titleWithIcon}>
              <AppIcon name="bell" size={28} />
              <Text style={styles.title}>INCOMING LIVE ORDER</Text>
            </View>
            <TouchableOpacity
              style={[styles.audioPill, !isAudioRinging && styles.audioPillMuted]}
              onPress={() => setIsAudioRinging((r) => !r)}
            >
              <Text style={styles.audioText}>{isAudioRinging ? '🔊 RINGING' : '🔇 MUTED'}</Text>
            </TouchableOpacity>
          </View>

          {/* Countdown Timer */}
          <View style={[styles.timerBanner, isUrgent && styles.timerBannerUrgent]}>
            <Text style={styles.timerLabel}>Auto-Reject Countdown:</Text>
            <Text style={styles.timerVal}>{secondsRemaining}s</Text>
          </View>

          {/* Order Details */}
          <View style={styles.infoCard}>
            <Text style={styles.orderId}>#{order.id} • {order.customerName}</Text>
            <Text style={styles.itemSummary}>
              {order.items.length} items • ₹{(order.totalCents / 100).toFixed(0)} total
            </Text>
            <View style={styles.itemsList}>
              {order.items.map((i) => (
                <Text key={i.id} style={styles.itemRow}>
                  • {i.quantity}x {i.name} ({i.aisle})
                </Text>
              ))}
            </View>
          </View>

          {/* Prep Time Selector */}
          <Text style={styles.prepLabel}>Select Estimated Preparation Buffer:</Text>
          <View style={styles.prepRow}>
            {[15, 20, 30].map((mins) => (
              <TouchableOpacity
                key={mins}
                style={[styles.prepBtn, prepTime === mins && styles.prepBtnActive]}
                onPress={() => setPrepTime(mins)}
              >
                <Text style={[styles.prepBtnText, prepTime === mins && styles.prepBtnTextActive]}>
                  {mins} mins
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={() => onReject(order.id, 'Merchant declined')}
            >
              <Text style={styles.rejectBtnText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={() => onAccept(order.id, prepTime)}
            >
              <Text style={styles.acceptBtnText}>ACCEPT (+{prepTime}m)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, width: '100%', maxWidth: 440, borderWidth: 2, borderColor: '#3B82F6' },
  modalCardUrgent: { borderColor: '#EF4444' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  titleWithIcon: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '900', color: '#1E3A8A' },
  audioPill: { backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  audioPillMuted: { backgroundColor: '#F1F5F9' },
  audioText: { fontSize: 11, fontWeight: '800', color: '#166534' },
  timerBanner: { backgroundColor: '#EFF6FF', borderRadius: 8, padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  timerBannerUrgent: { backgroundColor: '#FEE2E2' },
  timerLabel: { fontSize: 13, fontWeight: '700', color: '#1E40AF' },
  timerVal: { fontSize: 20, fontWeight: '900', color: '#DC2626' },
  infoCard: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, marginBottom: 12 },
  orderId: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  itemSummary: { fontSize: 12, color: '#64748B', marginTop: 2, marginBottom: 8 },
  itemsList: { gap: 4 },
  itemRow: { fontSize: 12, color: '#334155', fontWeight: '500' },
  prepLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 8 },
  prepRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  prepBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center' },
  prepBtnActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  prepBtnText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  prepBtnTextActive: { color: '#FFF' },
  actionRow: { flexDirection: 'row', gap: 10 },
  rejectBtn: { flex: 1, backgroundColor: '#FEE2E2', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  rejectBtnText: { color: '#DC2626', fontWeight: '800', fontSize: 14 },
  acceptBtn: { flex: 2, backgroundColor: '#16A34A', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  acceptBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
});
