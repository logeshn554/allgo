// Job: Reusable Driver Proof-of-Delivery input widget with PIN, photo capture, and signature.

import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { PodMethod } from '../data/proofOfDeliveryService.ts';

interface Props {
  podMethod: PodMethod;
  onSetPodMethod: (m: PodMethod) => void;
  pin: string;
  onSetPin: (val: string) => void;
  photoUrl: string;
  onSetPhotoUrl: (val: string) => void;
  signature: string;
  onSetSignature: (val: string) => void;
  onVerify: () => void;
}

export const DriverPodHandoverBox: React.FC<Props> = ({
  podMethod,
  onSetPodMethod,
  pin,
  onSetPin,
  photoUrl,
  onSetPhotoUrl,
  signature,
  onSetSignature,
  onVerify,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Proof of Delivery (Compulsory Handover)</Text>
      <View style={styles.podRow}>
        {(['PIN', 'PHOTO', 'SIGNATURE'] as const).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.podBtn, podMethod === m && styles.podBtnActive]}
            onPress={() => onSetPodMethod(m)}
          >
            <Text style={[styles.podText, podMethod === m && styles.podTextActive]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {podMethod === 'PIN' && (
        <TextInput
          style={styles.input}
          value={pin}
          onChangeText={onSetPin}
          placeholder="Enter Customer's 4-Digit PIN"
          maxLength={4}
        />
      )}

      {podMethod === 'PHOTO' && (
        <View style={styles.photoContainer}>
          <TextInput
            style={styles.input}
            value={photoUrl}
            onChangeText={onSetPhotoUrl}
            placeholder="Camera Photo URL (e.g. storage/proof_123.jpg)"
          />
          <TouchableOpacity
            style={styles.simCamBtn}
            onPress={() => onSetPhotoUrl(`storage/proof_drop_${Date.now()}.jpg`)}
          >
            <Text style={styles.simCamText}>📸 Capture Drop-off Photo</Text>
          </TouchableOpacity>
        </View>
      )}

      {podMethod === 'SIGNATURE' && (
        <View style={styles.photoContainer}>
          <TextInput
            style={styles.input}
            value={signature}
            onChangeText={onSetSignature}
            placeholder="Digital signature captured"
          />
          <TouchableOpacity
            style={styles.simCamBtn}
            onPress={() => onSetSignature(`data:image/svg+xml;sign_${Date.now()}`)}
          >
            <Text style={styles.simCamText}>✍️ Capture Customer Signature</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.verifyBtn} onPress={onVerify}>
        <Text style={styles.verifyText}>Verify PoD & Complete Drop-off</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 14 },
  label: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 13 },
  podRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  podBtn: { flex: 1, paddingVertical: 8, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, alignItems: 'center' },
  podBtnActive: { backgroundColor: '#00C853', borderColor: '#00C853' },
  podText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  podTextActive: { color: '#FFF' },
  photoContainer: { marginBottom: 10 },
  simCamBtn: { backgroundColor: '#E0E7FF', padding: 8, borderRadius: 6, alignItems: 'center', marginTop: 4 },
  simCamText: { color: '#4338CA', fontWeight: '700', fontSize: 12 },
  verifyBtn: { backgroundColor: '#00C853', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  verifyText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
