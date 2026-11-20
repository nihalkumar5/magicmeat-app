import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../../lib/firebase.js';
import { json, preflight, readJson } from '../../lib/http.js';
import { adminFrom } from '../../lib/admin.js';
import { isExpoToken, sendPush, type PushMessage } from '../../lib/push.js';
import { withEmoji } from '../../lib/emoji.js';

export const OPTIONS = preflight;

const MIN_GAP_MS = 60 * 1000; // one broadcast a minute stops double taps

// POST { title, body } with the admin's ID token → sends to every customer
// who allowed notifications. Logged in broadcasts/ for the admin's history.
export async function POST(request: Request): Promise<Response> {
  const admin = await adminFrom(request);
  if (!admin) return json(403, { error: 'forbidden' });
  const input = await readJson(request);
  const raw = typeof input?.title === 'string' ? input.title.trim().slice(0, 65) : '';
  const title = raw ? withEmoji(raw) : '';
  const body = typeof input?.body === 'string' ? input.body.trim().slice(0, 240) : '';
  if (!title || !body) return json(400, { error: 'invalid_request', message: 'Add a title and a message.' });

  const db = adminDb();
  const last = await db.collection('broadcasts').orderBy('sentAt', 'desc').limit(1).get();
  const lastAt = last.docs[0]?.data().sentAt?.toMillis?.() ?? 0;
  if (Date.now() - lastAt < MIN_GAP_MS) {
    return json(429, { error: 'too_soon', message: 'You just sent one. Try again in a minute.' });
  }

  const tokens = await db.collection('pushTokens').get();
  const ownerOf = new Map<string, string>();
  const messages: PushMessage[] = [];
  tokens.forEach((d) => {
    const t = d.data().token;
    if (!isExpoToken(t) || ownerOf.has(t)) return;
    ownerOf.set(t, d.id);
    messages.push({ to: t, title, body, channelId: 'offers', sound: 'default', data: { kind: 'offer' } });
  });

  const sent = messages.length ? await sendPush(messages, ownerOf) : 0;
  await db.collection('broadcasts').add({ title, body, sent, audience: messages.length, by: admin, sentAt: FieldValue.serverTimestamp() });
  return json(200, { sent, audience: messages.length });
}
