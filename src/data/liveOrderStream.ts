// Job: WebSocket stream listener for real-time order and driver telemetry.

type Listener = (payload: any) => void;
const listeners = new Map<string, Set<Listener>>();
let socket: WebSocket | null = null;

export function connectOrderStream(orderId: string, onUpdate: Listener): () => void {
  const channel = `order:${orderId}`;
  if (!listeners.has(channel)) {
    listeners.set(channel, new Set());
  }
  listeners.get(channel)!.add(onUpdate);

  if (!socket && typeof WebSocket !== 'undefined') {
    const wsUrl = process.env.EXPO_PUBLIC_WS_URL || 'wss://api.allgo.internal/ws';
    try {
      socket = new WebSocket(wsUrl);
      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const channelListeners = listeners.get(msg.channel);
          if (channelListeners) {
            channelListeners.forEach((fn) => fn(msg.data));
          }
        } catch (_e) {}
      };
    } catch (_e) {}
  }

  return () => {
    const set = listeners.get(channel);
    if (set) set.delete(onUpdate);
  };
}
