// Job: Shareable public recipient tracking link with copy to clipboard and WhatsApp shortcut.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AppIcon } from '../AppIcon.tsx';

interface Props {
  orderId: string;
  trackingToken?: string;
}

export const PublicTrackingShare: React.FC<Props> = ({
  orderId,
  trackingToken = 'trk_sec_9941',
}) => {
  const [copied, setCopied] = useState(false);
  const publicUrl = `https://allgo.app/track/${orderId}?token=${trackingToken}`;

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <AppIcon name="share" size={24} />
        <Text style={styles.title}>Recipient Live Tracking Link</Text>
      </View>
      <Text style={styles.subtitle}>
        Send this secure link so the receiver can watch courier location in real time without creating an account:
      </Text>

      <View style={styles.linkRow}>
        <Text style={styles.urlText} numberOfLines={1}>
          {publicUrl}
        </Text>
        <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
          <Text style={styles.copyText}>{copied ? '✓ Copied' : 'Copy'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.whatsappBtn} onPress={handleCopy}>
        <Text style={styles.whatsappText}>💬 Share via WhatsApp / SMS</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#F0FDF4', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#BBF7D0' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  title: { fontSize: 13, fontWeight: '800', color: '#166534', marginLeft: 8 },
  subtitle: { fontSize: 11, color: '#15803D', marginBottom: 10, lineHeight: 16 },
  linkRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#86EFAC', marginBottom: 10 },
  urlText: { flex: 1, fontSize: 11, color: '#374151' },
  copyBtn: { backgroundColor: '#166534', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, marginLeft: 8 },
  copyText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  whatsappBtn: { backgroundColor: '#22C55E', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  whatsappText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
});
