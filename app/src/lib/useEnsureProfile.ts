'use client';

import { onAuthStateChanged, getAuth } from 'firebase/auth';
import {
  getFirestore, doc, getDoc, setDoc, serverTimestamp,
  collection, query, where, getDocs
} from 'firebase/firestore';
import { app } from '@/lib/firebase';

const auth = getAuth(app);
const db = getFirestore(app);

export function useEnsureProfile() {
  onAuthStateChanged(auth, async (u) => {
    if (!u) return;
    const pref = doc(db, 'user_profiles', u.uid);
    const snap = await getDoc(pref);
    if (snap.exists()) return;

    // Get Top-6 club slugs for defaults (fallback to empty if none)
    const top6Snap = await getDocs(
      query(collection(db, 'clubs'), where('isTop6', '==', true))
    );
    const top6 = top6Snap.docs.map(d => d.id);

    await setDoc(pref, {
      displayName: u.displayName || '',
      email: u.email || '',
      favoriteClub: top6[0] || null,
      followedClubs: top6,
      includeGeneral: true,
      marketingOptIn: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}
