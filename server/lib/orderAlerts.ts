import { adminDb } from './firebase.js';
import { orderLabel } from './push.js';

// New-order alerts for the shop owner, on free tiers:
//  · Email through Resend (3,000/month free). Without a verified domain
//    Resend only delivers to the account owner's own address, which is
//    exactly who this goes to. Env: RESEND_API_KEY, ORDER_ALERT_EMAIL,
//    optional ORDER_ALERT_FROM.
//  · WhatsApp through CallMeBot (free; messages only the number that
//    registered the key). Env: CALLMEBOT_PHONE (e.g. 919876543210),
//    CALLMEBOT_APIKEY.
// Each channel is skipped quietly until its keys are set.

type Order = Record<string, any>;

const rupees = (n: unknown) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function lines(order: Order): string[] {
  return (Array.isArray(order.items) ? order.items : []).map(
    (it: any) => `${it.quantity || 1} × ${it.name || 'Item'}${it.cutName ? ` (${it.cutName})` : ''} — ${rupees((it.unitPrice || 0) * (it.quantity || 1))}`,
  );
}

function mapLink(order: Order): string {
  return typeof order.lat === 'number' && typeof order.lng === 'number'
    ? `https://maps.google.com/?q=${order.lat},${order.lng}`
    : '';
}

async function sendEmail(orderId: string, order: Order): Promise<string> {
  // RESEND_APT_KEY: the name the key was first saved under in Vercel.
  const key = process.env.RESEND_API_KEY || process.env.RESEND_APT_KEY;
  const to = process.env.ORDER_ALERT_EMAIL;
  if (!key || !to) {
    console.warn('[alerts] email off: missing', !key ? 'RESEND key' : 'ORDER_ALERT_EMAIL');
    return 'email:off';
  }
  const label = orderLabel(orderId);
  const mode = order.deliveryMode === 'instant' ? 'Express (15–20 min)' : 'Normal (45–60 min)';
  const map = mapLink(order);
  const html = `
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:auto;color:#111">
  <div style="background:#BE1E2D;color:#fff;padding:18px 20px;border-radius:14px 14px 0 0">
    <div style="font-size:13px;opacity:.85">New order</div>
    <div style="font-size:24px;font-weight:800">${esc(label)} · ${esc(rupees(order.total))}</div>
  </div>
  <div style="border:1px solid #eee;border-top:0;padding:18px 20px;border-radius:0 0 14px 14px">
    <p style="margin:0 0 6px"><b>${esc(order.customerName || 'Customer')}</b> · ${esc(order.customerPhone || '')}</p>
    <p style="margin:0 0 6px;color:#444">${esc(order.address || '')}</p>
    ${map ? `<p style="margin:0 0 12px"><a href="${esc(map)}">Open location in Google Maps</a></p>` : ''}
    <p style="margin:0 0 12px;color:#444">${esc(mode)}${order.deliveryNote ? ` · Note: ${esc(order.deliveryNote)}` : ''}</p>
    <ul style="padding-left:18px;margin:0 0 12px">${lines(order).map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    <p style="margin:0">Delivery ${esc(order.deliveryFee ? rupees(order.deliveryFee) : 'Free')}${order.discount ? ` · Discount −${esc(rupees(order.discount))}` : ''} · <b>Total ${esc(rupees(order.total))}</b> · Cash/UPI on delivery</p>
  </div>
</div>`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.ORDER_ALERT_FROM || 'MagicMeat <onboarding@resend.dev>',
      to: to.split(',').map((s) => s.trim()).filter(Boolean),
      subject: `New order ${label} · ${rupees(order.total)} · ${order.customerName || 'Customer'}`,
      html,
    }),
  });
  if (!res.ok) console.warn('[alerts] email failed', res.status, (await res.text().catch(() => '')).slice(0, 200));
  return `email:${res.status}`;
}

async function sendWhatsApp(orderId: string, order: Order): Promise<string> {
  const phone = process.env.CALLMEBOT_PHONE;
  const apikey = process.env.CALLMEBOT_APIKEY;
  if (!phone || !apikey) return 'whatsapp:off';
  const map = mapLink(order);
  const text = [
    `🚨 *New order ${orderLabel(orderId)}* · ${rupees(order.total)}`,
    `${order.customerName || 'Customer'} · ${order.customerPhone || ''}`,
    order.address || '',
    map,
    order.deliveryMode === 'instant' ? '⚡ Express (15–20 min)' : 'Normal (45–60 min)',
    '',
    ...lines(order),
    '',
    `Total ${rupees(order.total)} · Cash/UPI on delivery`,
  ]
    .filter((l, i, a) => l !== '' || a[i - 1] !== '')
    .join('\n');
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&apikey=${encodeURIComponent(apikey)}&text=${encodeURIComponent(text.slice(0, 1500))}`;
  const res = await fetch(url);
  if (!res.ok) console.warn('[alerts] whatsapp failed', res.status);
  return `whatsapp:${res.status}`;
}

/**
 * Sends the owner's email + WhatsApp once per order. The endpoint that calls
 * this is open (the customer's app calls it), so each order alerts at most
 * once, and only while it's fresh.
 */
export async function alertOwner(orderId: string, order: Order): Promise<string[]> {
  const created = order.createdAt?.toMillis?.() ?? 0;
  if (created && Date.now() - created > 15 * 60 * 1000) {
    console.log('[alerts] skip: order older than 15 min', orderId);
    return ['skip:old'];
  }
  try {
    await adminDb().collection('orderAlerts').doc(orderId).create({ at: new Date() });
  } catch {
    console.log('[alerts] skip: already sent', orderId);
    return ['skip:already-sent'];
  }
  const results = await Promise.allSettled([sendEmail(orderId, order), sendWhatsApp(orderId, order)]);
  const out = results.map((r) => (r.status === 'fulfilled' ? r.value : `error:${String(r.reason).slice(0, 80)}`));
  console.log('[alerts]', orderId, out.join(' '));
  return out;
}
