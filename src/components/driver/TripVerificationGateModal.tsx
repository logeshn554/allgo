// Job: Verification gate modal for Customer Ride PIN, Merchant Grocery OTP, and Parcel/Grocery Drop OTP with Camera Photo PoD.

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { AppIcon } from '../AppIcon.tsx';
import { DriverActiveTrip } from '../../data/driverTripExecution.ts';

interface Props {
  visible: boolean;
  gateType: 'PICKUP' | 'DROP';
  trip: DriverActiveTrip;
  onVerifyPickup: (code: string) => void;
  onVerifyDrop: (otp: string, photoUrl: string) => void;
  onClose: () => void;
}

export const TripVerificationGateModal: React.FC<Props> = ({
  visible,
  gateType,
  trip,
  onVerifyPickup,
  onVerifyDrop,
  onClose,
}) => {
  const [code, setCode] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  if (!visible) return null;

  const isPickup = gateType === 'PICKUP';
  const isRide = trip.vertical === 'RIDE';

  const title = isPickup
    ? isRide
      ? 'Customer Ride Start PIN'
      : 'Merchant Handover OTP'
    : 'Drop-off Verification & PoD';

  const promptText = isPickup
    ? isRide
      ? "Ask the passenger for their 4-digit Ride Start PIN before moving."
      : 'Verify the merchant outlet handover OTP before leaving.'
    : 'Ask customer for Drop OTP and capture a clear doorstep photo.';

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <AppIcon name="shield" size={24} />
            <Text style={styles.title}>{title}</Text>
          </View>
          <Text style={styles.subText}>{promptText}</Text>

          {/* 4-digit PIN / OTP input */}
          <Text style={styles.label}>Enter 4-Digit Verification Code:</Text>
          <TextInput
            style={styles.pinInput}
            value={code}
            onChangeText={setCode}
            placeholder="e.g. 1234"
            keyboardType="number-pad"
            maxLength={4}
          />

          {/* Contactless Drop Photo for Parcel / Grocery */}
          {!isPickup && !isRide && (
            <View style={styles.photoBox}>
              <Text style={styles.label}>Doorstep Proof of Delivery (PoD) Photo:</Text>
              <TextInput
                style={styles.input}
                value={photoUrl}
                onChangeText={setPhotoUrl}
                placeholder="Photo filename (e.g. proof_drop_492.jpg)"
              />
              <TouchableOpacity
                style={styles.cameraBtn}
                onPress={() => setPhotoUrl(`storage/proof_pod_${Date.now()}.jpg`)}
              >
                <Text style={styles.cameraBtnText}>📸 Capture Drop Photo</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => {
                if (isPickup) {
                  onVerifyPickup(code);
                } else {
                  onVerifyDrop(code, photoUrl);
                }
              }}
            >
              <Text style={styles.submitText}>Verify & Proceed</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, width: '100%', maxWidth: 420 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  title: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  subText: { fontSize: 12, color: '#64748B', lineHeight: 18, marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 },
  pinInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12, fontSize: 20, fontWeight: '900', letterSpacing: 6, textAlign: 'center', marginBottom: 14 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 12, marginBottom: 6 },
  photoBox: { marginBottom: 14 },
  cameraBtn: { backgroundColor: '#EEF2FF', padding: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#C7D2FE' },
  cameraBtnText: { color: '#4338CA', fontWeight: '800', fontSize: 12 },
  btnRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center' },
  cancelText: { color: '#64748B', fontWeight: '700', fontSize: 13 },
  submitBtn: { flex: 2, backgroundColor: '#10B981', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  submitText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
});
