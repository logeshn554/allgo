// Job: Live map tracking view showing driver position, bearing angle, route polyline, and arrival countdown.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppIcon } from '../AppIcon.tsx';

interface Props {
  driverLocation: { latitude: number; longitude: number };
  dropoffLocation: { latitude: number; longitude: number };
  bearingDegrees?: number;
  etaMinutes: number;
  distanceKm: number;
  driverName?: string;
  vehicleNumber?: string;
}

export const LiveDriverTrackingMap: React.FC<Props> = ({
  driverLocation,
  dropoffLocation,
  bearingDegrees = 45,
  etaMinutes,
  distanceKm,
  driverName = 'Murugan K.',
  vehicleNumber = 'TN 01 AB 4421',
}) => {
  return (
    <View style={styles.mapBox}>
      {/* Top Floating ETA Pill */}
      <View style={styles.etaPill}>
        <Text style={styles.etaText}>
          🚗 Arriving in ~{etaMinutes} mins ({distanceKm.toFixed(1)} km)
        </Text>
      </View>

      {/* Visual Canvas Representation */}
      <View style={styles.canvasArea}>
        <View style={styles.roadLine} />

        {/* Pickup / Origin marker */}
        <View style={styles.markerPickup}>
          <Text style={styles.markerLabel}>Origin</Text>
          <View style={styles.pickupPin} />
        </View>

        {/* Live Driver Marker with Bearing Arrow */}
        <View style={styles.markerDriver}>
          <View style={[styles.bearingArrow, { transform: [{ rotate: `${bearingDegrees}deg` }] }]}>
            <Text style={styles.arrowText}>▲</Text>
          </View>
          <AppIcon name="cab" size={32} />
          <Text style={styles.driverTag}>{driverName}</Text>
        </View>

        {/* Drop-off marker */}
        <View style={styles.markerDrop}>
          <View style={styles.dropPin} />
          <Text style={styles.markerLabel}>Drop</Text>
        </View>
      </View>

      {/* Driver & Vehicle Metadata Footer */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.driverName}>{driverName} ★ 4.9</Text>
          <Text style={styles.vehicleNumber}>{vehicleNumber} • White Swift Dzire</Text>
        </View>
        <View style={styles.coordsBox}>
          <Text style={styles.coordsText}>
            GPS: {driverLocation.latitude.toFixed(4)}, {driverLocation.longitude.toFixed(4)}
          </Text>
          <Text style={styles.bearingText}>Heading: {bearingDegrees}°</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mapBox: { backgroundColor: '#E0E7FF', borderRadius: 16, overflow: 'hidden', marginBottom: 14, borderWidth: 1, borderColor: '#C7D2FE' },
  etaPill: { alignSelf: 'center', backgroundColor: '#111827', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 12, zIndex: 10 },
  etaText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  canvasArea: { height: 160, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  roadLine: { position: 'absolute', width: '80%', height: 4, backgroundColor: '#6366F1', borderRadius: 2 },
  markerPickup: { position: 'absolute', left: 24, alignItems: 'center' },
  pickupPin: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#FFFFFF' },
  markerDriver: { position: 'absolute', alignSelf: 'center', alignItems: 'center' },
  bearingArrow: { position: 'absolute', top: -14 },
  arrowText: { color: '#4F46E5', fontSize: 14, fontWeight: '900' },
  driverTag: { fontSize: 10, fontWeight: '700', color: '#1E1B4B', backgroundColor: '#FFFFFF', paddingHorizontal: 4, borderRadius: 4, marginTop: 2 },
  markerDrop: { position: 'absolute', right: 24, alignItems: 'center' },
  dropPin: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#FFFFFF' },
  markerLabel: { fontSize: 10, fontWeight: '700', color: '#4B5563', marginBottom: 2 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FFFFFF', padding: 12, borderTopWidth: 1, borderTopColor: '#EEF2FF' },
  driverName: { fontSize: 14, fontWeight: '800', color: '#111827' },
  vehicleNumber: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  coordsBox: { alignItems: 'flex-end' },
  coordsText: { fontSize: 10, color: '#9CA3AF' },
  bearingText: { fontSize: 10, color: '#4F46E5', fontWeight: '600', marginTop: 2 },
});
