// Job: Screen listing past grocery, ride, and parcel receipts.

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { loadAllOrders } from '../data/orderStorage';
import { EmptyStateBox } from '../components/EmptyStateBox';

interface Props {
  onBack: () => void;
  onSelectOrder: (orderId: string) => void;
}

export const OrderHistoryPage: React.FC<Props> = ({ onBack, onSelectOrder }) => {
  const orders = loadAllOrders();

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.back}>← Back to Home</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Your Past Orders</Text>

      {orders.length === 0 ? (
        <EmptyStateBox
          title="No Past Orders"
          subtitle="You haven't placed any orders or booked any rides yet."
          buttonLabel="Start Shopping"
          onPressButton={onBack}
        />
      ) : (
        <ScrollView style={styles.list}>
          {orders.map((o) => (
            <TouchableOpacity key={o.id} style={styles.card} onPress={() => onSelectOrder(o.id)}>
              <View style={styles.row}>
                <Text style={styles.orderId}>#{o.id}</Text>
                <Text style={styles.status}>{o.status.toUpperCase()}</Text>
              </View>
              <Text style={styles.items}>{o.items.map((i) => i.title).join(', ')}</Text>
              <Text style={styles.total}>Total: ₹{(o.totalCents / 100).toFixed(0)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', padding: 20 },
  back: { color: '#4F46E5', fontWeight: '600', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 16 },
  list: { flex: 1 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 10, backgroundColor: '#F9FAFB' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  orderId: { fontWeight: '700', fontSize: 14, color: '#111827' },
  status: { fontWeight: '700', fontSize: 12, color: '#059669' },
  items: { fontSize: 13, color: '#4B5563', marginBottom: 6 },
  total: { fontSize: 14, fontWeight: '800', color: '#111827' },
});
