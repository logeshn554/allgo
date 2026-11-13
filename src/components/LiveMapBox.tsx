// Job: Interactive map container displaying pickup, drop-off, and driver markers.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface Props {
  pickup: Coordinate;
  dropoff?: Coordinate;
  driver?: Coordinate;
}

export const LiveMapBox: React.FC<Props> = ({ pickup, dropoff, driver }) => {
  return (
    <View style={styles.container}>
      <View style={styles.mapCanvas}>
        <View style={[styles.pin, styles.pickupPin]}>
          <Text style={styles.pinText}>📍 Pickup</Text>
        </View>
        {dropoff && (
          <View style={[styles.pin, styles.dropoffPin]}>
            <Text style={styles.pinText}>🏁 Drop-off</Text>
          </View>
        )}
        {driver && (
          <View style={[styles.pin, styles.driverPin]}>
            <Text style={styles.pinText}>🚗 Driver</Text>
          </View>
        )}
      </View>
      <Text style={styles.coords}>
        {pickup.latitude.toFixed(4)}, {pickup.longitude.toFixed(4)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { height: 180, backgroundColor: '#E5E7EB', borderRadius: 14, overflow: 'hidden', marginBottom: 14 },
  mapCanvas: { flex: 1, backgroundColor: '#D1D5DB', justifyContent: 'space-around', alignItems: 'center', flexDirection: 'row' },
  pin: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  pickupPin: { backgroundColor: '#10B981' },
  dropoffPin: { backgroundColor: '#EF4444' },
  driverPin: { backgroundColor: '#3B82F6' },
  pinText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  coords: { fontSize: 11, color: '#6B7280', textAlign: 'center', paddingVertical: 4, backgroundColor: '#F3F4F6' },
});
