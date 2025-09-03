'use client';

import { useEffect, useMemo, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import {
  GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, User
} from 'firebase/auth';
import {
  collection, doc, getDoc, getDocs, orderBy, query, setDoc, updateDoc
} from 'firebase/firestore';
import { Club, UserProfile } from '@/types';

export default function ProfilePage(){
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [saving, setSaving] = useState(false);

  // Auth
  useEffect(() => {
    if (!auth || !db) return;
    
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) return;
      const prefRef = doc(db!, 'user_profiles', u.uid);
      const snap = await getDoc(prefRef);
      if (!snap.exists()) {
        await setDoc(prefRef, {
          displayName: u.displayName || '',
          email: u.email || '',
          favoriteClub: null,
          followedClubs: [],
          includeGeneral: true,
          marketingOptIn: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      setProfile((await getDoc(prefRef)).data() as UserProfile);
    });
    return () => unsub();
  }, []);

  // Load clubs
  useEffect(() => {
    if (!db) return;
    
    (async () => {
      const qClubs = query(collection(db!, 'clubs'), orderBy('name'));
      const s = await getDocs(qClubs);
      setClubs(s.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Club, 'id'>) })));
    })();
  }, []);

  // Derived
  const top6Slugs = useMemo(() => clubs.filter(c => c.isTop6).map(c => c.id), [clubs]);
  const allSlugs  = useMemo(() => clubs.map(c => c.id), [clubs]);

  const signIn = async () => { 
    if (!auth) return;
    await signInWithPopup(auth, new GoogleAuthProvider()); 
  };
  
  const doSignOut = async () => { 
    if (!auth) return;
    await signOut(auth); 
  };

  const toggleFollow = (slug: string) => {
    if (!profile) return;
    const exists = profile.followedClubs?.includes(slug);
    const next = exists
      ? profile.followedClubs.filter((s: string) => s !== slug)
      : [...(profile.followedClubs || []), slug];
    setProfile({ ...profile, followedClubs: next });
  };

  const setFollowed = (list: string[]) => {
    if (!profile) return;
    setProfile({ ...profile, followedClubs: Array.from(new Set(list)).slice(0, 20) });
  };

  const save = async () => {
    if (!user || !profile || !db) return;
    setSaving(true);
    const prefRef = doc(db!, 'user_profiles', user.uid);
    await updateDoc(prefRef, {
      displayName: profile.displayName || '',
      favoriteClub: profile.favoriteClub || null,
      followedClubs: profile.followedClubs || [],
      includeGeneral: !!profile.includeGeneral,
      updatedAt: new Date(),
    });
    setSaving(false);
    alert('Saved');
  };

  const resetDefaults = () => {
    if (!profile) return;
    setProfile({
      ...profile,
      includeGeneral: true,
      followedClubs: top6Slugs,
      favoriteClub: top6Slugs[0] || null,
    });
  };

  if (!user) {
    return (
      <main className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p>Sign in to set your preferences.</p>
        <button onClick={signIn} className="px-4 py-2 rounded-2xl text-white" style={{background:'#6F9283'}}>Sign in with Google</button>
      </main>
    );
  }

  if (!profile) return <main className="p-6">Loading…</main>;

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <button onClick={doSignOut} className="text-sm underline">Sign out</button>
      </div>

      <section className="grid gap-3 max-w-xl">
        <label className="text-sm">Email</label>
        <input value={profile.email || ''} readOnly className="border rounded-2xl p-2 opacity-70 cursor-not-allowed" />

        <label className="text-sm">Name</label>
        <input
          value={profile.displayName || ''}
          onChange={e => setProfile({ ...profile, displayName: e.target.value })}
          className="border rounded-2xl p-2"
        />

        <label className="text-sm">Favourite club</label>
        <select
          value={profile.favoriteClub || ''}
          onChange={e => setProfile({ ...profile, favoriteClub: e.target.value || null })}
          className="border rounded-2xl p-2"
        >
          <option value="">Select club…</option>
          {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!profile.includeGeneral}
            onChange={e => setProfile({ ...profile, includeGeneral: e.target.checked })}
          />
          Include General League News
        </label>
      </section>

      <section className="space-y-3 max-w-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Followed clubs</h2>
          <div className="flex gap-2">
            <button className="px-3 py-1 border rounded-2xl"
              onClick={() => setFollowed(allSlugs)}>Select all</button>
            <button className="px-3 py-1 border rounded-2xl"
              onClick={() => setFollowed(top6Slugs)}>Top-6</button>
            <button className="px-3 py-1 border rounded-2xl"
              onClick={() => setFollowed([])}>Clear</button>
            <button className="px-3 py-1 border rounded-2xl"
              onClick={resetDefaults}>Reset defaults</button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {clubs.map(c => {
            const checked = (profile.followedClubs || []).includes(c.id);
            return (
              <label key={c.id} className={`border rounded-2xl p-2 flex items-center gap-2 cursor-pointer ${checked ? 'bg-[#8D9F87]/10' : ''}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleFollow(c.id)}
                />
                <span className="truncate">{c.name}</span>
                {c.isTop6 && <span className="text-[10px] ml-auto px-2 py-[2px] border rounded-full">Top-6</span>}
              </label>
            );
          })}
        </div>
      </section>

      <button
        disabled={saving}
        onClick={save}
        className="px-5 py-2 rounded-2xl text-white"
        style={{background:'#6F9283'}}
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </main>
  );
}
