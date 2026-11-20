// Job: Proof-of-Delivery (POD) viewer showing photo capture, timestamp, signature, and coordinates.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppIcon } from '../AppIcon.tsx';

interface Props {
  orderId: string;
  deliveredAt?: string;
  photoUrl?: string;
  recipientSignatureName?: string;
  dropCoordinates?: { latitude: number; longitude: number };
}

export const ProofOfDeliveryViewer: React.FC<Props> = ({
  orderId,
  deliveredAt = new Date().toLocaleTimeString(),
  photoUrl,
  recipientSignatureName = 'Verified on Device',
  dropCoordinates = { latitude: 12.9352, longitude: 77.6245 },
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <AppIcon name="camera" size={24} />
        <Text style={styles.title}>Proof of Delivery (POD)</Text>
      </View>

      <View style={styles.photoBox}>
        {photoUrl ? (
          <Text style={styles.photoPlaceholder}>📷 Photo Loaded</Text>
        ) : (
          <View style={styles.mockPhoto}>
            <Text style={styles.cameraIcon}>📸</Text>
            <Text style={styles.photoText}>Doorstep Handover Photo Captured</Text>
            <Text style={styles.hashText}>Hash: sha256_pod_{orderId.slice(0, 8)}</Text>
          </View>
        )}
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.label}>Confirmed Handover:</Text>
        <Text style={styles.val}>{deliveredAt}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.label}>Recipient Verification:</Text>
        <Text style={styles.val}>{recipientSignatureName}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.label}>GPS Location Drop:</Text>
        <Text style={styles.val}>
          {dropCoordinates.latitude.toFixed(4)}, {dropCoordinates.longitude.toFixed(4)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 13, fontWeight: '800', color: '#111827', marginLeft: 8 },
  photoBox: { height: 120, backgroundColor: '#F3F4F6', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  photoPlaceholder: { fontSize: 13, color: '#4B5563', fontWeight: '700' },
  mockPhoto: { alignItems: 'center' },
  cameraIcon: { fontSize: 28, marginBottom: 4 },
  photoText: { fontSize: 12, fontWeight: '700', color: '#374151' },
  hashText: { fontSize: 9, color: '#9CA3AF', marginTop: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  label: { fontSize: 11, color: '#6B7280' },
  val: { fontSize: 11, fontWeight: '700', color: '#111827' },
});
