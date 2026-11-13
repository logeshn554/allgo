// Job: Screen to search street address or drag map pin for delivery location.

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { saveUserAddress } from '../data/userStorage';
import { LiveMapBox } from '../components/LiveMapBox';

interface Props {
  currentAddress: string;
  onAddressSaved: (addr: string) => void;
  onBack: () => void;
}

export const AddressPickerPage: React.FC<Props> = ({ currentAddress, onAddressSaved, onBack }) => {
  const [address, setAddress] = useState(currentAddress);

  const handleSave = () => {
    if (address.trim()) {
      saveUserAddress(address.trim());
      onAddressSaved(address.trim());
    }
  };

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.back}>← Cancel</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Delivery Address</Text>

      <LiveMapBox pickup={{ latitude: 12.9716, longitude: 77.5946 }} />

      <Text style={styles.label}>Street / Landmark Address</Text>
      <TextInput
        style={styles.input}
        value={address}
        onChangeText={setAddress}
        placeholder="Enter flat, building, street"
      />

      <TouchableOpacity style={styles.btn} onPress={handleSave}>
        <Text style={styles.btnText}>Save Address</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', padding: 20 },
  back: { color: '#4F46E5', fontWeight: '600', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 14 },
  btn: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
