// Job: Duty Online/Offline toggle with multi-vertical service selectors (Rides, Grocery, Parcel) and telemetry state.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DriverVertical } from '../../data/driverDispatchService.ts';

interface Props {
  isOnline: boolean;
  selectedVerticals: DriverVertical[];
  onToggleOnline: () => void;
  onToggleVertical: (vertical: DriverVertical) => void;
}

export const MultiVerticalShiftBar: React.FC<Props> = ({
  isOnline,
  selectedVerticals,
  onToggleOnline,
  onToggleVertical,
}) => {
  const verticals: { key: DriverVertical; label: string; icon: string }[] = [
    { key: 'RIDE', label: 'Rides', icon: '🚕' },
    { key: 'GROCERY', label: 'Grocery', icon: '🛒' },
    { key: 'PARCEL', label: 'Parcel', icon: '📦' },
  ];

  return (
    <View style={styles.card}>
      {/* Shift Duty Status */}
      <View style={styles.dutyRow}>
        <View style={styles.dutyInfo}>
          <View style={[styles.statusDot, isOnline ? styles.dotOnline : styles.dotOffline]} />
          <View>
            <Text style={styles.dutyTitle}>
              Shift Status: {isOnline ? 'ONLINE & ACTIVE' : 'OFFLINE'}
            </Text>
            <Text style={styles.dutySub}>
              {isOnline ? 'GPS Telemetry streaming (3s active / 15s idle)' : 'Go Online to receive customer orders'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.dutyBtn, isOnline ? styles.dutyBtnOffline : styles.dutyBtnOnline]}
          onPress={onToggleOnline}
        >
          <Text style={styles.dutyBtnText}>{isOnline ? 'Go Offline' : 'Go Online'}</Text>
        </TouchableOpacity>
      </View>

      {/* Vertical Selectors */}
      {isOnline && (
        <View style={styles.verticalSection}>
          <Text style={styles.sectionLabel}>Opt-in Dispatch Categories:</Text>
          <View style={styles.verticalPillsRow}>
            {verticals.map((v) => {
              const active = selectedVerticals.includes(v.key);
              return (
                <TouchableOpacity
                  key={v.key}
                  style={[styles.pill, active && styles.pillActive]}
                  onPress={() => onToggleVertical(v.key)}
                >
                  <Text style={styles.pillText}>
                    {v.icon} {v.label} {active ? '✓' : '+'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  dutyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dutyInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  dotOnline: { backgroundColor: '#10B981' },
  dotOffline: { backgroundColor: '#94A3B8' },
  dutyTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  dutySub: { fontSize: 11, color: '#64748B', marginTop: 1 },
  dutyBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  dutyBtnOnline: { backgroundColor: '#10B981' },
  dutyBtnOffline: { backgroundColor: '#EF4444' },
  dutyBtnText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  verticalSection: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 6 },
  verticalPillsRow: { flexDirection: 'row', gap: 8 },
  pill: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC', alignItems: 'center' },
  pillActive: { backgroundColor: '#EEF2FF', borderColor: '#6366F1' },
  pillText: { fontSize: 11, fontWeight: '800', color: '#334155' },
});
