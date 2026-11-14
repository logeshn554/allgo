// Job: Modal for masked VoIP calling and ephemeral in-app messaging between customer and driver.

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import {
  MaskedCallSession,
  getChatMessages,
  sendChatMessage,
  EphemeralChatMessage,
} from '../data/communicationMasking';

interface Props {
  visible: boolean;
  orderId: string;
  session: MaskedCallSession;
  onClose: () => void;
}

export const MaskedCallModal: React.FC<Props> = ({ visible, orderId, session, onClose }) => {
  const [messages, setMessages] = useState<EphemeralChatMessage[]>(() => getChatMessages(orderId));
  const [input, setInput] = useState('');
  const [callActive, setCallActive] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;
    const msg = sendChatMessage(orderId, 'customer', input.trim());
    setMessages([...messages, msg]);
    setInput('');
  };

  const handleToggleCall = () => {
    setCallActive(!callActive);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>🔒 Masked Driver Communication</Text>
              <Text style={styles.sub}>Real phone numbers are hidden for your safety</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* VoIP Relay Box */}
          <View style={styles.voipBox}>
            <View>
              <Text style={styles.voipLabel}>Masked Relay Number:</Text>
              <Text style={styles.voipNumber}>{session.customerVirtualNumber}</Text>
              <Text style={styles.relayPin}>Extension PIN: {session.relayPin}</Text>
            </View>
            <TouchableOpacity
              style={[styles.callBtn, callActive && styles.callBtnActive]}
              onPress={handleToggleCall}
            >
              <Text style={styles.callBtnText}>{callActive ? 'End Call' : '📞 Call Driver'}</Text>
            </TouchableOpacity>
          </View>

          {/* Chat Stream */}
          <Text style={styles.chatHeading}>Ephemeral In-App Chat</Text>
          <View style={styles.chatList}>
            {messages.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.msgRow,
                  m.sender === 'customer'
                    ? styles.msgCustomer
                    : m.sender === 'driver'
                    ? styles.msgDriver
                    : styles.msgSystem,
                ]}
              >
                <Text
                  style={[
                    styles.msgText,
                    m.sender === 'customer' && styles.msgTextCustomer,
                  ]}
                >
                  {m.text}
                </Text>
              </View>
            ))}
          </View>

          {/* Input Bar */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Type message (e.g., Gate code is 1234)..."
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
              <Text style={styles.sendText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  sub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  closeBtn: { padding: 4 },
  closeText: { fontSize: 18, fontWeight: '700', color: '#64748B' },
  voipBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  voipLabel: { fontSize: 11, color: '#166534', fontWeight: '600' },
  voipNumber: { fontSize: 15, fontWeight: '800', color: '#166534', marginTop: 2 },
  relayPin: { fontSize: 11, color: '#4ADE80', marginTop: 2 },
  callBtn: {
    backgroundColor: '#00C853',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  callBtnActive: { backgroundColor: '#EF4444' },
  callBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  chatHeading: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 8 },
  chatList: { maxHeight: 180, marginBottom: 12 },
  msgRow: { padding: 10, borderRadius: 10, marginBottom: 6, maxWidth: '85%' },
  msgCustomer: { alignSelf: 'flex-end', backgroundColor: '#6200EA' },
  msgDriver: { alignSelf: 'flex-start', backgroundColor: '#F1F5F9' },
  msgSystem: { alignSelf: 'center', backgroundColor: '#FEF3C7', paddingVertical: 6 },
  msgText: { fontSize: 13, color: '#1E293B' },
  msgTextCustomer: { color: '#FFFFFF' },
  inputBar: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  sendBtn: {
    backgroundColor: '#6200EA',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  sendText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});
