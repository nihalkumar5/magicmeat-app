import { adminDb } from '../../lib/firebase.js';
import { clientIp, json, preflight, readJson } from '../../lib/http.js';
import {
  CODE_TTL_MS,
  MAX_SENDS_PER_HOUR,
  MAX_SENDS_PER_IP_PER_HOUR,
  RESEND_AFTER_MS,
  hashCode,
  hashIp,
  newCode,
  normalizePhone,
  testCodeFor,
} from '../../lib/otp.js';

const HOUR = 60 * 60 * 1000;

export const OPTIONS = preflight;

// POST { phone } → texts a one-time code via Renflair.
// Codes are stored only as an HMAC in Firestore (otpCodes/{phone}), which the
// app can't read (firestore.rules denies it; the Admin SDK bypasses rules).
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);
  const phone = normalizePhone(body?.phone);
  if (!phone) return json(400, { error: 'invalid_phone', message: 'Enter a valid 10-digit mobile number.' });

  const testCode = testCodeFor(phone);
  const code = testCode ?? newCode();
  const now = Date.now();
  const db = adminDb();
  const phoneRef = db.collection('otpCodes').doc(phone);
  const ipRef = db.collection('otpIps').doc(hashIp(clientIp(request)));

  const verdict = await db.runTransaction(async (tx) => {
    const [phoneSnap, ipSnap] = await Promise.all([tx.get(phoneRef), tx.get(ipRef)]);
    const prev = phoneSnap.data();
    const ip = ipSnap.data();

    const sinceLast = now - (prev?.sentAt ?? 0);
    if (sinceLast < RESEND_AFTER_MS) {
      return { error: 'too_soon', retryIn: Math.ceil((RESEND_AFTER_MS - sinceLast) / 1000) } as const;
    }
    const sameHour = !!prev && now - prev.hourStart < HOUR;
    const hourCount = sameHour ? prev.hourCount : 0;
    if (hourCount >= MAX_SENDS_PER_HOUR) return { error: 'too_many' } as const;

    const ipSameHour = !!ip && now - ip.hourStart < HOUR;
    const ipCount = ipSameHour ? ip.count : 0;
    if (!testCode && ipCount >= MAX_SENDS_PER_IP_PER_HOUR) return { error: 'too_many' } as const;

    tx.set(phoneRef, {
      hash: hashCode(phone, code),
      expiresAt: now + CODE_TTL_MS,
      attempts: 0,
      sentAt: now,
      hourStart: sameHour ? prev.hourStart : now,
      hourCount: hourCount + 1,
    });
    tx.set(ipRef, { hourStart: ipSameHour ? ip.hourStart : now, count: ipCount + 1 });
    return { ok: true } as const;
  });

  if ('error' in verdict) {
    if (verdict.error === 'too_soon') {
      return json(429, { error: 'too_soon', retryIn: verdict.retryIn, message: `Please wait ${verdict.retryIn}s before asking for a new code.` });
    }
    return json(429, { error: 'too_many', message: 'Too many codes requested. Please try again in an hour.' });
  }

  if (!testCode) {
    const sent = await sendSms(phone, code);
    if (!sent) {
      // Let the customer retry straight away.
      await phoneRef.update({ sentAt: 0 }).catch(() => {});
      return json(502, { error: 'sms_failed', message: 'Could not send the SMS. Please try again.' });
    }
  }

  return json(200, { ok: true, resendIn: RESEND_AFTER_MS / 1000 });
}

async function sendSms(phone: string, code: string): Promise<boolean> {
  const key = process.env.RENFLAIR_API_KEY;
  if (!key) {
    console.error('[otp] RENFLAIR_API_KEY is not set');
    return false;
  }
  const url = `https://sms.renflair.in/V1.php?API=${encodeURIComponent(key)}&PHONE=${phone}&OTP=${code}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const text = await res.text();
    // Log Renflair's reply (it never contains the code) for the delivery report.
    console.log('[otp] renflair', res.status, text.slice(0, 300));
    if (!res.ok) return false;
    try {
      const data = JSON.parse(text) as Record<string, unknown>;
      const status = String(data.status ?? data.STATUS ?? data.return ?? '').toLowerCase();
      if (status && /(fail|error|invalid|false|insufficient)/.test(status)) return false;
    } catch {
      if (/(fail|error|invalid|insufficient)/i.test(text)) return false;
    }
    return true;
  } catch (e) {
    console.error('[otp] renflair request failed', e);
    return false;
  }
}
