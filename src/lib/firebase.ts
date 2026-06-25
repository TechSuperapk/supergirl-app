import { initializeApp, getApp, getApps } from 'firebase/app';
import { initializeAuth, Auth } from 'firebase/auth';
// @ts-ignore
import { getReactNativePersistence } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey:            "AIzaSyB7pq_8qbnGamh6zrj6yB3U6D7UJkYJ2DA",
  authDomain:        "super-bae.firebaseapp.com",
  projectId:         "super-bae",
  storageBucket:     "super-bae.firebasestorage.app",
  messagingSenderId: "902599286792",
  appId:             "1:902599286792:web:9cc70b9c3c0390bb5ff1bd",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  const { getAuth } = require('firebase/auth');
  auth = getAuth(app);
}

export { auth };
export const db      = initializeFirestore(app, { ignoreUndefinedProperties: true });
export const storage = getStorage(app);
export default app;
