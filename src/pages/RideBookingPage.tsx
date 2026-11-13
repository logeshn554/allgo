// Job: Screen to choose Bike, Auto, or Cab and request an instant ride with live road distance.

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { loadRideOptions, calculateRideFareCents } from '../data/rideOptionsLoader';
import { saveNewOrder } from '../data/orderStorage';
import { getCurrentCoordinates, computeHaversineDistanceKm } from '../data/gpsLoader';
import { RideTierRow } from '../components/RideTierRow';
import { LiveMapBox } from '../components/LiveMapBox';

interface Props {
  onBack: () => void;
  onRideBooked: (orderId: string) => void;
}

export const RideBookingPage: React.FC<Props> = ({ onBack, onRideBooked }) => {
  const options = loadRideOptions();
  const [selected, setSelected] = useState(options[0]);
  const [pickupCoords, setPickupCoords] = useState({ latitude: 12.9716, longitude: 77.5946 });
  const [dropoffCoords] = useState({ latitude: 12.9352, longitude: 77.6245 });
  const [distanceKm, setDistanceKm] = useState(5.4);

  useEffect(() => {
    getCurrentCoordinates().then((coords) => {
      setPickupCoords(coords);
      const km = computeHaversineDistanceKm(coords, dropoffCoords);
      setDistanceKm(km);
    });
  }, []);

  const handleBookRide = () => {
    const fareCents = calculateRideFareCents(selected, distanceKm);
    const order = saveNewOrder(
      [{ id: selected.id, title: selected.title, priceCents: fareCents, quantity: 1 }],
      fareCents
    );
    onRideBooked(order.id);
  };

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.back}>← Back to Home</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Choose a Ride ({distanceKm} km)</Text>

      <LiveMapBox pickup={pickupCoords} dropoff={dropoffCoords} />

      {options.map((opt) => (
        <RideTierRow
          key={opt.id}
          option={opt}
          distanceKm={distanceKm}
          selected={selected.id === opt.id}
          onSelect={setSelected}
        />
      ))}
      <TouchableOpacity style={styles.bookBtn} onPress={handleBookRide}>
        <Text style={styles.bookText}>Confirm {selected.title}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', padding: 20 },
  back: { color: '#4F46E5', fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 12 },
  bookBtn: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  bookText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
