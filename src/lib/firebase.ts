/**
 * Firebase — react-native-firebase (native).
 *
 * Auto-initializes from android/app/google-services.json (Android) — there is
 * no JS config object. Native phone auth works without reCAPTCHA.
 *
 * Exports are typed `any` on purpose: the data-layer files still import the
 * modular doc/setDoc/onSnapshot/... names from 'firebase/firestore' and
 * 'firebase/auth', which Babel rewrites to '@react-native-firebase/*' at build
 * time (see babel.config.js). Keeping the instances as `any` avoids
 * firestore-instance type-boundary errors across those untouched files.
 */
import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import { getStorage } from '@react-native-firebase/storage';

const app = getApp();

export const auth: any = getAuth(app);
export const db: any = getFirestore(app);
export const storage: any = getStorage(app);

// Best-effort: match the prior behaviour of ignoring undefined fields on writes.
try { (db as any).settings && (db as any).settings({ ignoreUndefinedProperties: true }); } catch (e) { /* non-fatal */ }

export default app;
