// Job: Real-time WebSocket connection with exponential backoff, state hydration on resume, and driver bearing computation.

import { loadFromCache } from './localCache.ts';
import { apiGet } from './apiClient.ts';
import { type OrderStep, loadOrderById } from './orderStorage.ts';

export interface LiveOrderUpdate {
  orderId: string;
  status: OrderStep | string;
  lat?: number;
  lng?: number;
  driverLat?: number;
  driverLng?: number;
  bearing?: number;
  etaMinutes?: number;
}

const WS_BASE_URL =
  process.env.EXPO_PUBLIC_WS_URL || 'wss://allgo-api.onrender.com/delivery';

export function computeBearingDegrees(
  prevLat: number,
  prevLng: number,
  newLat: number,
  newLng: number
): number {
  if (prevLat === newLat && prevLng === newLng) return 0;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const lat1 = toRad(prevLat);
  const lat2 = toRad(newLat);
  const dLng = toRad(newLng - prevLng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const bearing = toDeg(Math.atan2(y, x));
  return Math.round((bearing + 360) % 360);
}

export function subscribeToOrderUpdates(
  orderId: string,
  onUpdate: (update: LiveOrderUpdate) => void
): () => void {
  let isClosed = false;
  let socket: WebSocket | null = null;
  let reconnectTimer: any = null;
  let reconnectAttempts = 0;
  let lastLat: number | undefined;
  let lastLng: number | undefined;

  async function hydrateLatestState() {
    try {
      const remote = await apiGet<any>(`/ordering/orders/${orderId}`);
      if (remote && remote.status) {
        onUpdate({
          orderId,
          status: remote.status,
          lat: remote.driverLocation?.latitude,
          lng: remote.driverLocation?.longitude,
          driverLat: remote.driverLocation?.latitude,
          driverLng: remote.driverLocation?.longitude,
          etaMinutes: remote.etaMinutes,
        });
      }
    } catch {
      // Fallback to local storage
      const local = loadOrderById(orderId);
      if (local) {
        onUpdate({ orderId, status: local.status });
      }
    }
  }

  function connect() {
    if (isClosed) return;
    const token = loadFromCache<string>('allgo_auth_token', '');
    const url = `${WS_BASE_URL}?orderId=${encodeURIComponent(orderId)}&token=${encodeURIComponent(token)}`;

    try {
      socket = new WebSocket(url);

      socket.onopen = () => {
        reconnectAttempts = 0;
        hydrateLatestState();
      };

      socket.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          const currentLat = raw.lat ?? raw.driverLat ?? raw.latitude;
          const currentLng = raw.lng ?? raw.driverLng ?? raw.longitude;

          let bearing: number | undefined = raw.bearing;
          if (currentLat !== undefined && currentLng !== undefined && lastLat !== undefined && lastLng !== undefined) {
            bearing = computeBearingDegrees(lastLat, lastLng, currentLat, currentLng);
          }

          if (currentLat !== undefined && currentLng !== undefined) {
            lastLat = currentLat;
            lastLng = currentLng;
          }

          onUpdate({
            orderId,
            status: raw.status || raw.orderStatus,
            lat: currentLat,
            lng: currentLng,
            driverLat: currentLat,
            driverLng: currentLng,
            bearing,
            etaMinutes: raw.etaMinutes,
          });
        } catch {
          // Ignore malformed payloads
        }
      };

      socket.onclose = () => {
        if (!isClosed) {
          scheduleReconnect();
        }
      };

      socket.onerror = () => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.close();
        }
      };
    } catch {
      scheduleReconnect();
    }
  }

  function scheduleReconnect() {
    if (isClosed) return;
    const backoff = Math.min(16000, 1000 * Math.pow(2, reconnectAttempts));
    const jitter = Math.random() * 400;
    reconnectAttempts++;

    reconnectTimer = setTimeout(() => {
      connect();
    }, backoff + jitter);
  }

  connect();

  return () => {
    isClosed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
  };
}

export const connectOrderStream = subscribeToOrderUpdates;
