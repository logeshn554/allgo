// Job: Screen to enter pickup address, drop-off address, package weight, and book courier.

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { saveNewOrder } from '../data/orderStorage';
import { calculateOrderPrice } from '../data/priceCalculator';

interface Props {
  onParcelBooked: (orderId: string) => void;
}

export const ParcelPage: React.FC<Props> = ({ onParcelBooked }) => {
  const [pickup, setPickup] = useState('Home - Indiranagar 100ft Rd');
  const [dropoff, setDropoff] = useState('Office - Koramangala 5th Block');
  const [weightKg, setWeightKg] = useState('2');

  const parsedWeight = parseFloat(weightKg) || 1;
  const priceSummary = calculateOrderPrice(
    [{ id: 'parcel_pkg', title: `Parcel (${parsedWeight}kg)`, priceCents: Math.round(parsedWeight * 2000), quantity: 1 }],
    5.5
  );

  const handleBookParcel = () => {
    const order = saveNewOrder(
      [{ id: 'parcel_pkg', title: `Parcel to ${dropoff}`, priceCents: priceSummary.totalCents, quantity: 1 }],
      priceSummary.totalCents
    );
    onParcelBooked(order.id);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Send a Parcel</Text>
      <Text style={styles.subtitle}>Instant door-to-door courier delivery</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Pickup Address</Text>
        <TextInput style={styles.input} value={pickup} onChangeText={setPickup} />

        <Text style={styles.label}>Drop-off Address</Text>
        <TextInput style={styles.input} value={dropoff} onChangeText={setDropoff} />

        <Text style={styles.label}>Package Weight (kg)</Text>
        <TextInput
          style={styles.input}
          value={weightKg}
          onChangeText={setWeightKg}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>Estimated Delivery Fee</Text>
        <Text style={styles.priceVal}>₹{(priceSummary.totalCents / 100).toFixed(2)}</Text>
      </View>

      <TouchableOpacity style={styles.bookBtn} onPress={handleBookParcel}>
        <Text style={styles.bookBtnText}>Book Delivery Partner</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 20 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginBottom: 20 },
  card: { backgroundColor: '#F9FAFB', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  label: { fontSize: 12, fontWeight: '700', color: '#4B5563', marginBottom: 6, textTransform: 'uppercase' },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 14 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingHorizontal: 4 },
  priceLabel: { fontSize: 15, fontWeight: '600', color: '#374151' },
  priceVal: { fontSize: 20, fontWeight: '800', color: '#059669' },
  bookBtn: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  bookBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
