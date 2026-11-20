// Job: Multi-stop address picker with pickup, multiple drop-offs, and geocoded autocomplete suggestions.

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { AppIcon } from '../AppIcon.tsx';

export interface StopLocation {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface Props {
  pickup: StopLocation;
  dropoffs: StopLocation[];
  onPickupChange: (loc: StopLocation) => void;
  onDropoffsChange: (drops: StopLocation[]) => void;
}

const POPULAR_HUBS: StopLocation[] = [
  { id: 'hub_1', address: 'Indiranagar 100ft Road, Bengaluru', latitude: 12.9716, longitude: 77.5946 },
  { id: 'hub_2', address: 'Koramangala Sony World Signal, Bengaluru', latitude: 12.9352, longitude: 77.6245 },
  { id: 'hub_3', address: 'MG Road Metro Station, Bengaluru', latitude: 12.9756, longitude: 77.6066 },
  { id: 'hub_4', address: 'Whitefield ITPL Main Gate, Bengaluru', latitude: 12.9866, longitude: 77.7381 },
];

export const RideMultiStopPicker: React.FC<Props> = ({
  pickup,
  dropoffs,
  onPickupChange,
  onDropoffsChange,
}) => {
  const [activeInput, setActiveInput] = useState<'pickup' | number | null>(null);

  const addStop = () => {
    if (dropoffs.length >= 3) return; // Max 3 stops
    const nextNum = dropoffs.length + 1;
    onDropoffsChange([
      ...dropoffs,
      { id: `stop_${Date.now()}`, address: `Stop ${nextNum}`, latitude: 12.95 + nextNum * 0.01, longitude: 77.61 },
    ]);
  };

  const removeStop = (index: number) => {
    if (dropoffs.length <= 1) return;
    const updated = dropoffs.filter((_, i) => i !== index);
    onDropoffsChange(updated);
  };

  const selectHub = (hub: StopLocation) => {
    if (activeInput === 'pickup') {
      onPickupChange(hub);
    } else if (typeof activeInput === 'number' && dropoffs[activeInput]) {
      const updated = [...dropoffs];
      updated[activeInput] = { ...hub, id: dropoffs[activeInput]!.id };
      onDropoffsChange(updated);
    }
    setActiveInput(null);
  };

  return (
    <View style={styles.card}>
      {/* Pickup Input */}
      <View style={styles.row}>
        <AppIcon name="pin" size={24} />
        <TextInput
          style={styles.input}
          value={pickup.address}
          onFocus={() => setActiveInput('pickup')}
          onChangeText={(txt) => onPickupChange({ ...pickup, address: txt })}
          placeholder="Pickup Location"
        />
      </View>

      {/* Dynamic Drop-offs */}
      {dropoffs.map((drop, idx) => (
        <View key={drop.id} style={styles.row}>
          <Text style={styles.dot}>●</Text>
          <TextInput
            style={styles.input}
            value={drop.address}
            onFocus={() => setActiveInput(idx)}
            onChangeText={(txt) => {
              const updated = [...dropoffs];
              updated[idx] = { ...drop, address: txt };
              onDropoffsChange(updated);
            }}
            placeholder={idx === dropoffs.length - 1 ? 'Final Destination' : `Stop ${idx + 1}`}
          />
          {dropoffs.length > 1 && (
            <TouchableOpacity onPress={() => removeStop(idx)} style={styles.delBtn}>
              <Text style={styles.delText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      {/* Add Stop Button */}
      {dropoffs.length < 3 && (
        <TouchableOpacity style={styles.addStopBtn} onPress={addStop}>
          <Text style={styles.addStopText}>+ Add Stop along route</Text>
        </TouchableOpacity>
      )}

      {/* Autocomplete Quick Hubs */}
      {activeInput !== null && (
        <View style={styles.hubList}>
          <Text style={styles.hubTitle}>Suggested Locations:</Text>
          {POPULAR_HUBS.map((hub) => (
            <TouchableOpacity key={hub.id} style={styles.hubItem} onPress={() => selectHub(hub)}>
              <Text style={styles.hubText}>{hub.address}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dot: { color: '#EF4444', fontSize: 16, marginRight: 8, width: 24, textAlign: 'center' },
  input: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#111827' },
  delBtn: { padding: 8, marginLeft: 4 },
  delText: { color: '#9CA3AF', fontSize: 14, fontWeight: '700' },
  addStopBtn: { alignSelf: 'flex-start', marginTop: 4, paddingVertical: 4 },
  addStopText: { color: '#4F46E5', fontSize: 12, fontWeight: '700' },
  hubList: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  hubTitle: { fontSize: 11, fontWeight: '700', color: '#6B7280', marginBottom: 6 },
  hubItem: { paddingVertical: 6 },
  hubText: { fontSize: 13, color: '#374151' },
});
