/**
 * Firebase — Firebase JS SDK (works in Expo Go).
 *
 * The app was originally wired to react-native-firebase (native modules), which
 * cannot load in Expo Go. This file initializes the pure-JS Firebase SDK instead,
 * so the app boots in Expo Go for UI preview and development.
 *
 * The data layer imports the modular API from 'firebase/firestore' and
 * 'firebase/auth' — with the babel module-resolver aliases removed, those now
 * resolve to the real JS SDK (no build-time rewrite).
 *
 * Config is derived from android/app/google-services.json. For a first-class web
 * setup, register a Web app in the Firebase console (super-bae) and swap in its
 * config; the Android values below work for Firestore, Storage and anonymous auth.
 *
 * Exports stay typed `any` to match the previous behaviour and avoid
 * firestore-instance type-boundary errors across the untouched data-layer files.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import * as FirebaseAuth from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey:            'AIzaSyApbkS1sUr8V5m7sz6j5n2de_RYoLsaDKs',
  authDomain:        'super-bae.firebaseapp.com',
  projectId:         'super-bae',
  storageBucket:     'super-bae.firebasestorage.app',
  messagingSenderId: '902599286792',
  appId:             '1:902599286792:android:7fa3155801b3a2a95ff1bd',
  databaseURL:       'https://super-bae-default-rtdb.asia-southeast1.firebasedatabase.app',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// getReactNativePersistence exists only in the React Native build of firebase/auth;
// it isn't in the SDK's TS types, so we access it via a cast and fall back safely.
const rnPersistence = (FirebaseAuth as any).getReactNativePersistence as
  | ((s: unknown) => unknown)
  | undefined;

let authInstance: any;
try {
  authInstance = rnPersistence
    ? initializeAuth(app, { persistence: rnPersistence(AsyncStorage) as any })
    : getAuth(app);
} catch {
  authInstance = getAuth(app);
}

// Match the prior behaviour of ignoring undefined fields on writes. This must run
// before any getFirestore() call, so it lives here in the single init module.
let firestore: any;
try {
  firestore = initializeFirestore(app, { ignoreUndefinedProperties: true });
} catch {
  firestore = getFirestore(app);
}

export const auth: any = authInstance;
export const db: any = firestore;
export const storage: any = getStorage(app);

export default app;
