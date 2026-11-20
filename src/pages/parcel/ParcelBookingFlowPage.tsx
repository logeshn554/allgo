// Job: Full Parcel flow container with tier selection, prohibited goods check, dual OTPs, and POD viewer.

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { ParcelTierSelector, PARCEL_TIERS, ParcelTier } from '../../components/parcel/ParcelTierSelector.tsx';
import { RestrictedItemsDeclaration } from '../../components/parcel/RestrictedItemsDeclaration.tsx';
import { DualOtpDisplay } from '../../components/parcel/DualOtpDisplay.tsx';
import { PublicTrackingShare } from '../../components/parcel/PublicTrackingShare.tsx';
import { ProofOfDeliveryViewer } from '../../components/parcel/ProofOfDeliveryViewer.tsx';
import { saveItemToCart } from '../../data/cartStorage.ts';

interface Props {
  onBack: () => void;
  onCheckout: () => void;
}

export const ParcelBookingFlowPage: React.FC<Props> = ({ onBack, onCheckout }) => {
  const [step, setStep] = useState<'create' | 'tracking'>('create');
  const [pickup, setPickup] = useState('Indiranagar 100ft Road, Bengaluru');
  const [dropoff, setDropoff] = useState('Koramangala 4th Block, Bengaluru');
  const [selectedTier, setSelectedTier] = useState<ParcelTier>(PARCEL_TIERS[1]!);
  const [declared, setDeclared] = useState(false);
  const [orderId, setOrderId] = useState('PRCL-99214');

  const handleCreateParcel = () => {
    if (!declared) return;

    const newId = `PRCL-${Date.now().toString().slice(-5)}`;
    setOrderId(newId);
    saveItemToCart('grocery', {
      id: newId,
      title: `Parcel (${selectedTier.name}): ${pickup.slice(0, 15)} → ${dropoff.slice(0, 15)}`,
      priceCents: selectedTier.basePriceInr * 100,
      quantity: 1,
    });
    setStep('tracking');
    onCheckout();
  };

  return (
    <ScrollView style={styles.screen}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.backLink}>← Back to Home</Text>
      </TouchableOpacity>
      <Text style={styles.title}>AllGo Instant Parcel Courier</Text>

      {step === 'create' ? (
        <>
          <View style={styles.addressBox}>
            <Text style={styles.addrLabel}>Pickup Address</Text>
            <TextInput style={styles.input} value={pickup} onChangeText={setPickup} placeholder="Sender location" />
            <Text style={styles.addrLabel}>Drop-off Address</Text>
            <TextInput style={styles.input} value={dropoff} onChangeText={setDropoff} placeholder="Recipient location" />
          </View>

          <ParcelTierSelector
            selectedTierId={selectedTier.id}
            onSelectTier={setSelectedTier}
          />

          <RestrictedItemsDeclaration
            declared={declared}
            onToggleDeclare={setDeclared}
          />

          <TouchableOpacity
            style={[styles.btn, !declared && styles.btnDisabled]}
            disabled={!declared}
            onPress={handleCreateParcel}
          >
            <Text style={styles.btnText}>Proceed to Checkout • ₹{selectedTier.basePriceInr}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <DualOtpDisplay pickupOtp="4421" deliveryOtp="7719" />
          <PublicTrackingShare orderId={orderId} />
          <ProofOfDeliveryViewer orderId={orderId} />
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', padding: 18 },
  backLink: { color: '#4F46E5', fontWeight: '700', marginBottom: 10 },
  title: { fontSize: 20, fontWeight: '900', color: '#111827', marginBottom: 14 },
  addressBox: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  addrLabel: { fontSize: 11, fontWeight: '700', color: '#4B5563', marginBottom: 4 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, marginBottom: 10 },
  btn: { backgroundColor: '#059669', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 10, marginBottom: 30 },
  btnDisabled: { backgroundColor: '#9CA3AF' },
  btnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
});
