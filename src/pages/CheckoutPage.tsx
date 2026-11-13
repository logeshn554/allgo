// Job: Checkout screen showing price breakdown and place order button.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { loadCartItems, clearSavedCart } from '../data/cartStorage';
import { calculateOrderPrice } from '../data/priceCalculator';
import { saveNewOrder } from '../data/orderStorage';

interface Props {
  onOrderPlaced: (orderId: string) => void;
}

export const CheckoutPage: React.FC<Props> = ({ onOrderPlaced }) => {
  const [items] = useState(() => loadCartItems('grocery'));
  const priceSummary = calculateOrderPrice(items, 3.5);

  const handlePlaceOrder = () => {
    const order = saveNewOrder(items, priceSummary.totalCents);
    clearSavedCart('grocery');
    onOrderPlaced(order.id);
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Order Summary</Text>

      <View style={styles.billCard}>
        <View style={styles.row}>
          <Text style={styles.label}>Item Subtotal</Text>
          <Text style={styles.value}>₹{(priceSummary.subtotalCents / 100).toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Delivery Fee</Text>
          <Text style={styles.value}>₹{(priceSummary.deliveryFeeCents / 100).toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Taxes & Charges</Text>
          <Text style={styles.value}>₹{(priceSummary.taxCents / 100).toFixed(2)}</Text>
        </View>
        <View style={[styles.row, styles.totalRow]}>
          <Text style={styles.totalLabel}>To Pay</Text>
          <Text style={styles.totalValue}>₹{(priceSummary.totalCents / 100).toFixed(2)}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.placeBtn} onPress={handlePlaceOrder}>
        <Text style={styles.placeBtnText}>Place Order</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', padding: 20 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 20 },
  billCard: { backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  label: { fontSize: 14, color: '#4B5563' },
  value: { fontSize: 14, fontWeight: '600', color: '#111827' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 12, marginTop: 4 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#111827' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#059669' },
  placeBtn: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  placeBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
