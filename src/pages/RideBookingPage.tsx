// Job: Screen to choose Bike, Auto, or Cab and request a pickup.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { loadRideTiers, calculateRidePrice, RideTier } from '../data/rideOptionsLoader';
import { saveNewOrder } from '../data/orderStorage';
import { RideTierRow } from '../components/RideTierRow';

interface Props {
  onRideBooked: (orderId: string) => void;
}

export const RideBookingPage: React.FC<Props> = ({ onRideBooked }) => {
  const [tiers] = useState<RideTier[]>(() => loadRideTiers());
  const [selectedTier, setSelectedTier] = useState<RideTier | null>(() => tiers[0] || null);

  const handleBook = () => {
    if (!selectedTier) return;
    const priceCents = calculateRidePrice(selectedTier, 6.2);
    const order = saveNewOrder(
      [{ id: selectedTier.id, title: selectedTier.name, priceCents, quantity: 1 }],
      priceCents
    );
    onRideBooked(order.id);
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Book a Ride</Text>
      <Text style={styles.subtitle}>Choose your vehicle tier</Text>

      <FlatList
        data={tiers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isSelected = selectedTier?.id === item.id;
          const priceCents = calculateRidePrice(item, 6.2);
          return (
            <RideTierRow
              tier={item}
              priceCents={priceCents}
              isSelected={isSelected}
              onSelect={() => setSelectedTier(item)}
            />
          );
        }}
      />

      <TouchableOpacity
        style={[styles.bookBtn, !selectedTier && styles.bookBtnDisabled]}
        disabled={!selectedTier}
        onPress={handleBook}
      >
        <Text style={styles.bookBtnText}>Confirm {selectedTier?.name || 'Ride'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', padding: 20 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  bookBtn: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  bookBtnDisabled: { backgroundColor: '#D1D5DB' },
  bookBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
