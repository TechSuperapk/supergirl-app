import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export async function saveUserToFirestore(uid: string, phone: string) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      id: uid, phone, name: '',
      countryCode: '+91',
      createdAt: new Date().toISOString(),
      isVerified: true,
    });
  }
}

export async function getUserProfileFromFirestore(uid: string) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function updateUserProfileInFirestore(uid: string, name: string, avatarUrl?: string) {
  const ref = doc(db, 'users', uid);
  const data: any = { name };
  if (avatarUrl !== undefined) {
    data.avatarUrl = avatarUrl;
  }
  await updateDoc(ref, data);
}