// Job: Screen to enter pickup, drop-off, package weight, and book a parcel courier.

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { saveItemToCart } from '../data/cartStorage';

interface Props {
  onBack: () => void;
  onCheckout: () => void;
}

export const ParcelPage: React.FC<Props> = ({ onBack, onCheckout }) => {
  const [pickup, setPickup] = useState('Indiranagar, Bengaluru');
  const [dropoff, setDropoff] = useState('Koramangala, Bengaluru');
  const [weightKg, setWeightKg] = useState('2');

  const handleCreateParcel = () => {
    const kg = Math.max(1, Number(weightKg) || 1);
    const priceCents = 5000 + kg * 1500;
    saveItemToCart('grocery', {
      id: `parcel-${Date.now()}`,
      title: `Parcel (${kg} kg): ${pickup} → ${dropoff}`,
      priceCents,
      quantity: 1,
    });
    onCheckout();
  };

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.back}>← Back to Home</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Send a Parcel</Text>
      <TextInput style={styles.input} value={pickup} onChangeText={setPickup} placeholder="Pickup Address" />
      <TextInput style={styles.input} value={dropoff} onChangeText={setDropoff} placeholder="Drop-off Address" />
      <TextInput style={styles.input} value={weightKg} onChangeText={setWeightKg} keyboardType="numeric" placeholder="Weight (kg)" />
      <TouchableOpacity style={styles.btn} onPress={handleCreateParcel}>
        <Text style={styles.btnText}>Continue to Checkout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', padding: 20 },
  back: { color: '#4F46E5', fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, marginBottom: 12 },
  btn: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
