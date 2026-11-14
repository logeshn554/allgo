// Job: Local offline storage queue for telemetry pings and order transitions during dead zones with auto-sync.

import { getLocalItem, setLocalItem } from './localCache.ts';

export interface QueuedOfflineAction {
  id: string;
  type: 'LOCATION_PING' | 'STATUS_TRANSITION';
  payload: Record<string, any>;
  queuedAt: string;
  retryCount: number;
}

const QUEUE_STORAGE_KEY = 'allgo_offline_actions_v1';

export function getOfflineQueue(): QueuedOfflineAction[] {
  const raw = getLocalItem(QUEUE_STORAGE_KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (_e) {
    return [];
  }
}

export function enqueueOfflineAction(
  type: 'LOCATION_PING' | 'STATUS_TRANSITION',
  payload: Record<string, any>
): QueuedOfflineAction {
  const action: QueuedOfflineAction = {
    id: `act_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type,
    payload,
    queuedAt: new Date().toISOString(),
    retryCount: 0,
  };

  const queue = getOfflineQueue();
  queue.push(action);
  setLocalItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  return action;
}

export function clearOfflineQueue(): void {
  setLocalItem(QUEUE_STORAGE_KEY, JSON.stringify([]));
}

export interface SyncResult {
  processedCount: number;
  failedCount: number;
  remainingQueueSize: number;
}

export async function flushOfflineQueue(
  networkHandler?: (action: QueuedOfflineAction) => Promise<boolean>
): Promise<SyncResult> {
  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { processedCount: 0, failedCount: 0, remainingQueueSize: 0 };
  }

  const failed: QueuedOfflineAction[] = [];
  let processed = 0;

  for (const action of queue) {
    try {
      const ok = networkHandler ? await networkHandler(action) : true;
      if (ok) {
        processed++;
      } else {
        action.retryCount++;
        failed.push(action);
      }
    } catch (_err) {
      action.retryCount++;
      failed.push(action);
    }
  }

  setLocalItem(QUEUE_STORAGE_KEY, JSON.stringify(failed));
  return {
    processedCount: processed,
    failedCount: failed.length,
    remainingQueueSize: failed.length,
  };
}
