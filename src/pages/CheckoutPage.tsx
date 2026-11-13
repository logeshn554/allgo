// Job: Screen to review server-verified bill breakdown, select payment method, and place order.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { loadCartItems, clearSavedCart } from '../data/cartStorage';
import { calculateOrderPrice } from '../data/priceCalculator';
import { saveNewOrder } from '../data/orderStorage';
import { PaymentPicker } from '../components/PaymentPicker';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { PaymentMethod, processPayment } from '../data/paymentGateway';

interface Props {
  onBack: () => void;
  onOrderPlaced: (orderId: string) => void;
}

export const CheckoutPage: React.FC<Props> = ({ onBack, onOrderPlaced }) => {
  const [items] = useState(() => loadCartItems('grocery'));
  const [method, setMethod] = useState<PaymentMethod>('upi');
  const [loading, setLoading] = useState(false);
  const bill = calculateOrderPrice(items, 4.0);

  const handleConfirmOrder = async () => {
    setLoading(true);
    await processPayment(bill.totalCents, method);
    const saved = saveNewOrder(items, bill.totalCents);
    clearSavedCart('grocery');
    setLoading(false);
    onOrderPlaced(saved.id);
  };

  return (
    <View style={styles.screen}>
      <LoadingOverlay visible={loading} message="Confirming Payment & Order..." />
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.back}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Checkout Summary</Text>
      {items.map((item) => (
        <View key={item.id} style={styles.row}>
          <Text style={styles.itemText}>{item.quantity}x {item.title}</Text>
          <Text style={styles.itemPrice}>₹{((item.priceCents * item.quantity) / 100).toFixed(0)}</Text>
        </View>
      ))}
      <View style={styles.divider} />
      <Text style={styles.fee}>Delivery Fee: ₹{(bill.deliveryFeeCents / 100).toFixed(0)}</Text>
      <Text style={styles.fee}>Taxes (5%): ₹{(bill.taxCents / 100).toFixed(0)}</Text>
      <Text style={styles.total}>Total: ₹{(bill.totalCents / 100).toFixed(0)}</Text>

      <PaymentPicker selectedMethod={method} onSelect={setMethod} />

      <TouchableOpacity style={styles.payBtn} onPress={handleConfirmOrder}>
        <Text style={styles.payText}>Pay & Place Order</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', padding: 20 },
  back: { color: '#4F46E5', fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  itemText: { fontSize: 14, color: '#374151' },
  itemPrice: { fontSize: 14, fontWeight: '600', color: '#111827' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 8 },
  fee: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  total: { fontSize: 18, fontWeight: '800', color: '#111827', marginVertical: 8 },
  payBtn: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  payText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
