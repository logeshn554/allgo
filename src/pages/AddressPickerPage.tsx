// Job: Multi-tier structured address management (lat/lon, apt/floor, landmark, gate instructions) with reverse geocoding.

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { saveUserAddress } from '../data/userStorage';
import { saveAddress, reverseGeocode, getActiveAddress, StructuredAddress } from '../data/geocodingService';
import { LiveMapBox } from '../components/LiveMapBox';

interface Props {
  currentAddress: string;
  onAddressSaved: (addr: string) => void;
  onBack: () => void;
}

export const AddressPickerPage: React.FC<Props> = ({ currentAddress, onAddressSaved, onBack }) => {
  const active = getActiveAddress();
  const [street, setStreet] = useState(active.streetAddress || currentAddress);
  const [aptFloor, setAptFloor] = useState(active.apartmentFloor || '');
  const [landmark, setLandmark] = useState(active.landmark || '');
  const [gateInstructions, setGateInstructions] = useState(active.gateInstructions || '');
  const [tag, setTag] = useState<'Home' | 'Work' | 'Other'>(active.tag || 'Home');
  const [coords, setCoords] = useState({ latitude: active.latitude || 12.9716, longitude: active.longitude || 77.5946 });
  const [geocoding, setGeocoding] = useState(false);

  const handleReverseGeocode = async () => {
    setGeocoding(true);
    const resolved = await reverseGeocode(coords.latitude, coords.longitude);
    setStreet(resolved.street);
    setLandmark(resolved.landmark);
    setGeocoding(false);
  };

  const handleSave = () => {
    if (!street.trim()) return;

    const saved: StructuredAddress = saveAddress({
      streetAddress: street.trim(),
      apartmentFloor: aptFloor.trim(),
      landmark: landmark.trim(),
      gateInstructions: gateInstructions.trim(),
      latitude: coords.latitude,
      longitude: coords.longitude,
      tag,
    });

    saveUserAddress(saved.formattedAddress);
    onAddressSaved(saved.formattedAddress);
  };

  return (
    <ScrollView style={styles.screen}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.back}>← Cancel</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Multi-Tier Delivery Address</Text>

      <LiveMapBox pickup={coords} />

      <TouchableOpacity style={styles.geocodeBtn} onPress={handleReverseGeocode} disabled={geocoding}>
        <Text style={styles.geocodeText}>
          {geocoding ? 'Detecting via Reverse Geocoding...' : '📍 Auto-Detect Street via Reverse Geocode'}
        </Text>
      </TouchableOpacity>

      <View style={styles.tagRow}>
        {(['Home', 'Work', 'Other'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tagBtn, tag === t && styles.tagBtnActive]}
            onPress={() => setTag(t)}
          >
            <Text style={[styles.tagText, tag === t && styles.tagTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>House / Flat / Floor / Building *</Text>
      <TextInput
        style={styles.input}
        value={aptFloor}
        onChangeText={setAptFloor}
        placeholder="e.g. Flat 402, 4th Floor, Tower B"
      />

      <Text style={styles.label}>Street / Road / Area *</Text>
      <TextInput
        style={styles.input}
        value={street}
        onChangeText={setStreet}
        placeholder="e.g. MG Road, Ashok Nagar"
      />

      <Text style={styles.label}>Nearby Landmark (Optional)</Text>
      <TextInput
        style={styles.input}
        value={landmark}
        onChangeText={setLandmark}
        placeholder="e.g. Opposite Metro Pillar 128"
      />

      <Text style={styles.label}>Delivery Gate & Drop-off Instructions</Text>
      <TextInput
        style={styles.input}
        value={gateInstructions}
        onChangeText={setGateInstructions}
        placeholder="e.g. Call at gate; leave with security if unreachable"
      />

      <TouchableOpacity style={styles.btn} onPress={handleSave}>
        <Text style={styles.btnText}>Save Structured Address</Text>
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', padding: 20 },
  back: { color: '#6200EA', fontWeight: '700', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 14 },
  geocodeBtn: {
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  geocodeText: { color: '#334155', fontWeight: '700', fontSize: 13 },
  tagRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  tagBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  tagBtnActive: { backgroundColor: '#6200EA', borderColor: '#6200EA' },
  tagText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  tagTextActive: { color: '#FFFFFF' },
  label: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 13,
  },
  btn: {
    backgroundColor: '#00C853',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
});
