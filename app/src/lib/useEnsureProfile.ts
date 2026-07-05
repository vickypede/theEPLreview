'use client';

import { onAuthStateChanged } from 'firebase/auth';
import {
  doc, getDoc, setDoc, serverTimestamp,
  collection, query, where, getDocs
} from 'firebase/firestore';
import { isCurrentPremierLeagueClub } from '@/lib/clubs';
import { auth, db } from '@/lib/firebase';
import type { Club } from '@/types';

export function useEnsureProfile() {
  if (!auth || !db) return;

  onAuthStateChanged(auth, async (u) => {
    if (!u) return;
    const pref = doc(db!, 'user_profiles', u.uid);
    const snap = await getDoc(pref);
    if (snap.exists()) return;

    // Get Top-6 club slugs for defaults (fallback to empty if none)
    const top6Snap = await getDocs(
      query(collection(db!, 'clubs'), where('isTop6', '==', true))
    );
    const top6 = top6Snap.docs
      .map(d => ({ id: d.id, ...(d.data() as Omit<Club, 'id'>) }))
      .filter(isCurrentPremierLeagueClub)
      .map(d => d.id);

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
