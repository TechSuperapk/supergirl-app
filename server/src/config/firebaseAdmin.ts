import fs from 'fs';
import admin from 'firebase-admin';
import { env } from './env';

let initialized = false;

function loadServiceAccount(): admin.ServiceAccount {
  if (env.firebaseServiceAccountJson) {
    const parsed = JSON.parse(env.firebaseServiceAccountJson);
    // .env files can't hold real newlines — private_key is usually pasted
    // with literal \n sequences that need to become actual newlines.
    if (typeof parsed.private_key === 'string') {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    return parsed;
  }
  if (env.firebaseServiceAccountPath) {
    const raw = fs.readFileSync(env.firebaseServiceAccountPath, 'utf8');
    return JSON.parse(raw);
  }
  throw new Error(
    'Firebase Admin not configured: set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH in server/.env',
  );
}

/** Lazily initializes firebase-admin exactly once. */
export function getFirebaseAdmin(): admin.app.App {
  if (!initialized) {
    admin.initializeApp({
      credential: admin.credential.cert(loadServiceAccount()),
    });
    initialized = true;
  }
  return admin.app();
}

/** Verifies a Firebase ID token (from either the JS SDK or @react-native-firebase/auth
 *  on the client) and returns its decoded claims (uid, phone_number, etc). */
export async function verifyFirebaseIdToken(idToken: string) {
  const app = getFirebaseAdmin();
  return admin.auth(app).verifyIdToken(idToken);
}
