// Job: Partner KYC document verification status dashboard (DL, RC, Commercial Insurance, Liveness Selfie).

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

interface KycDocumentItem {
  id: string;
  title: string;
  docNumber: string;
  status: 'VERIFIED' | 'PENDING_REVIEW' | 'ACTION_REQUIRED' | 'EXPIRED';
  expiryDate?: string;
  remarks: string;
}

const DEFAULT_DOCS: KycDocumentItem[] = [
  {
    id: 'doc_dl',
    title: 'Driving License (DL)',
    docNumber: 'KA-04-20190008821',
    status: 'VERIFIED',
    expiryDate: '2035-08-14',
    remarks: 'Commercial transport endorsement verified.',
  },
  {
    id: 'doc_rc',
    title: 'Vehicle Registration (RC)',
    docNumber: 'KA-04-ME-4491 (Hero Splendor+)',
    status: 'VERIFIED',
    expiryDate: '2032-11-20',
    remarks: 'Ownership and fitness check clear.',
  },
  {
    id: 'doc_ins',
    title: 'Commercial Fleet Insurance',
    docNumber: 'POL-ICICI-8891283',
    status: 'ACTION_REQUIRED',
    expiryDate: '2026-11-30',
    remarks: 'Renewal policy copy required within 12 days.',
  },
  {
    id: 'doc_selfie',
    title: 'Liveness Selfie & Facial Check',
    docNumber: 'BIO-PASS-OK',
    status: 'VERIFIED',
    remarks: 'Matched against government ID photo successfully.',
  },
];

interface Props {
  onBack: () => void;
}

export const KycDocumentStatusPage: React.FC<Props> = ({ onBack }) => {
  const [docs, setDocs] = useState<KycDocumentItem[]>(DEFAULT_DOCS);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleRenew = (docId: string) => {
    setDocs((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, status: 'PENDING_REVIEW', remarks: 'New policy document uploaded. Verification in progress.' } : d))
    );
    setFeedback('Document submitted for administrative review!');
  };

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backLink}>← Return to Console</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Partner KYC & Document Status</Text>
      </View>

      {feedback && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>{feedback}</Text>
        </View>
      )}

      <Text style={styles.subtitle}>
        Mandatory documents required to remain active across Rides, Grocery, and Parcel duty fleets:
      </Text>

      {docs.map((doc) => {
        const isVerified = doc.status === 'VERIFIED';
        const isAction = doc.status === 'ACTION_REQUIRED';
        return (
          <View key={doc.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.docTitle}>{doc.title}</Text>
                <Text style={styles.docNumber}>{doc.docNumber}</Text>
              </View>
              <View style={[styles.badge, isVerified ? styles.badgeVerified : isAction ? styles.badgeAction : styles.badgePending]}>
                <Text style={[styles.badgeText, isVerified ? styles.badgeTextVerified : isAction ? styles.badgeTextAction : styles.badgeTextPending]}>
                  {doc.status}
                </Text>
              </View>
            </View>

            <Text style={styles.remarks}>{doc.remarks}</Text>
            {doc.expiryDate && <Text style={styles.expiry}>Expiry Date: {doc.expiryDate}</Text>}

            {isAction && (
              <TouchableOpacity style={styles.uploadBtn} onPress={() => handleRenew(doc.id)}>
                <Text style={styles.uploadBtnText}>Upload Renewed Document</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  topBar: { marginBottom: 12 },
  backLink: { color: '#6200EA', fontWeight: '800', fontSize: 13, marginBottom: 4 },
  title: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  subtitle: { fontSize: 12, color: '#64748B', marginBottom: 14 },
  alertBanner: { backgroundColor: '#DCFCE7', borderRadius: 8, padding: 10, marginBottom: 12 },
  alertText: { color: '#166534', fontSize: 12, fontWeight: '700' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  docTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  docNumber: { fontSize: 11, color: '#64748B', fontFamily: 'monospace', marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeVerified: { backgroundColor: '#DCFCE7' },
  badgeAction: { backgroundColor: '#FEE2E2' },
  badgePending: { backgroundColor: '#EFF6FF' },
  badgeText: { fontSize: 10, fontWeight: '800' },
  badgeTextVerified: { color: '#166534' },
  badgeTextAction: { color: '#DC2626' },
  badgeTextPending: { color: '#1E40AF' },
  remarks: { fontSize: 12, color: '#475569', lineHeight: 16 },
  expiry: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
  uploadBtn: { backgroundColor: '#EF4444', paddingVertical: 8, borderRadius: 6, alignItems: 'center', marginTop: 10 },
  uploadBtnText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
});
