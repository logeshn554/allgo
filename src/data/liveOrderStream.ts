// Job: Listen for live order status and driver GPS updates over WebSockets.

import { loadFromCache } from './localCache';
import { OrderStep } from './orderStorage';

export interface LiveOrderUpdate {
  orderId: string;
  status: OrderStep;
  driverLat?: number;
  driverLng?: number;
  etaMinutes?: number;
}

const WS_BASE_URL = process.env.EXPO_PUBLIC_WS_URL || 'wss://api.allgo.app/ws/tracking';

export function subscribeToOrderUpdates(
  orderId: string,
  onUpdate: (update: LiveOrderUpdate) => void
): () => void {
  const token = loadFromCache<string>('allgo_auth_token', '');
  const url = `${WS_BASE_URL}?orderId=${encodeURIComponent(orderId)}&token=${encodeURIComponent(token)}`;

  let socket: WebSocket | null = null;

  try {
    socket = new WebSocket(url);
    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as LiveOrderUpdate;
        onUpdate(parsed);
      } catch {
        // Ignore malformed socket packets
      }
    };
  } catch {
    // Fallback if offline
  }

  return () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
  };
}
