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
  id?: string;
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

export interface PushResult {
  /** Messages Expo accepted. */
  accepted: number;
  /** Messages Firebase/Apple confirmed (receipts checked a few seconds later). */
  delivered: number;
  /** Error code -> count, e.g. { InvalidCredentials: 3 }. */
  errors: Record<string, number>;
}

export const isExpoToken = (t: unknown): t is string =>
  typeof t === 'string' && /^Expo(nent)?PushToken\[[^\]]+\]$/.test(t);

const EXPO_RECEIPTS = 'https://exp.host/--/api/v2/push/getReceipts';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (process.env.EXPO_ACCESS_TOKEN) h.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  return h;
}

// One request may only hold tokens of one Expo project. The customer and
// partner apps are two projects, so a mixed request comes back with
// PUSH_TOO_MANY_EXPERIENCE_IDS and the tokens grouped by project; we then
// send each group on its own.
async function post(chunk: PushMessage[]): Promise<{ msg: PushMessage; ticket: Ticket }[]> {
  const res = await fetch(EXPO_PUSH, { method: 'POST', headers: headers(), body: JSON.stringify(chunk) });
  const body = (await res.json().catch(() => ({}))) as {
    data?: Ticket[];
    errors?: { code?: string; message?: string; details?: Record<string, string[]> }[];
  };
  const err = body.errors?.[0];
  if (err?.code === 'PUSH_TOO_MANY_EXPERIENCE_IDS' && err.details) {
    const out: { msg: PushMessage; ticket: Ticket }[] = [];
    for (const tokens of Object.values(err.details)) {
      const group = chunk.filter((m) => tokens.includes(m.to));
      if (group.length) out.push(...(await post(group)));
    }
    return out;
  }
  if (!res.ok || !body.data) {
    const code = err?.code || `HTTP_${res.status}`;
    console.warn('[push] expo rejected request', code, err?.message);
    return chunk.map((msg) => ({ msg, ticket: { status: 'error', details: { error: code }, message: err?.message } }));
  }
  return chunk.map((msg, i) => ({ msg, ticket: body.data![i] }));
}

/** Sends the messages and checks delivery receipts. Dead tokens are removed. */
export async function sendPushDetailed(messages: PushMessage[], ownerOf?: Map<string, string>): Promise<PushResult> {
  const result: PushResult = { accepted: 0, delivered: 0, errors: {} };
  const bump = (code: string) => (result.errors[code] = (result.errors[code] || 0) + 1);
  const dead: string[] = [];
  const pending = new Map<string, string>(); // ticket id -> token

  for (let i = 0; i < messages.length; i += BATCH) {
    for (const { msg, ticket } of await post(messages.slice(i, i + BATCH))) {
      if (ticket?.status === 'ok') {
        result.accepted++;
        if (ticket.id) pending.set(ticket.id, msg.to);
      } else {
        const code = ticket?.details?.error || 'Unknown';
        bump(code);
        if (code === 'DeviceNotRegistered') dead.push(msg.to);
      }
    }
  }

  // Receipts say whether Firebase/Apple actually took the message; this is
  // where a missing FCM key on EAS shows up (InvalidCredentials).
  if (pending.size) {
    await sleep(3000);
    try {
      const res = await fetch(EXPO_RECEIPTS, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ ids: [...pending.keys()] }),
      });
      const { data } = (await res.json()) as { data?: Record<string, Ticket> };
      for (const [id, token] of pending) {
        const r = data?.[id];
        if (!r) continue; // not ready yet; counts as accepted only
        if (r.status === 'ok') result.delivered++;
        else {
          const code = r.details?.error || 'Unknown';
          bump(code);
          if (code === 'DeviceNotRegistered') dead.push(token);
          console.warn('[push] receipt error', code, r.message);
        }
      }
    } catch (e) {
      console.warn('[push] receipts failed', e);
    }
  }

  if (dead.length && ownerOf) {
    const db = adminDb();
    await Promise.all(
      dead.map((tok) => {
        const uid = ownerOf.get(tok);
        return uid ? db.collection('pushTokens').doc(uid).delete().catch(() => {}) : null;
      }),
    );
  }
  console.log('[push] result', JSON.stringify({ total: messages.length, ...result }));
  return result;
}

/** Sends the messages; returns how many Expo accepted. */
export async function sendPush(messages: PushMessage[], ownerOf?: Map<string, string>): Promise<number> {
  return (await sendPushDetailed(messages, ownerOf)).accepted;
}

/** Same 4-digit order number the app shows ("#4821"). */
export function orderLabel(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1_000_003;
  return `#${1000 + (h % 9000)}`;
}
