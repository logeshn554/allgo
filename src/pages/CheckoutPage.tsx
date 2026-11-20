// Job: Grocery checkout with substitution selector, server-computed bill breakdown, and wallet multi-tender splitting.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { loadCartItems, clearSavedCart } from '../data/cartStorage.ts';
import { saveNewOrder } from '../data/orderStorage.ts';
import { PaymentPicker } from '../components/PaymentPicker.tsx';
import { LoadingOverlay } from '../components/LoadingOverlay.tsx';
import { PaymentMethod, processOrderPayment } from '../data/paymentGateway.ts';
import { loadWalletState, debitWallet, calculatePaymentSplit } from '../data/walletStorage.ts';
import { SubstitutionPreferenceSelector, SubstitutionPreference } from '../components/grocery/SubstitutionPreferenceSelector.tsx';
import { BillBreakdownCard, BillPricing } from '../components/grocery/BillBreakdownCard.tsx';

interface Props {
  onBack: () => void;
  onOrderPlaced: (orderId: string) => void;
}

export const CheckoutPage: React.FC<Props> = ({ onBack, onOrderPlaced }) => {
  const [items] = useState(() => loadCartItems('grocery'));
  const [secondaryMethod, setSecondaryMethod] = useState<PaymentMethod>('upi');
  const [useWallet, setUseWallet] = useState(true);
  const [subPreference, setSubPreference] = useState<SubstitutionPreference>('BEST_MATCH');
  const [loading, setLoading] = useState(false);

  const wallet = loadWalletState();

  // Compute Server-Authoritative Bill Breakdown
  const itemsTotalInr = items.reduce((sum, it) => sum + (it.priceCents * it.quantity) / 100, 0);
  const smallCartFeeInr = itemsTotalInr < 150 ? 20 : 0;
  const deliveryFeeInr = 25;
  const surgeFeeInr = 0;
  const packagingFeeInr = 10;
  const platformFeeInr = 3;
  const taxGstInr = Math.round((itemsTotalInr * 0.05 + deliveryFeeInr * 0.05) * 100) / 100;
  const discountInr = 0;
  const finalTotalInr = Math.round(
    itemsTotalInr + smallCartFeeInr + deliveryFeeInr + surgeFeeInr + packagingFeeInr + platformFeeInr + taxGstInr - discountInr
  );

  const billPricing: BillPricing = {
    itemsTotalInr,
    deliveryFeeInr,
    surgeFeeInr,
    smallCartFeeInr,
    packagingFeeInr,
    platformFeeInr,
    taxGstInr,
    discountInr,
    finalTotalInr,
  };

  const finalTotalCents = finalTotalInr * 100;
  const split = calculatePaymentSplit(finalTotalCents, useWallet, secondaryMethod);

  const handleConfirmOrder = async () => {
    setLoading(true);

    const saved = saveNewOrder(items, finalTotalCents);

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
      <Text style={styles.title}>Checkout & Delivery</Text>

      {/* Items list */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cart Items ({items.length})</Text>
        {items.map((item) => (
          <View key={item.id} style={styles.row}>
            <Text style={styles.itemText}>{item.quantity}x {item.title}</Text>
            <Text style={styles.itemPrice}>₹{((item.priceCents * item.quantity) / 100).toFixed(0)}</Text>
          </View>
        ))}
      </View>

      {/* Out of Stock Substitution Preference Selector */}
      <SubstitutionPreferenceSelector
        selectedPreference={subPreference}
        onSelectPreference={setSubPreference}
      />

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

      {/* Payment Method Picker if remainder */}
      {split.remainderCents > 0 && (
        <PaymentPicker
          selected={secondaryMethod}
          onSelect={setSecondaryMethod}
          payableAmountCents={split.remainderCents}
        />
      )}

      {/* Server-Computed Bill Breakdown */}
      <BillBreakdownCard pricing={billPricing} />

      <TouchableOpacity style={styles.payBtn} onPress={handleConfirmOrder}>
        <Text style={styles.payText}>
          Place Order • ₹{(finalTotalCents / 100).toFixed(0)}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', padding: 18 },
  back: { color: '#4F46E5', fontWeight: '700', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '900', color: '#111827', marginBottom: 14 },
  card: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTitle: { fontSize: 13, fontWeight: '800', color: '#374151', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  itemText: { fontSize: 13, color: '#374151' },
  itemPrice: { fontSize: 13, fontWeight: '700', color: '#111827' },
  walletBox: { backgroundColor: '#EEF2FF', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#C7D2FE' },
  walletHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  walletTitle: { fontSize: 13, fontWeight: '800', color: '#312E81' },
  walletBal: { fontSize: 11, color: '#4338CA', marginTop: 2 },
  toggleBtn: { backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#4F46E5' },
  toggleBtnActive: { backgroundColor: '#4F46E5' },
  toggleText: { fontSize: 11, fontWeight: '700', color: '#4F46E5' },
  walletAppliedText: { fontSize: 11, color: '#059669', fontWeight: '700', marginTop: 8 },
  payBtn: { backgroundColor: '#059669', padding: 16, borderRadius: 14, alignItems: 'center', marginVertical: 18 },
  payText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
});
