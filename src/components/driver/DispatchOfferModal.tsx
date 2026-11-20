// Job: Full-screen lockscreen-wake style job offer modal with vertical badge, upfront earnings, and 15s countdown.

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { AppIcon } from '../AppIcon.tsx';
import { DispatchOffer } from '../../data/driverDispatchService.ts';

interface Props {
  offer: DispatchOffer | null;
  visible: boolean;
  onAccept: (offerId: string) => void;
  onReject: (offerId: string) => void;
}

export const DispatchOfferModal: React.FC<Props> = ({
  offer,
  visible,
  onAccept,
  onReject,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(15);

  useEffect(() => {
    if (!visible || !offer) return;
    setSecondsRemaining(15);

    const timer = setInterval(() => {
      setSecondsRemaining((s) => {
        if (s <= 1) {
          clearInterval(timer);
          onReject(offer.offerId);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible, offer?.offerId]);

  if (!visible || !offer) return null;

  const verticalColor =
    offer.vertical === 'RIDE'
      ? '#F59E0B'
      : offer.vertical === 'GROCERY'
      ? '#10B981'
      : '#6366F1';

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Top Badge and Timer */}
          <View style={styles.topRow}>
            <View style={[styles.verticalBadge, { backgroundColor: verticalColor }]}>
              <Text style={styles.verticalText}>{offer.vertical}</Text>
            </View>
            <View style={[styles.timerBadge, secondsRemaining <= 5 && styles.timerBadgeUrgent]}>
              <Text style={styles.timerText}>{secondsRemaining}s</Text>
            </View>
          </View>

          {/* Upfront Earnings */}
          <View style={styles.earningsBox}>
            <Text style={styles.earningsLabel}>Guaranteed Upfront Earnings</Text>
            <Text style={styles.earningsVal}>₹{offer.netEarningsInr}</Text>
            <Text style={styles.distanceSummary}>
              {offer.totalDistanceKm} km total trip • Est. 25 mins
            </Text>
          </View>

          {/* Route Milestones */}
          <View style={styles.routeBox}>
            <View style={styles.milestoneRow}>
              <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.milestoneLabel}>Pickup ({offer.pickupDistanceKm} km away)</Text>
                <Text style={styles.addressText} numberOfLines={1}>{offer.pickupAddress}</Text>
              </View>
            </View>
            <View style={styles.routeDivider} />
            <View style={styles.milestoneRow}>
              <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.milestoneLabel}>Drop-off ({offer.dropDistanceKm} km)</Text>
                <Text style={styles.addressText} numberOfLines={1}>{offer.dropAddress}</Text>
              </View>
            </View>
          </View>

          {/* Accept / Reject Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={() => onReject(offer.offerId)}
            >
              <Text style={styles.rejectText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={() => onAccept(offer.offerId)}
            >
              <Text style={styles.acceptText}>ACCEPT ORDER</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, width: '100%', maxWidth: 420, borderWidth: 2, borderColor: '#10B981' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  verticalBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  verticalText: { color: '#FFF', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  timerBadge: { backgroundColor: '#EFF6FF', borderWidth: 2, borderColor: '#3B82F6', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  timerBadgeUrgent: { borderColor: '#EF4444', backgroundColor: '#FEE2E2' },
  timerText: { fontSize: 16, fontWeight: '900', color: '#1E40AF' },
  earningsBox: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 14 },
  earningsLabel: { fontSize: 12, color: '#64748B', fontWeight: '700' },
  earningsVal: { fontSize: 36, fontWeight: '900', color: '#10B981', marginVertical: 4 },
  distanceSummary: { fontSize: 12, color: '#475569', fontWeight: '600' },
  routeBox: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, marginBottom: 16 },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  routeDivider: { width: 2, height: 16, backgroundColor: '#CBD5E1', marginLeft: 5, marginVertical: 4 },
  milestoneLabel: { fontSize: 11, fontWeight: '800', color: '#64748B' },
  addressText: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginTop: 1 },
  actionRow: { flexDirection: 'row', gap: 12 },
  rejectBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#FEE2E2', alignItems: 'center' },
  rejectText: { color: '#DC2626', fontWeight: '800', fontSize: 14 },
  acceptBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: '#10B981', alignItems: 'center' },
  acceptText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },
});
