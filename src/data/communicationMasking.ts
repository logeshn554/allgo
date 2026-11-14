// Job: Phone privacy masking for VoIP and ephemeral in-app chat sessions between customer and driver.

export interface MaskedCallSession {
  sessionId: string;
  orderId: string;
  customerVirtualNumber: string; // e.g. +91 80 4000 1234
  driverVirtualNumber: string;   // e.g. +91 80 4000 5678
  relayPin: string;
  provider: 'TWILIO_VOICE' | 'AGORA_RTC';
  channelName: string;
  ephemeralToken: string;
  expiresAt: string;
  status: 'ACTIVE' | 'TERMINATED';
}

export interface EphemeralChatMessage {
  id: string;
  sender: 'customer' | 'driver' | 'system';
  text: string;
  timestamp: string;
}

export function createMaskedCallSession(orderId: string, customerId: string, driverId: string): MaskedCallSession {
  const expiresAt = new Date(Date.now() + 90 * 60 * 1000).toISOString(); // 90 min validity
  const relayPin = String(Math.floor(1000 + Math.random() * 9000));
  const channelName = `call_relay_${orderId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  return {
    sessionId: `mask_${Date.now()}`,
    orderId,
    customerVirtualNumber: '+91 80 4719 3000',
    driverVirtualNumber: '+91 80 4719 3001',
    relayPin,
    provider: 'TWILIO_VOICE',
    channelName,
    ephemeralToken: `tok_rtc_${Math.random().toString(36).substring(2, 12)}`,
    expiresAt,
    status: 'ACTIVE',
  };
}

const chatSessionStore = new Map<string, EphemeralChatMessage[]>();

export function getChatMessages(orderId: string): EphemeralChatMessage[] {
  const existing = chatSessionStore.get(orderId);
  if (existing) return existing;

  const initial: EphemeralChatMessage[] = [
    {
      id: 'm1',
      sender: 'system',
      text: 'Phone numbers are masked to protect privacy. Chat will be purged upon delivery.',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'm2',
      sender: 'driver',
      text: 'Hello! I have picked up your order and am en route.',
      timestamp: new Date(Date.now() - 60000).toISOString(),
    },
  ];
  chatSessionStore.set(orderId, initial);
  return initial;
}

export function sendChatMessage(orderId: string, sender: 'customer' | 'driver', text: string): EphemeralChatMessage {
  const messages = getChatMessages(orderId);
  const newMsg: EphemeralChatMessage = {
    id: `m_${Date.now()}`,
    sender,
    text,
    timestamp: new Date().toISOString(),
  };
  messages.push(newMsg);
  chatSessionStore.set(orderId, messages);
  return newMsg;
}
