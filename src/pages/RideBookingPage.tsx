// Job: Screen to select a ride tier and book a ride.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { loadRideOptions, RideOption } from '../data/catalogLoader';
import { saveNewOrder } from '../data/orderStorage';

interface Props {
  onRideBooked: (orderId: string) => void;
}

export const RideBookingPage: React.FC<Props> = ({ onRideBooked }) => {
  const [rides] = useState<RideOption[]>(() => loadRideOptions());
  const [selectedRide, setSelectedRide] = useState<RideOption | null>(null);

  const handleBook = () => {
    if (!selectedRide) return;
    const order = saveNewOrder(
      [{ id: selectedRide.id, title: selectedRide.name, priceCents: selectedRide.basePriceCents, quantity: 1 }],
      selectedRide.basePriceCents
    );
    onRideBooked(order.id);
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Book a Ride</Text>
      <Text style={styles.subtitle}>Choose your ride tier</Text>

      <FlatList
        data={rides}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isSelected = selectedRide?.id === item.id;
          return (
            <TouchableOpacity
              style={[styles.rideCard, isSelected && styles.rideCardActive]}
              onPress={() => setSelectedRide(item)}
            >
              <Text style={styles.rideName}>{item.name}</Text>
              <Text style={styles.ridePrice}>₹{(item.basePriceCents / 100).toFixed(2)}</Text>
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity
        style={[styles.bookBtn, !selectedRide && styles.bookBtnDisabled]}
        disabled={!selectedRide}
        onPress={handleBook}
      >
        <Text style={styles.bookBtnText}>Confirm Booking</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', padding: 20 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  rideCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  rideCardActive: { borderColor: '#10B981', backgroundColor: '#ECFDF5' },
  rideName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  ridePrice: { fontSize: 16, fontWeight: '700', color: '#111827' },
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
