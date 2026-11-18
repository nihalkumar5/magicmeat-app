import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { connectAuthEmulator, type Auth } from 'firebase/auth';
import { Platform } from 'react-native';
import { createAuth } from './authInstance';

const firebaseConfig = {
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

export const firebaseEnabled = Boolean(
  firebaseConfig.projectId && firebaseConfig.appId && firebaseConfig.apiKey
);

const app = firebaseEnabled ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()) : null;

export const db: Firestore | null = app ? getFirestore(app) : null;
export const auth: Auth | null = app ? createAuth(app) : null;

// Local development against the Firebase emulators:
//   EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true
// Android emulators reach the host machine at 10.0.2.2.
if (app && process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS === 'true') {
  const host = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
  // Separate try blocks: a second module load throws on the first call, and
  // the other emulator must still be connected.
  try {
    if (db) connectFirestoreEmulator(db, host, 8080);
  } catch {}
  try {
    if (auth) connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  } catch {}
}

export default app;
