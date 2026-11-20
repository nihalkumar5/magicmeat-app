import { adminDb } from './firebase.js';

// Expo push service: one HTTPS call per 100 messages, delivered through
// FCM (Android) and APNs (iOS) with the credentials stored in EAS.
const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';
const BATCH = 100;

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channelId?: 'orders' | 'offers';
  sound?: 'default';
  priority?: 'default' | 'high';
}

interface Ticket {
  status: 'ok' | 'error';
  details?: { error?: string };
}

export const isExpoToken = (t: unknown): t is string =>
  typeof t === 'string' && /^Expo(nent)?PushToken\[[^\]]+\]$/.test(t);

/** Sends the messages; returns how many Expo accepted. Dead tokens are removed. */
export async function sendPush(messages: PushMessage[], ownerOf?: Map<string, string>): Promise<number> {
  let accepted = 0;
  const dead: string[] = [];
  for (let i = 0; i < messages.length; i += BATCH) {
    const chunk = messages.slice(i, i + BATCH);
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
    const res = await fetch(EXPO_PUSH, { method: 'POST', headers, body: JSON.stringify(chunk) });
    if (!res.ok) {
      console.warn('[push] expo responded', res.status, await res.text().catch(() => ''));
      continue;
    }
    const { data } = (await res.json()) as { data?: Ticket[] };
    (data || []).forEach((t, j) => {
      if (t.status === 'ok') accepted++;
      else if (t.details?.error === 'DeviceNotRegistered') dead.push(chunk[j].to);
    });
  }
  // App uninstalled or notifications reset: forget those tokens.
  if (dead.length && ownerOf) {
    const db = adminDb();
    await Promise.all(
      dead.map((tok) => {
        const uid = ownerOf.get(tok);
        return uid ? db.collection('pushTokens').doc(uid).delete().catch(() => {}) : null;
      }),
    );
  }
  return accepted;
}

/** Same 4-digit order number the app shows ("#4821"). */
export function orderLabel(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1_000_003;
  return `#${1000 + (h % 9000)}`;
}
