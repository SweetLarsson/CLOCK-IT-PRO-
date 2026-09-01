/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface OfflineAttendanceItem {
  id: string;
  type: "check-in" | "check-out";
  tenant_id: string;
  worker_id: string;
  localDate: string; // YYYY-MM-DD
  localTime: string; // HH:MM:SS
  timestamp: number;
  status: "pending" | "syncing" | "failed" | "completed";
  retryCount: number;
  error?: string;
}

const OFFLINE_QUEUE_KEY = "clockit_offline_attendance_queue";
const OFFLINE_SYNC_EVENT = "offline-attendance-queue-changed";
const OFFLINE_SYNCED_EVENT = "offline-attendance-synced";

/**
 * Retrieves the current offline queue from localStorage
 */
export function getOfflineQueue(): OfflineAttendanceItem[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw);
    return Array.isArray(items) ? items : [];
  } catch (err) {
    console.warn("Failed to load offline attendance queue:", err);
    return [];
  }
}

/**
 * Saves the offline queue into localStorage and dispatches a notification event
 */
export function saveOfflineQueue(queue: OfflineAttendanceItem[]): void {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent(OFFLINE_SYNC_EVENT, { detail: { count: queue.length, queue } }));
  } catch (err) {
    console.warn("Failed to save offline attendance queue:", err);
  }
}

/**
 * Adds a new check-in / check-out action to the offline queue
 */
export function addOfflineAttendanceAction(
  action: Omit<OfflineAttendanceItem, "id" | "timestamp" | "status" | "retryCount">
): OfflineAttendanceItem {
  const queue = getOfflineQueue();
  
  // Deduplicate if identical pending check-in/out for same worker and date already exists
  const existingIdx = queue.findIndex(
    (item) =>
      item.worker_id === action.worker_id &&
      item.tenant_id === action.tenant_id &&
      item.localDate === action.localDate &&
      item.type === action.type &&
      item.status !== "completed"
  );

  const newItem: OfflineAttendanceItem = {
    ...action,
    id: `offline-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    status: "pending",
    retryCount: 0
  };

  if (existingIdx !== -1) {
    queue[existingIdx] = newItem;
  } else {
    queue.push(newItem);
  }

  saveOfflineQueue(queue);
  return newItem;
}

/**
 * Removes an item from the offline queue
 */
export function removeOfflineAction(id: string): void {
  const queue = getOfflineQueue().filter((item) => item.id !== id);
  saveOfflineQueue(queue);
}

/**
 * Clears completed or all items from the offline queue
 */
export function clearOfflineQueue(): void {
  saveOfflineQueue([]);
}

/**
 * Returns the count of pending offline attendance items
 */
export function getPendingQueueCount(): number {
  return getOfflineQueue().filter((item) => item.status !== "completed").length;
}

let isSyncInProgress = false;

/**
 * Synchronizes all pending items in the offline queue with the server
 */
export async function syncOfflineQueue(
  tenantId?: string
): Promise<{ success: number; failed: number; total: number }> {
  if (isSyncInProgress) {
    return { success: 0, failed: 0, total: 0 };
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { success: 0, failed: 0, total: getPendingQueueCount() };
  }

  const queue = getOfflineQueue();
  const pendingItems = queue.filter((item) => item.status !== "completed");
  
  if (pendingItems.length === 0) {
    return { success: 0, failed: 0, total: 0 };
  }

  isSyncInProgress = true;
  let successCount = 0;
  let failedCount = 0;

  // Filter by tenantId if provided
  const targetItems = tenantId ? pendingItems.filter((i) => i.tenant_id === tenantId) : pendingItems;

  try {
    // Attempt batch sync first
    const targetTenantId = tenantId || (targetItems[0]?.tenant_id);
    if (targetTenantId) {
      const res = await fetch("/api/attendance/sync-offline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: targetTenantId,
          queue: targetItems
        })
      });

      if (res.ok) {
        const data = await res.json();
        const results = data.results || [];
        
        // Update statuses
        const updatedQueue = getOfflineQueue().filter((item) => {
          const resItem = results.find((r: any) => r.id === item.id);
          if (resItem && (resItem.status === "synced" || resItem.status === "already_exists" || resItem.status === "already_checked_out")) {
            successCount++;
            return false; // Remove completed item from queue
          }
          if (resItem && resItem.status === "error") {
            item.status = "failed";
            item.error = resItem.message;
            item.retryCount = (item.retryCount || 0) + 1;
            failedCount++;
          }
          return true;
        });

        saveOfflineQueue(updatedQueue);
        window.dispatchEvent(new CustomEvent(OFFLINE_SYNCED_EVENT, { detail: { successCount, failedCount } }));
        return { success: successCount, failed: failedCount, total: targetItems.length };
      }
    }

    // Fallback: Individual item sequential dispatch
    const remainingQueue: OfflineAttendanceItem[] = [];
    for (const item of targetItems) {
      try {
        const endpoint = item.type === "check-in" ? "/api/attendance/check-in" : "/api/attendance/check-out";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            worker_id: item.worker_id,
            tenant_id: item.tenant_id,
            localDate: item.localDate,
            localTime: item.localTime
          })
        });

        if (res.ok || res.status === 400) {
          // Success or already handled
          successCount++;
        } else {
          item.status = "failed";
          item.retryCount = (item.retryCount || 0) + 1;
          remainingQueue.push(item);
          failedCount++;
        }
      } catch (err: any) {
        item.status = "failed";
        item.retryCount = (item.retryCount || 0) + 1;
        item.error = err?.message || "Network offline";
        remainingQueue.push(item);
        failedCount++;
      }
    }

    // Retain failed items
    const currentQueue = getOfflineQueue();
    const cleanQueue = currentQueue.filter((q) => !targetItems.some((t) => t.id === q.id)).concat(remainingQueue);
    saveOfflineQueue(cleanQueue);
    window.dispatchEvent(new CustomEvent(OFFLINE_SYNCED_EVENT, { detail: { successCount, failedCount } }));
  } catch (err) {
    console.warn("Offline sync cycle exception:", err);
  } finally {
    isSyncInProgress = false;
  }

  return { success: successCount, failed: failedCount, total: targetItems.length };
}

/**
 * Registers automatic listeners for online restoration and periodic synchronization
 */
export function registerOfflineSyncListeners(tenantId?: string): () => void {
  const handleOnline = () => {
    console.log("🌐 Network connection restored. Auto-synchronizing offline attendance queue...");
    syncOfflineQueue(tenantId);
  };

  window.addEventListener("online", handleOnline);

  // Periodic interval check every 30 seconds if online and items are pending
  const interval = setInterval(() => {
    if (typeof navigator !== "undefined" && navigator.onLine && getPendingQueueCount() > 0) {
      syncOfflineQueue(tenantId);
    }
  }, 30000);

  // Initial check on registration
  if (typeof navigator !== "undefined" && navigator.onLine && getPendingQueueCount() > 0) {
    syncOfflineQueue(tenantId);
  }

  return () => {
    window.removeEventListener("online", handleOnline);
    clearInterval(interval);
  };
}
