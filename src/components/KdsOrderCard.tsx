// Job: KDS kitchen display order card with timer, item checkoffs, and ready-for-pickup action.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export interface KdsOrder {
  id: string;
  customerName: string;
  items: { name: string; quantity: number; notes?: string }[];
  status: 'NEW' | 'PREPARING' | 'READY_FOR_PICKUP';
  prepTimeMinutes: number;
  minutesRemaining: number;
  handoverOtp: string;
}

interface Props {
  order: KdsOrder;
  onUpdateStatus: (orderId: string, nextStatus: 'PREPARING' | 'READY_FOR_PICKUP') => void;
  onPrintTicket: (order: KdsOrder) => void;
}

export const KdsOrderCard: React.FC<Props> = ({ order, onUpdateStatus, onPrintTicket }) => {
  const isUrgent = order.minutesRemaining <= 3;
  const isWarning = order.minutesRemaining <= 7 && !isUrgent;

  return (
    <View style={[styles.card, isUrgent && styles.cardUrgent]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.orderId}>#{order.id}</Text>
          <Text style={styles.custName}>{order.customerName}</Text>
        </View>
        <View style={[styles.timerBadge, isUrgent ? styles.timerUrgent : isWarning ? styles.timerWarning : styles.timerNormal]}>
          <Text style={styles.timerText}>{order.minutesRemaining}m</Text>
        </View>
      </View>

      {/* Items list */}
      <View style={styles.itemsList}>
        {order.items.map((it, idx) => (
          <View key={idx} style={styles.itemRow}>
            <Text style={styles.itemQty}>{it.quantity}x</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{it.name}</Text>
              {it.notes && <Text style={styles.itemNote}>Note: {it.notes}</Text>}
            </View>
          </View>
        ))}
      </View>

      {/* OTP Display for Courier Handover */}
      <View style={styles.otpRow}>
        <Text style={styles.otpLabel}>Courier Handover OTP:</Text>
        <Text style={styles.otpValue}>{order.handoverOtp}</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.printBtn} onPress={() => onPrintTicket(order)}>
          <Text style={styles.printText}>🖨️ Print Ticket</Text>
        </TouchableOpacity>

        {order.status === 'NEW' && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => onUpdateStatus(order.id, 'PREPARING')}>
            <Text style={styles.actionText}>Start Prep</Text>
          </TouchableOpacity>
        )}

        {order.status === 'PREPARING' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.readyBtn]}
            onPress={() => onUpdateStatus(order.id, 'READY_FOR_PICKUP')}
          >
            <Text style={styles.actionText}>Ready for Pickup ✓</Text>
          </TouchableOpacity>
        )}

        {order.status === 'READY_FOR_PICKUP' && (
          <View style={styles.readyBadge}>
            <Text style={styles.readyBadgeText}>Courier Dispatch Notified</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardUrgent: { borderColor: '#EF4444', backgroundColor: '#FFF5F5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderId: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  custName: { fontSize: 12, color: '#64748B', marginTop: 1 },
  timerBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  timerNormal: { backgroundColor: '#00C853' },
  timerWarning: { backgroundColor: '#F59E0B' },
  timerUrgent: { backgroundColor: '#EF4444' },
  timerText: { color: '#FFF', fontWeight: '900', fontSize: 14 },
  itemsList: { marginBottom: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  itemQty: { fontWeight: '900', color: '#6200EA', marginRight: 8, fontSize: 14 },
  itemName: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  itemNote: { fontSize: 11, color: '#DC2626', fontStyle: 'italic', marginTop: 1 },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  otpLabel: { fontSize: 11, fontWeight: '700', color: '#475569' },
  otpValue: { fontSize: 14, fontWeight: '900', color: '#0F172A', letterSpacing: 2 },
  actionsRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  printBtn: { flex: 1, backgroundColor: '#F1F5F9', padding: 10, borderRadius: 8, alignItems: 'center' },
  printText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  actionBtn: { flex: 1.2, backgroundColor: '#6200EA', padding: 10, borderRadius: 8, alignItems: 'center' },
  readyBtn: { backgroundColor: '#00C853' },
  actionText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  readyBadge: { flex: 1.2, backgroundColor: '#DCFCE7', padding: 8, borderRadius: 6, alignItems: 'center' },
  readyBadgeText: { color: '#15803D', fontWeight: '800', fontSize: 11 },
});
