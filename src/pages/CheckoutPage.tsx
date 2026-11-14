// Job: Checkout screen with closed-loop wallet splitting, COD toggle, and multi-tender breakdown.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { loadCartItems, clearSavedCart } from '../data/cartStorage';
import { calculateOrderPrice } from '../data/priceCalculator';
import { saveNewOrder } from '../data/orderStorage';
import { PaymentPicker } from '../components/PaymentPicker';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { PaymentMethod, processOrderPayment } from '../data/paymentGateway';
import { loadWalletState, debitWallet, calculatePaymentSplit } from '../data/walletStorage';

interface Props {
  onBack: () => void;
  onOrderPlaced: (orderId: string) => void;
}

export const CheckoutPage: React.FC<Props> = ({ onBack, onOrderPlaced }) => {
  const [items] = useState(() => loadCartItems('grocery'));
  const [secondaryMethod, setSecondaryMethod] = useState<PaymentMethod>('upi');
  const [useWallet, setUseWallet] = useState(true);
  const [loading, setLoading] = useState(false);

  const wallet = loadWalletState();
  const bill = calculateOrderPrice(items, 4.0);
  const split = calculatePaymentSplit(bill.totalCents, useWallet, secondaryMethod);

  const handleConfirmOrder = async () => {
    setLoading(true);

    const saved = saveNewOrder(items, bill.totalCents);

    // If using wallet balance, debit wallet first
    if (split.useWallet && split.walletDeductionCents > 0) {
      debitWallet(split.walletDeductionCents, `Payment for order ${saved.id}`, saved.id);
    }

    // Charge secondary tender if remainder exists
    if (split.remainderCents > 0) {
      await processOrderPayment(saved.id, split.remainderCents, split.secondaryMethod);
    }

    clearSavedCart('grocery');
    setLoading(false);
    onOrderPlaced(saved.id);
  };

  return (
    <ScrollView style={styles.screen}>
      <LoadingOverlay visible={loading} message="Processing Multi-Tender Split & Order..." />
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.back}>← Back to Catalog</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Checkout & Payment</Text>

      {/* Items list */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Order Items</Text>
        {items.map((item) => (
          <View key={item.id} style={styles.row}>
            <Text style={styles.itemText}>{item.quantity}x {item.title}</Text>
            <Text style={styles.itemPrice}>₹{((item.priceCents * item.quantity) / 100).toFixed(0)}</Text>
          </View>
        ))}
      </View>

      {/* Digital Wallet Closed-Loop Section */}
      <View style={styles.walletBox}>
        <View style={styles.walletHeader}>
          <View>
            <Text style={styles.walletTitle}>AllGo Digital Wallet</Text>
            <Text style={styles.walletBal}>Available Balance: ₹{(wallet.balanceCents / 100).toFixed(0)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.toggleBtn, useWallet && styles.toggleBtnActive]}
            onPress={() => setUseWallet(!useWallet)}
          >
            <Text style={styles.toggleText}>{useWallet ? '✓ Applied' : '+ Apply'}</Text>
          </TouchableOpacity>
        </View>
        {useWallet && split.walletDeductionCents > 0 && (
          <Text style={styles.walletAppliedText}>
            Deducting ₹{(split.walletDeductionCents / 100).toFixed(0)} from wallet
          </Text>
        )}
      </View>

      {/* Bill Breakdown */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Bill Summary</Text>
        <View style={styles.row}>
          <Text style={styles.fee}>Delivery Fee</Text>
          <Text style={styles.feeVal}>₹{(bill.deliveryFeeCents / 100).toFixed(0)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.fee}>Taxes (5% GST)</Text>
          <Text style={styles.feeVal}>₹{(bill.taxCents / 100).toFixed(0)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.totalLabel}>Gross Order Total</Text>
          <Text style={styles.total}>₹{(bill.totalCents / 100).toFixed(0)}</Text>
        </View>
        {split.useWallet && split.walletDeductionCents > 0 && (
          <View style={styles.row}>
            <Text style={styles.splitDiscount}>Wallet Credit</Text>
            <Text style={styles.splitDiscount}>- ₹{(split.walletDeductionCents / 100).toFixed(0)}</Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.netPayLabel}>Net Payable Now</Text>
          <Text style={styles.netPayVal}>₹{(split.remainderCents / 100).toFixed(0)}</Text>
        </View>
      </View>

      {split.remainderCents > 0 && (
        <PaymentPicker selectedMethod={secondaryMethod} onSelect={setSecondaryMethod} />
      )}

      <TouchableOpacity style={styles.payBtn} onPress={handleConfirmOrder}>
        <Text style={styles.payText}>
          {split.remainderCents === 0
            ? 'Pay ₹0 with Wallet & Place Order'
            : split.secondaryMethod === 'cod'
            ? `Confirm Order (₹${(split.remainderCents / 100).toFixed(0)} COD)`
            : `Pay ₹${(split.remainderCents / 100).toFixed(0)} & Place Order`}
        </Text>
      </TouchableOpacity>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', padding: 20 },
  back: { color: '#6200EA', fontWeight: '700', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 14 },
  card: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  itemText: { fontSize: 13, color: '#334155' },
  itemPrice: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  divider: { height: 1, backgroundColor: '#CBD5E1', marginVertical: 8 },
  fee: { fontSize: 13, color: '#64748B' },
  feeVal: { fontSize: 13, fontWeight: '600', color: '#334155' },
  totalLabel: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  total: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  splitDiscount: { fontSize: 13, fontWeight: '700', color: '#00C853' },
  netPayLabel: { fontSize: 15, fontWeight: '800', color: '#6200EA', marginTop: 4 },
  netPayVal: { fontSize: 18, fontWeight: '900', color: '#6200EA', marginTop: 4 },
  walletBox: { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#BBF7D0', marginBottom: 12 },
  walletHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  walletTitle: { fontSize: 14, fontWeight: '800', color: '#166534' },
  walletBal: { fontSize: 12, color: '#15803D', marginTop: 2 },
  toggleBtn: { backgroundColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  toggleBtnActive: { backgroundColor: '#00C853' },
  toggleText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  walletAppliedText: { fontSize: 12, color: '#15803D', fontWeight: '600', marginTop: 6 },
  payBtn: { backgroundColor: '#00C853', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  payText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
