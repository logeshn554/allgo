// Job: Dispute resolution modal with GPS proximity analysis, photo proof, and pro-rated wallet refunds.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput } from 'react-native';
import {
  DisputeAuditRecord,
  evaluateDisputeGpsProximity,
  processDisputeRefund,
} from '../data/adminDispatchService';

interface Props {
  visible: boolean;
  orderId: string;
  onClose: () => void;
  onResolved: (record: DisputeAuditRecord) => void;
}

export const DisputeRefundModal: React.FC<Props> = ({
  visible,
  orderId,
  onClose,
  onResolved,
}) => {
  const [refundAmount, setRefundAmount] = useState('250');
  const [reason, setReason] = useState('Order dropped at wrong entrance gate');

  // Evaluate GPS Proximity between customer dropoff and driver delivery scan
  const gpsCheck = evaluateDisputeGpsProximity(12.9716, 77.5946, 12.9780, 77.6020);

  const handleIssueRefund = () => {
    const amountCents = Math.round(Number(refundAmount) * 100);
    const auditRecord = processDisputeRefund(orderId, 'cust_dispute_1', amountCents, reason);
    onResolved(auditRecord);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>⚖️ Delivery Dispute Audit #{orderId}</Text>
              <Text style={styles.sub}>Multi-role GPS & photo forensics audit trail</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* GPS Proximity Audit Card */}
          <View style={[styles.auditBox, !gpsCheck.isWithinDeliveryPerimeter && styles.auditBoxMismatch]}>
            <Text style={styles.auditTitle}>
              {gpsCheck.isWithinDeliveryPerimeter ? '✓ Driver GPS Matched Destination' : '⚠️ GPS Distance Discrepancy Detected'}
            </Text>
            <Text style={styles.auditDesc}>
              Driver scanned delivery {gpsCheck.distanceMeters}m away from customer gate (Threshold: 100m).
            </Text>
          </View>

          {/* Photo Proof Analysis */}
          <View style={styles.proofBox}>
            <Text style={styles.proofHeading}>📷 Driver Uploaded Photo Proof:</Text>
            <Text style={styles.proofKey}>Key: storage/delivery_proof_ORD902.jpg</Text>
            <Text style={styles.proofSub}>Photo shows package on unlabeled lobby counter.</Text>
          </View>

          {/* Pro-Rated Refund Controls */}
          <Text style={styles.label}>Refund Amount (₹):</Text>
          <TextInput
            style={styles.input}
            value={refundAmount}
            onChangeText={setRefundAmount}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Resolution Audit Note:</Text>
          <TextInput
            style={styles.input}
            value={reason}
            onChangeText={setReason}
          />

          <TouchableOpacity style={styles.refundBtn} onPress={handleIssueRefund}>
            <Text style={styles.refundText}>
              Authorize ₹{refundAmount} Pro-Rated Refund to Wallet
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  sub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  closeBtn: { fontSize: 18, color: '#64748B', fontWeight: '800' },
  auditBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  auditBoxMismatch: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
  auditTitle: { fontSize: 13, fontWeight: '800', color: '#991B1B' },
  auditDesc: { fontSize: 12, color: '#7F1D1D', marginTop: 4 },
  proofBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  proofHeading: { fontSize: 12, fontWeight: '700', color: '#334155' },
  proofKey: { fontSize: 11, color: '#64748B', fontFamily: 'monospace', marginVertical: 2 },
  proofSub: { fontSize: 12, color: '#475569' },
  label: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    marginBottom: 12,
  },
  refundBtn: {
    backgroundColor: '#DC2626',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  refundText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
});
