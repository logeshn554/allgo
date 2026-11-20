// Job: Real-time Kitchen/Store Display System (KDS) page with incoming order alerts, batch picking, OOS handling, and driver handover.

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { AppIcon } from '../../components/AppIcon.tsx';
import {
  loadKdsOrders,
  acceptKdsOrder,
  rejectKdsOrder,
  toggleItemPicked,
  flagItemOutOfStock,
  completeDriverHandover,
  KdsLiveOrder,
  KdsOrderItem,
} from '../../data/merchantOrderFulfillment.ts';
import { IncomingOrderAlertModal } from '../../components/merchant/IncomingOrderAlertModal.tsx';
import { BatchPickingChecklist } from '../../components/merchant/BatchPickingChecklist.tsx';
import { ItemOosSubstitutionModal } from '../../components/merchant/ItemOosSubstitutionModal.tsx';
import { DriverHandoverCustodyBox } from '../../components/merchant/DriverHandoverCustodyBox.tsx';

interface Props {
  onBack: () => void;
}

export const LiveOrdersPage: React.FC<Props> = ({ onBack }) => {
  const [orders, setOrders] = useState<KdsLiveOrder[]>(() => loadKdsOrders());
  const [activeAlertOrder, setActiveAlertOrder] = useState<KdsLiveOrder | null>(null);
  const [oosModalState, setOosModalState] = useState<{
    order: KdsLiveOrder | null;
    item: KdsOrderItem | null;
  }>({ order: null, item: null });
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    // Check if there is an incoming NEW order to trigger the high-priority modal
    const incoming = orders.find((o) => o.status === 'NEW');
    if (incoming) {
      setActiveAlertOrder(incoming);
    }
  }, [orders]);

  const handleAccept = async (orderId: string, prepTime: number) => {
    const updated = await acceptKdsOrder(orderId, prepTime);
    setOrders(loadKdsOrders());
    setActiveAlertOrder(null);
    setFeedback(`Order #${orderId} accepted! Estimated prep: ${prepTime} mins.`);
  };

  const handleReject = async (orderId: string, reason: string) => {
    await rejectKdsOrder(orderId, reason);
    setOrders(loadKdsOrders());
    setActiveAlertOrder(null);
    setFeedback(`Order #${orderId} rejected: ${reason}`);
  };

  const handleTogglePicked = (orderId: string, itemId: string) => {
    toggleItemPicked(orderId, itemId);
    setOrders(loadKdsOrders());
  };

  const handleFlagOos = (order: KdsLiveOrder, item: KdsOrderItem) => {
    setOosModalState({ order, item });
  };

  const handleConfirmOos = (orderId: string, itemId: string) => {
    const res = flagItemOutOfStock(orderId, itemId);
    setOrders(loadKdsOrders());
    setFeedback(res.message);
  };

  const handleCompleteHandover = (orderId: string, pin: string, bags: number) => {
    const res = completeDriverHandover(orderId, pin, bags);
    setFeedback(res.message);
    if (res.success) {
      setOrders(loadKdsOrders());
    }
  };

  const activeOrders = orders.filter((o) => o.status === 'PREPARING' || o.status === 'READY_FOR_PICKUP');

  return (
    <ScrollView style={styles.screen}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backLink}>← Return Home</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Kitchen & Dark-Store Dispatch KDS</Text>
      </View>

      {/* Active Alert Banner */}
      {feedback && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>{feedback}</Text>
        </View>
      )}

      {/* Incoming Order Trigger Test */}
      {activeOrders.length === 0 && (
        <View style={styles.emptyCard}>
          <AppIcon name="clock" size={32} />
          <Text style={styles.emptyTitle}>All Active Orders Cleared</Text>
          <Text style={styles.emptySub}>Awaiting new customer orders from LiveOrderStream.</Text>
        </View>
      )}

      {/* Active Orders List */}
      {activeOrders.map((order) => (
        <View key={order.id} style={styles.orderContainer}>
          <BatchPickingChecklist
            order={order}
            onTogglePicked={handleTogglePicked}
            onFlagOos={handleFlagOos}
          />

          {order.status === 'READY_FOR_PICKUP' && (
            <DriverHandoverCustodyBox
              order={order}
              onCompleteHandover={handleCompleteHandover}
            />
          )}
        </View>
      ))}

      {/* High-Priority Incoming Order Modal */}
      <IncomingOrderAlertModal
        visible={Boolean(activeAlertOrder)}
        order={activeAlertOrder}
        onAccept={handleAccept}
        onReject={handleReject}
      />

      {/* Out-of-Stock Substitution / Partial Refund Modal */}
      <ItemOosSubstitutionModal
        visible={Boolean(oosModalState.item)}
        order={oosModalState.order}
        item={oosModalState.item}
        onConfirmOos={handleConfirmOos}
        onClose={() => setOosModalState({ order: null, item: null })}
      />

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  topBar: { marginBottom: 12 },
  backLink: { color: '#6200EA', fontWeight: '800', fontSize: 13, marginBottom: 4 },
  pageTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  alertBanner: { backgroundColor: '#EFF6FF', borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#BFDBFE' },
  alertText: { color: '#1E40AF', fontSize: 12, fontWeight: '700' },
  emptyCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 30, alignItems: 'center', marginTop: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginTop: 10 },
  emptySub: { fontSize: 12, color: '#64748B', marginTop: 4 },
  orderContainer: { marginBottom: 16 },
});
