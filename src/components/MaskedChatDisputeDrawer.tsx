// Job: In-app masked customer-driver chat drawer with one-tap dispute resolution and instant refund.

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { AppIcon } from './AppIcon.tsx';
import { creditWallet } from '../data/walletStorage.ts';

interface Message {
  id: string;
  sender: 'customer' | 'driver';
  text: string;
  time: string;
}

interface Props {
  orderId: string;
  driverName?: string;
  onClose: () => void;
  onDisputeResolved?: (refundAmountInr: number) => void;
}

const DISPUTE_REASONS = [
  { id: 'wrong_route', label: 'Driver took significantly longer route', refundPct: 20 },
  { id: 'missing_item', label: 'Items missing from packaged bag', refundPct: 50 },
  { id: 'damaged', label: 'Package or items arrived damaged', refundPct: 100 },
  { id: 'no_show', label: 'Driver marked delivered but no show', refundPct: 100 },
];

export const MaskedChatDisputeDrawer: React.FC<Props> = ({
  orderId,
  driverName = 'Murugan K.',
  onClose,
  onDisputeResolved,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'dispute'>('chat');
  const [messages, setMessages] = useState<Message[]>([
    { id: 'm1', sender: 'driver', text: "Hello! I am on my way to your location.", time: '2:14 PM' },
    { id: 'm2', sender: 'customer', text: "Please call when you reach the gate.", time: '2:15 PM' },
  ]);
  const [inputTxt, setInputTxt] = useState('');
  const [selectedDispute, setSelectedDispute] = useState<string | null>(null);
  const [refundStatus, setRefundStatus] = useState<string | null>(null);

  const sendMessage = () => {
    if (!inputTxt.trim()) return;
    setMessages([
      ...messages,
      { id: `msg_${Date.now()}`, sender: 'customer', text: inputTxt.trim(), time: 'Just now' },
    ]);
    setInputTxt('');
  };

  const handleClaimRefund = (refundPct: number) => {
    const refundInr = Math.round(150 * (refundPct / 100));
    creditWallet(refundInr * 100, `Instant Refund: Order #${orderId}`);
    setRefundStatus(`₹${refundInr} credited instantly to your AllGo Wallet!`);
    onDisputeResolved?.(refundInr);
  };

  return (
    <View style={styles.drawer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleCol}>
          <Text style={styles.driverTitle}>{driverName} (Assigned Driver)</Text>
          <Text style={styles.maskedNotice}>🔒 Number Masking Active • Order #{orderId}</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'chat' && styles.tabActive]}
          onPress={() => setActiveTab('chat')}
        >
          <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>💬 Masked Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'dispute' && styles.tabActive]}
          onPress={() => setActiveTab('dispute')}
        >
          <Text style={[styles.tabText, activeTab === 'dispute' && styles.tabTextActive]}>⚖️ Report Issue / Refund</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'chat' ? (
        <View style={styles.chatArea}>
          <ScrollView style={styles.msgList}>
            {messages.map((m) => {
              const isCust = m.sender === 'customer';
              return (
                <View key={m.id} style={[styles.bubble, isCust ? styles.bubbleCust : styles.bubbleDriver]}>
                  <Text style={[styles.msgText, isCust ? styles.textCust : styles.textDriver]}>{m.text}</Text>
                  <Text style={styles.msgTime}>{m.time}</Text>
                </View>
              );
            })}
          </ScrollView>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={inputTxt}
              onChangeText={setInputTxt}
              placeholder="Type a message to driver..."
            />
            <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
              <Text style={styles.sendText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView style={styles.disputeArea}>
          <Text style={styles.disputeHeader}>What issue occurred with this order?</Text>
          {DISPUTE_REASONS.map((r) => {
            const isSel = selectedDispute === r.id;
            return (
              <TouchableOpacity
                key={r.id}
                style={[styles.disputeCard, isSel && styles.disputeCardActive]}
                onPress={() => setSelectedDispute(r.id)}
              >
                <Text style={styles.disputeLabel}>{r.label}</Text>
                <Text style={styles.disputeRefund}>Eligible: Up to {r.refundPct}% Instant Refund</Text>
              </TouchableOpacity>
            );
          })}

          {selectedDispute && !refundStatus && (
            <TouchableOpacity
              style={styles.claimBtn}
              onPress={() => {
                const opt = DISPUTE_REASONS.find((d) => d.id === selectedDispute);
                if (opt) handleClaimRefund(opt.refundPct);
              }}
            >
              <Text style={styles.claimText}>Claim Instant Wallet Refund</Text>
            </TouchableOpacity>
          )}

          {refundStatus && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>✓ {refundStatus}</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  drawer: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, height: 420, borderWidth: 1, borderColor: '#E5E7EB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  titleCol: { flex: 1 },
  driverTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  maskedNotice: { fontSize: 10, color: '#059669', fontWeight: '700', marginTop: 2 },
  closeBtn: { padding: 6 },
  closeText: { fontSize: 16, color: '#6B7280', fontWeight: '800' },
  tabRow: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 10, padding: 3, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#FFFFFF' },
  tabText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  tabTextActive: { color: '#111827' },
  chatArea: { flex: 1 },
  msgList: { flex: 1, marginBottom: 10 },
  bubble: { maxWidth: '75%', padding: 10, borderRadius: 12, marginBottom: 8 },
  bubbleCust: { alignSelf: 'flex-end', backgroundColor: '#4F46E5', borderBottomRightRadius: 2 },
  bubbleDriver: { alignSelf: 'flex-start', backgroundColor: '#F3F4F6', borderBottomLeftRadius: 2 },
  msgText: { fontSize: 13, lineHeight: 18 },
  textCust: { color: '#FFFFFF' },
  textDriver: { color: '#111827' },
  msgTime: { fontSize: 9, color: 'rgba(255,255,255,0.7)', alignSelf: 'flex-end', marginTop: 2 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13 },
  sendBtn: { backgroundColor: '#4F46E5', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, marginLeft: 8 },
  sendText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  disputeArea: { flex: 1 },
  disputeHeader: { fontSize: 13, fontWeight: '800', color: '#374151', marginBottom: 10 },
  disputeCard: { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1.5, borderColor: '#E5E7EB' },
  disputeCardActive: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  disputeLabel: { fontSize: 13, fontWeight: '700', color: '#111827' },
  disputeRefund: { fontSize: 11, color: '#DC2626', fontWeight: '700', marginTop: 3 },
  claimBtn: { backgroundColor: '#DC2626', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  claimText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  successBanner: { backgroundColor: '#DEF7EC', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  successText: { color: '#03543F', fontWeight: '800', fontSize: 13 },
});
