// Job: Interactive telematics map widget with animated route polyline and dynamic countdown.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GeoPoint, DynamicEtaUpdate } from '../data/dynamicEtaService.ts';

interface Props {
  pickup: GeoPoint;
  destination: GeoPoint;
  driver?: GeoPoint;
  etaUpdate?: DynamicEtaUpdate;
}

export const RoutePolylineView: React.FC<Props> = ({
  pickup,
  destination,
  driver,
  etaUpdate,
}) => {
  return (
    <View style={styles.container}>
      {etaUpdate && (
        <View style={styles.etaBar}>
          <View>
            <Text style={styles.etaHeading}>
              Arriving in {Math.ceil(etaUpdate.remainingSeconds / 60)} mins
            </Text>
            <Text style={styles.etaSub}>
              {etaUpdate.remainingMeters}m away • Traffic: {etaUpdate.trafficLevel}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{etaUpdate.estimatedArrivalTimestamp}</Text>
          </View>
        </View>
      )}

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBar,
            { width: `${etaUpdate?.routeProgressPercent ?? 25}%` },
          ]}
        />
      </View>

      <View style={styles.mapCanvas}>
        <View style={[styles.pin, styles.pickupPin]}>
          <Text style={styles.pinText}>🏪 Merchant</Text>
        </View>

        <View style={styles.polylineContainer}>
          <Text style={styles.polylineGraphic}>─────── 🚗 ───────</Text>
        </View>

        <View style={[styles.pin, styles.destPin]}>
          <Text style={styles.pinText}>📍 Your Gate</Text>
        </View>
      </View>

      <Text style={styles.coords}>
        GPS: Driver {driver ? `${driver.latitude.toFixed(4)}, ${driver.longitude.toFixed(4)}` : 'Connecting...'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 14,
  },
  etaBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  etaHeading: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  etaSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  badge: {
    backgroundColor: '#00C853',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  progressContainer: { height: 4, backgroundColor: '#E2E8F0', width: '100%' },
  progressBar: { height: 4, backgroundColor: '#00C853' },
  mapCanvas: {
    padding: 16,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  polylineContainer: { flex: 1, alignItems: 'center' },
  polylineGraphic: { color: '#64748B', fontSize: 12, fontWeight: '700' },
  pin: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  pickupPin: { backgroundColor: '#3B82F6' },
  destPin: { backgroundColor: '#EF4444' },
  pinText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  coords: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    paddingVertical: 4,
    backgroundColor: '#F8FAFC',
  },
});
