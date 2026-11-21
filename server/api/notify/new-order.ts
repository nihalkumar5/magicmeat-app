import { adminDb } from '../../lib/firebase.js';
import { json, preflight, readJson } from '../../lib/http.js';
import { isExpoToken, orderLabel, sendPushDetailed, type PushMessage } from '../../lib/push.js';
import { alertOwner } from '../../lib/orderAlerts.js';

export const OPTIONS = preflight;

// POST { orderId } → push to every store admin device, plus email and
// WhatsApp to the shop owner
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);
  const orderId = typeof body?.orderId === 'string' ? body.orderId.slice(0, 80) : '';
  if (!orderId) return json(400, { error: 'invalid_request' });
  console.log('[new-order] called', orderId);

  const db = adminDb();
  const orderDoc = await db.collection('orders').doc(orderId).get();
  const order = orderDoc.data();
  if (!order) {
    console.warn('[new-order] order not found', orderId);
    return json(404, { error: 'not_found' });
  }

  // Email + WhatsApp to the shop owner (once per order).
  const alerts = await alertOwner(orderId, order);

  // Find all admin uids from admins collection
  const adminsSnap = await db.collection('admins').get();
  const adminUids: string[] = [];
  adminsSnap.forEach((d) => adminUids.push(d.id));

  if (adminUids.length === 0) {
    console.warn('[new-order] no admins in admins/');
    return json(200, { sent: 0, reason: 'no_admins', alerts });
  }

  // Partner-app phones register in adminPushTokens (one doc per phone). An
  // admin with no partner phone there yet (partner app not updated) falls
  // back to pushTokens/{uid}, the slot the customer app also writes.
  const admins = new Set(adminUids);
  const tokens = new Set<string>();
  // Partner phones with the chime build report channel 'new-orders'; older
  // builds don't have that channel, and Android drops pushes sent to a
  // channel the phone lacks, so they stay on 'orders'.
  const chimeTokens = new Set<string>();
  const docOf = new Map<string, string>(); // token -> adminPushTokens doc id
  const withPartnerPhone = new Set<string>();
  (await db.collection('adminPushTokens').get()).forEach((d) => {
    const { uid, token, channel } = d.data();
    if (admins.has(uid) && isExpoToken(token)) {
      tokens.add(token);
      if (channel === 'new-orders') chimeTokens.add(token);
      docOf.set(token, d.id);
      withPartnerPhone.add(uid);
    }
  });
  for (const uid of adminUids) {
    if (withPartnerPhone.has(uid)) continue;
    const token = (await db.collection('pushTokens').doc(uid).get()).data()?.token;
    if (isExpoToken(token)) tokens.add(token);
  }

  const messages: PushMessage[] = [...tokens].map((to) => ({
    to,
    title: `🚨 NEW ORDER RECEIVED! ${orderLabel(orderId)}`,
    body: `${order.customerName || 'Customer'} placed order for ₹${order.total || 0} (${(order.items || []).length} items)`,
    data: { orderId, type: 'new_order' },
    channelId: chimeTokens.has(to) ? 'new-orders' : 'orders',
    sound: chimeTokens.has(to) ? 'order_chime.wav' : 'default',
    priority: 'high',
  }));

  if (messages.length === 0) {
    console.warn('[new-order] no admin push token saved', JSON.stringify({ admins: adminUids.length }));
    return json(200, { sent: 0, reason: 'no_tokens', alerts });
  }
  console.log('[new-order] sending', JSON.stringify({ orderId, admins: adminUids.length, phones: messages.length }));

  const r = await sendPushDetailed(messages);
  // Phones where the partner app was removed.
  await Promise.all(
    r.dead.map((t) => docOf.get(t)).filter(Boolean).map((id) => db.collection('adminPushTokens').doc(id!).delete().catch(() => {})),
  );
  return json(200, { sent: r.accepted, delivered: r.delivered, errors: r.errors, total: messages.length, alerts });
}
