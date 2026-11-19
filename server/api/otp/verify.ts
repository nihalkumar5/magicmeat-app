import { adminAuth, adminDb } from '../../lib/firebase.js';
import { json, preflight, readJson } from '../../lib/http.js';
import { CODE_LENGTH, MAX_ATTEMPTS, hashCode, normalizePhone, sameHash, uidFor } from '../../lib/otp.js';

export const OPTIONS = preflight;

// POST { phone, code } → { token } — a Firebase custom token for this phone
// number's account; the app signs in with signInWithCustomToken.
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);
  const phone = normalizePhone(body?.phone);
  const code = typeof body?.code === 'string' ? body.code.trim() : '';
  if (!phone || !new RegExp(`^\\d{${CODE_LENGTH}}$`).test(code)) {
    return json(400, { error: 'invalid_request', message: 'Enter the code we sent you.' });
  }

  const db = adminDb();
  const ref = db.collection('otpCodes').doc(phone);
  const now = Date.now();

  const verdict = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.data();
    if (!d || now > d.expiresAt) return { error: 'expired' } as const;
    if (d.attempts >= MAX_ATTEMPTS) return { error: 'too_many' } as const;
    if (!sameHash(d.hash, hashCode(phone, code))) {
      tx.update(ref, { attempts: d.attempts + 1 });
      return { error: 'wrong', left: MAX_ATTEMPTS - d.attempts - 1 } as const;
    }
    // One use only.
    tx.delete(ref);
    return { ok: true } as const;
  });

  if ('error' in verdict) {
    switch (verdict.error) {
      case 'expired':
        return json(400, { error: 'expired', message: 'This code has expired. Tap Resend for a new one.' });
      case 'too_many':
        return json(429, { error: 'too_many', message: 'Too many wrong tries. Tap Resend for a new code.' });
      default: {
        const left = verdict.left ?? 0;
        return json(400, {
          error: 'wrong',
          left,
          message: left > 0 ? 'That code is not right. Please check and try again.' : 'Too many wrong tries. Tap Resend for a new code.',
        });
      }
    }
  }

  const auth = adminAuth();
  const uid = uidFor(phone);
  const phoneNumber = `+91${phone}`;
  try {
    await auth.getUser(uid);
  } catch {
    try {
      await auth.createUser({ uid, phoneNumber });
    } catch {
      // Number already on another account (e.g. made in the console): still
      // create ours without it; the token claim carries the number.
      await auth.createUser({ uid }).catch(() => {});
    }
  }
  const token = await auth.createCustomToken(uid, { phone: phoneNumber });
  return json(200, { token, phone });
}
