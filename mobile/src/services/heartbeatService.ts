/**
 * heartbeatService.ts
 *
 * Sends POST /heartbeat every 60 seconds while the child app is active.
 *
 * NOTE: Works only while app is in foreground/background.
 *       OS-level persistence is NOT implemented.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

const DEVICE_ID_KEY = 'device_id';
const HEARTBEAT_STATUS_KEY = 'heartbeat_status';
const HEARTBEAT_INTERVAL_MS = 60_000;

let heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;

// ── UUID helper ────────────────────────────────────────────────────────────────

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ── Device ID ──────────────────────────────────────────────────────────────────

/**
 * Returns the persisted device ID, or generates and stores a new one.
 */
export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const newId = generateUUID();
  await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
  return newId;
}

// ── Heartbeat ──────────────────────────────────────────────────────────────────

async function sendHeartbeat(
  deviceId: string,
  policyVersion: string,
  token: string,
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ deviceId, policyVersion }),
    });

    const status = response.ok ? 'ACTIVE' : 'ERROR';
    const timestamp = new Date().toISOString();

    await AsyncStorage.setItem(
      HEARTBEAT_STATUS_KEY,
      JSON.stringify({ status, lastSent: timestamp }),
    );
  } catch {
    // Network failure — mark status as ERROR but do not crash the interval
    const timestamp = new Date().toISOString();
    await AsyncStorage.setItem(
      HEARTBEAT_STATUS_KEY,
      JSON.stringify({ status: 'ERROR', lastSent: timestamp }),
    );
  }
}

/**
 * Starts the 60-second heartbeat interval.
 * An immediate beat is sent on first call; subsequent beats follow every 60 s.
 * Calling this a second time before stopping the first will be a no-op.
 */
export function startHeartbeat(
  deviceId: string,
  policyVersion: string,
  token: string,
): void {
  if (heartbeatIntervalId !== null) return; // already running

  // Fire immediately, then on every interval
  sendHeartbeat(deviceId, policyVersion, token);

  heartbeatIntervalId = setInterval(() => {
    sendHeartbeat(deviceId, policyVersion, token);
  }, HEARTBEAT_INTERVAL_MS);
}

/**
 * Stops the running heartbeat interval, if any.
 */
export function stopHeartbeat(): void {
  if (heartbeatIntervalId !== null) {
    clearInterval(heartbeatIntervalId);
    heartbeatIntervalId = null;
  }
}

// ── Status read ────────────────────────────────────────────────────────────────

/**
 * Reads the last heartbeat status written by sendHeartbeat().
 */
export async function getHeartbeatStatus(): Promise<{
  lastSent: string | null;
  status: string | null;
}> {
  const raw = await AsyncStorage.getItem(HEARTBEAT_STATUS_KEY);
  if (!raw) return { lastSent: null, status: null };

  try {
    const parsed = JSON.parse(raw) as { lastSent?: string; status?: string };
    return {
      lastSent: parsed.lastSent ?? null,
      status: parsed.status ?? null,
    };
  } catch {
    return { lastSent: null, status: null };
  }
}
