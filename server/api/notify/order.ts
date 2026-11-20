import { adminDb } from '../../lib/firebase.js';
import { json, preflight, readJson } from '../../lib/http.js';
import { adminFrom } from '../../lib/admin.js';
import { isExpoToken, orderLabel, sendPush } from '../../lib/push.js';

export const OPTIONS = preflight;

// What the customer reads for each step. The text is chosen here from the
// order's real status, so the admin app only says "this order changed".
function messageFor(status: string, label: string, rider?: string): { title: string; body: string } | null {
  switch (status) {
    case 'butcher_prepping':
      return { title: 'Order confirmed', body: `We're cutting your order ${label} fresh right now.` };
    case 'cold_packed':
      return { title: 'Packed and ready', body: `Order ${label} is packed and waiting for the rider.` };
    case 'rider_assigned':
    case 'out_for_delivery':
      return {
        title: 'On the way',
        body: rider ? `${rider} is bringing order ${label} to you.` : `Order ${label} is out for delivery.`,
      };
    case 'delivered':
      return { title: 'Delivered', body: `Order ${label} has been delivered. Enjoy your meal!` };
    case 'cancelled':
      return { title: 'Order cancelled', body: `Order ${label} was cancelled. Call us if this is unexpected.` };
    default:
      return null;
  }
}

// POST { orderId } with the admin's ID token → tells the customer the
// order's current status.
export async function POST(request: Request): Promise<Response> {
  if (!(await adminFrom(request))) return json(403, { error: 'forbidden' });
  const body = await readJson(request);
  const orderId = typeof body?.orderId === 'string' ? body.orderId.slice(0, 80) : '';
  if (!orderId) return json(400, { error: 'invalid_request' });

  const db = adminDb();
  const order = (await db.collection('orders').doc(orderId).get()).data();
  if (!order) return json(404, { error: 'not_found' });
  const uid = typeof order.customerUid === 'string' ? order.customerUid : '';
  const msg = messageFor(String(order.status), orderLabel(orderId), order.riderName);
  if (!uid || !msg) return json(200, { sent: 0 });

  const token = (await db.collection('pushTokens').doc(uid).get()).data()?.token;
  if (!isExpoToken(token)) return json(200, { sent: 0 });

  const sent = await sendPush(
    [{ to: token, ...msg, data: { orderId }, channelId: 'orders', sound: 'default', priority: 'high' }],
    new Map([[token, uid]]),
  );
  return json(200, { sent });
}
