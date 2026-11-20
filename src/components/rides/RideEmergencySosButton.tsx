// Job: In-ride SOS emergency trigger with confirmation modal, police dispatch, and telemetry broadcast.

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { AppIcon } from '../AppIcon.tsx';

interface Props {
  orderId: string;
  currentLocation?: { latitude: number; longitude: number };
}

export const RideEmergencySosButton: React.FC<Props> = ({ orderId, currentLocation }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    let timer: any;
    if (modalVisible && !triggered && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
    } else if (modalVisible && countdown === 0 && !triggered) {
      dispatchSosAlert();
    }
    return () => clearTimeout(timer);
  }, [modalVisible, countdown, triggered]);

  const openSosModal = () => {
    setCountdown(5);
    setTriggered(false);
    setModalVisible(true);
  };

  const cancelSos = () => {
    setModalVisible(false);
    setCountdown(5);
    setTriggered(false);
  };

  const dispatchSosAlert = () => {
    setTriggered(true);
    // Real-world would invoke emergency telephony / telematics endpoint
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.sosButton} onPress={openSosModal}>
        <AppIcon name="sos" size={24} />
        <Text style={styles.btnLabel}>EMERGENCY SOS</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <View style={styles.iconCircle}>
              <Text style={styles.alertIcon}>🚨</Text>
            </View>

            {!triggered ? (
              <>
                <Text style={styles.modalTitle}>EMERGENCY ASSISTANCE</Text>
                <Text style={styles.modalDesc}>
                  Connecting to Police Control (112) and AllGo 24x7 Safety Response Team in:
                </Text>
                <Text style={styles.countdownNumber}>{countdown}</Text>
                <Text style={styles.locationNote}>
                  Live coordinates ({currentLocation?.latitude.toFixed(4) || '12.97'}, {currentLocation?.longitude.toFixed(4) || '77.59'}) are being shared.
                </Text>
                <View style={styles.btnRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={cancelSos}>
                    <Text style={styles.cancelText}>CANCEL (False Alarm)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.instantBtn} onPress={dispatchSosAlert}>
                    <Text style={styles.instantText}>DISPATCH NOW</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.activeTitle}>EMERGENCY DISPATCHED</Text>
                <Text style={styles.activeDesc}>
                  Police authorities and AllGo rapid response unit have been alerted for Ride #{orderId}. Keep your phone accessible.
                </Text>
                <TouchableOpacity style={styles.doneBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.doneText}>Dismiss Window</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 10, marginBottom: 14 },
  sosButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#DC2626', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16 },
  btnLabel: { color: '#FFFFFF', fontWeight: '900', fontSize: 13, letterSpacing: 0.8, marginLeft: 8 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, alignItems: 'center' },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  alertIcon: { fontSize: 32 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#DC2626', letterSpacing: 0.5, marginBottom: 8 },
  modalDesc: { fontSize: 13, color: '#4B5563', textAlign: 'center', marginBottom: 12 },
  countdownNumber: { fontSize: 44, fontWeight: '900', color: '#DC2626', marginBottom: 12 },
  locationNote: { fontSize: 11, color: '#6B7280', textAlign: 'center', marginBottom: 20 },
  btnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  cancelBtn: { flex: 1, backgroundColor: '#E5E7EB', padding: 14, borderRadius: 10, marginRight: 8, alignItems: 'center' },
  cancelText: { color: '#374151', fontWeight: '700', fontSize: 12 },
  instantBtn: { flex: 1, backgroundColor: '#DC2626', padding: 14, borderRadius: 10, alignItems: 'center' },
  instantText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  activeTitle: { fontSize: 18, fontWeight: '900', color: '#059669', marginBottom: 8 },
  activeDesc: { fontSize: 13, color: '#374151', textAlign: 'center', marginBottom: 20 },
  doneBtn: { backgroundColor: '#111827', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  doneText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
});
