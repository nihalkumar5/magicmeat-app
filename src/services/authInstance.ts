import type { FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

// Web: the default browser persistence (IndexedDB) keeps the guest session.
export function createAuth(app: FirebaseApp): Auth {
  return getAuth(app);
}
