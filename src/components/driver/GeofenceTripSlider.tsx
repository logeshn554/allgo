// Job: 150m geofence-gated slider action button for ARRIVED_AT_PICKUP and ARRIVED_AT_DROP.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  actionLabel: string;
  isInsideGeofence: boolean;
  distanceMeters: number;
  onConfirmAction: () => void;
}

export const GeofenceTripSlider: React.FC<Props> = ({
  actionLabel,
  isInsideGeofence,
  distanceMeters,
  onConfirmAction,
}) => {
  return (
    <View style={styles.container}>
      {/* Geofence Distance Indicator */}
      <View style={[styles.statusBanner, isInsideGeofence ? styles.statusInside : styles.statusOutside]}>
        <Text style={[styles.statusText, isInsideGeofence ? styles.statusTextInside : styles.statusTextOutside]}>
          {isInsideGeofence
            ? `📍 Inside Geofence (${distanceMeters}m away • ≤150m limit)`
            : `⚠️ Outside Geofence (${distanceMeters}m away • Must be within 150m)`}
        </Text>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={[styles.sliderBtn, !isInsideGeofence && styles.sliderBtnDisabled]}
        onPress={onConfirmAction}
        disabled={!isInsideGeofence}
      >
        <Text style={styles.sliderBtnText}>
          {isInsideGeofence ? `Slide to ${actionLabel} →` : `Approach Destination to ${actionLabel}`}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 12, marginBottom: 12 },
  statusBanner: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginBottom: 8, alignItems: 'center' },
  statusInside: { backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#86EFAC' },
  statusOutside: { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A' },
  statusText: { fontSize: 12, fontWeight: '700' },
  statusTextInside: { color: '#166534' },
  statusTextOutside: { color: '#92400E' },
  sliderBtn: { backgroundColor: '#2563EB', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  sliderBtnDisabled: { backgroundColor: '#94A3B8' },
  sliderBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
