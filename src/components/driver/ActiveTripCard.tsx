// Job: Reusable Active Trip Card displaying current waypoint, navigation deep-link, geofence slider, and verification trigger.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { type DriverActiveTrip, canArriveAtPickup, canArriveAtDrop } from '../../data/driverTripExecution.ts';
import { type GpsCoords } from '../../data/gpsLoader.ts';
import { GeofenceTripSlider } from './GeofenceTripSlider.tsx';

interface Props {
  activeTrip: DriverActiveTrip;
  driverCoords: GpsCoords;
  onLaunchNavigation: (coords: GpsCoords, label: string) => void;
  onArrivedAtPickup: () => void;
  onArrivedAtDrop: () => void;
  onOpenVerificationModal: (type: 'PICKUP' | 'DROP') => void;
}

export const ActiveTripCard: React.FC<Props> = ({
  activeTrip,
  driverCoords,
  onLaunchNavigation,
  onArrivedAtPickup,
  onArrivedAtDrop,
  onOpenVerificationModal,
}) => {
  const pickupProximity = canArriveAtPickup(driverCoords, activeTrip);
  const dropProximity = canArriveAtDrop(driverCoords, activeTrip);

  return (
    <View style={styles.tripCard}>
      <View style={styles.tripHeader}>
        <Text style={styles.tripBadge}>{activeTrip.vertical} TRIP</Text>
        <Text style={styles.tripStatus}>{activeTrip.status}</Text>
      </View>

      <Text style={styles.orderNumber}>
        Order #{activeTrip.orderId} • {activeTrip.customerName}
      </Text>

      {/* Navigation Target & Deep-Link for Pickup */}
      {activeTrip.status === 'DRIVER_ASSIGNED' && (
        <View style={styles.navBox}>
          <Text style={styles.targetLabel}>Pickup Destination:</Text>
          <Text style={styles.targetAddr}>{activeTrip.pickupAddress}</Text>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => onLaunchNavigation(activeTrip.pickupCoords, activeTrip.pickupAddress)}
          >
            <Text style={styles.navBtnText}>🗺️ Open Google Maps Turn-by-Turn</Text>
          </TouchableOpacity>

          <GeofenceTripSlider
            actionLabel="Mark Arrived at Pickup"
            isInsideGeofence={pickupProximity.allowed}
            distanceMeters={pickupProximity.distanceMeters}
            onConfirmAction={onArrivedAtPickup}
          />
        </View>
      )}

      {activeTrip.status === 'ARRIVED_AT_PICKUP' && (
        <View style={styles.actionPromptBox}>
          <Text style={styles.promptText}>
            Arrived at pickup. Ask for verification PIN to start trip.
          </Text>
          <TouchableOpacity
            style={styles.verifyActionBtn}
            onPress={() => onOpenVerificationModal('PICKUP')}
          >
            <Text style={styles.verifyActionText}>Enter Verification PIN →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Navigation Target & Deep-Link for Drop */}
      {activeTrip.status === 'PICKED_UP' && (
        <View style={styles.navBox}>
          <Text style={styles.targetLabel}>Customer Drop Destination:</Text>
          <Text style={styles.targetAddr}>{activeTrip.dropAddress}</Text>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => onLaunchNavigation(activeTrip.dropCoords, activeTrip.dropAddress)}
          >
            <Text style={styles.navBtnText}>🗺️ Open Google Maps to Drop</Text>
          </TouchableOpacity>

          <GeofenceTripSlider
            actionLabel="Mark Arrived at Drop"
            isInsideGeofence={dropProximity.allowed}
            distanceMeters={dropProximity.distanceMeters}
            onConfirmAction={onArrivedAtDrop}
          />
        </View>
      )}

      {activeTrip.status === 'ARRIVED_AT_DROP' && (
        <View style={styles.actionPromptBox}>
          <Text style={styles.promptText}>
            Arrived at customer doorstep. Complete Proof of Delivery handover.
          </Text>
          <TouchableOpacity
            style={styles.verifyActionBtn}
            onPress={() => onOpenVerificationModal('DROP')}
          >
            <Text style={styles.verifyActionText}>Verify Drop & Complete Delivery →</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTrip.status === 'DELIVERED' && (
        <View style={styles.completedBox}>
          <Text style={styles.completedText}>
            ✓ Trip Completed! Earnings credited: ₹{activeTrip.fareInr}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tripCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 14 },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tripBadge: { backgroundColor: '#EEF2FF', color: '#4F46E5', fontWeight: '900', fontSize: 11, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tripStatus: { fontSize: 12, fontWeight: '800', color: '#059669' },
  orderNumber: { fontSize: 14, fontWeight: '800', color: '#1E293B', marginBottom: 12 },
  navBox: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, marginBottom: 10 },
  targetLabel: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  targetAddr: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginTop: 2, marginBottom: 10 },
  navBtn: { backgroundColor: '#EEF2FF', paddingVertical: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#C7D2FE' },
  navBtnText: { color: '#4338CA', fontWeight: '800', fontSize: 12 },
  actionPromptBox: { backgroundColor: '#FEF3C7', padding: 14, borderRadius: 10, alignItems: 'center' },
  promptText: { fontSize: 12, fontWeight: '700', color: '#92400E', textAlign: 'center', marginBottom: 10 },
  verifyActionBtn: { backgroundColor: '#10B981', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  verifyActionText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  completedBox: { backgroundColor: '#DCFCE7', padding: 14, borderRadius: 10, alignItems: 'center' },
  completedText: { color: '#166534', fontWeight: '800', fontSize: 13 },
});
