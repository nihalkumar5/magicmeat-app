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

  const db = adminDb();
  const orderDoc = await db.collection('orders').doc(orderId).get();
  const order = orderDoc.data();
  if (!order) return json(404, { error: 'not_found' });

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

  // Get push tokens for each admin uid
  const messages: PushMessage[] = [];
  for (const uid of adminUids) {
    const tokenDoc = await db.collection('pushTokens').doc(uid).get();
    const token = tokenDoc.data()?.token;
    if (isExpoToken(token)) {
      messages.push({
        to: token,
        title: `🚨 NEW ORDER RECEIVED! ${orderLabel(orderId)}`,
        body: `${order.customerName || 'Customer'} placed order for ₹${order.total || 0} (${(order.items || []).length} items)`,
        data: { orderId, type: 'new_order' },
        channelId: 'orders',
        sound: 'default',
        priority: 'high',
      });
    }
  }

  if (messages.length === 0) {
    console.warn('[new-order] no admin push token saved', JSON.stringify({ admins: adminUids.length }));
    return json(200, { sent: 0, reason: 'no_tokens', alerts });
  }
  console.log('[new-order] sending', JSON.stringify({ orderId, admins: adminUids.length, phones: messages.length }));

  const r = await sendPushDetailed(messages);
  return json(200, { sent: r.accepted, delivered: r.delivered, errors: r.errors, total: messages.length, alerts });
}
