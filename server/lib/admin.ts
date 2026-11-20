import { adminAuth, adminDb } from './firebase.js';

/**
 * The uid of the signed-in store admin making this request, or null.
 * The app sends its Firebase ID token as "Authorization: Bearer <token>";
 * the caller must also have a doc in admins/{uid} (same check as the
 * Firestore rules).
 */
export async function adminFrom(request: Request): Promise<string | null> {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  try {
    const { uid } = await adminAuth().verifyIdToken(token);
    const snap = await adminDb().collection('admins').doc(uid).get();
    return snap.exists ? uid : null;
  } catch {
    return null;
  }
}
