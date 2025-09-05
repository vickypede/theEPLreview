'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import {
  GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, User
} from 'firebase/auth';
import {
  collection, doc, getDoc, getDocs, orderBy, query, setDoc, updateDoc
} from 'firebase/firestore';
import { Club, UserProfile } from '@/types';

export default function ProfilePage(){
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

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
          emailNotifications: true,  // Breaking news via email - on by default
          marketingOptIn: false,     // Product & marketing - off by default
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

  const setFollowed = (clubSlugs: string[]) => {
    if (!profile) return;
    setProfile({ ...profile, followedClubs: clubSlugs });
  };

  const save = async () => {
    if (!user || !profile || !db) return;
    setSaving(true);
    const prefRef = doc(db!, 'user_profiles', user.uid);
    await updateDoc(prefRef, {
      displayName: profile.displayName || '',
      followedClubs: profile.followedClubs || [],
      includeGeneral: !!profile.includeGeneral,
      emailNotifications: !!profile.emailNotifications,
      marketingOptIn: !!profile.marketingOptIn,
      updatedAt: new Date(),
    });
    setSaving(false);
    setJustSaved(true);
    // subtle inline confirmation; auto-hide
    setTimeout(() => setJustSaved(false), 1800);
  };

  const resetDefaults = () => {
    if (!profile) return;
    setProfile({
      ...profile,
      includeGeneral: true,
      followedClubs: top6Slugs,
      emailNotifications: true,
      marketingOptIn: false,
    });
  };

  // ---------- Unauthed overlay ----------
  if (!user) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[hsl(0_0%_0%_/_0.6)] backdrop-blur-sm p-4">
        <div className="w-full max-w-md card shadow-2xl">
          {/* Header */}
          <div className="surface-2 px-6 pt-6 pb-4 relative">
            <button
              onClick={() => router.push('/')}
              className="absolute right-3 top-3 rounded-full p-2 text-foreground/80 hover:opacity-80 transition-colors"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="text-center">
                                 <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full surface-3 border border-border">
                     <svg className="h-7 w-7" fill="none" stroke="#f25a87" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                     </svg>
                   </div>
              <h2 className="text-xl font-bold font-heading">Welcome back</h2>
              <p className="mt-1 text-muted-foreground text-sm">Sign in to access your account</p>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pt-4 pb-6">
            <button
              onClick={signIn}
              className="btn w-full btn-ghost surface hover:opacity-90"
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
            <p className="text-sm text-muted-foreground mt-4 text-center">
              We&apos;ll create your profile automatically with smart defaults
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Loading state ----------
  if (!profile) {
    return (
      <div className="min-h-screen surface flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-border mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your profile…</p>
        </div>
      </div>
    );
  }

  // ---------- Main ----------
  return (
    <div className="min-h-screen surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 section-y">
        {/* Title + subtle saved indicator */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-foreground font-heading">Your Profile</h1>
            <p className="text-muted-foreground text-sm">Customize your Premier League experience</p>
          </div>
          {justSaved && (
            <span
              className="badge border border-border bg-muted text-muted-foreground"
              aria-live="polite"
            >
              ✓ Saved
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Account summary (sticky on desktop) */}
          <aside className="lg:col-span-4">
            <div className="card p-5 sticky top-[88px]">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full surface-3 border border-border flex items-center justify-center overflow-hidden">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-6 h-6 text-foreground/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M6 20c0-3.314 2.686-6 6-6s6 2.686 6 6" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-foreground font-semibold truncate">{profile.displayName || user.displayName || 'Unnamed user'}</div>
                  <div className="text-xs text-muted-foreground truncate">{profile.email || user.email || ''}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="surface-2 rounded-[var(--radius-card)] border border-border p-3 text-center">
                  <div className="text-xs text-muted-foreground">Following</div>
                  <div className="text-base font-semibold">{profile.followedClubs?.length ?? 0}</div>
                </div>
                <div className="surface-2 rounded-[var(--radius-card)] border border-border p-3 text-center">
                  <div className="text-xs text-muted-foreground">General</div>
                  <div className="text-base font-semibold">{profile.includeGeneral ? 'On' : 'Off'}</div>
                </div>
                <div className="surface-2 rounded-[var(--radius-card)] border border-border p-3 text-center">
                  <div className="text-xs text-muted-foreground">Email</div>
                  <div className="text-base font-semibold">
                    {profile.emailNotifications ? 'On' : 'Off'}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={save}
                  disabled={saving}
                  className="btn btn-primary w-full disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  onClick={doSignOut}
                  className="btn w-full"
                >
                  Sign out
                </button>
              </div>
            </div>
          </aside>

          {/* Right: Settings */}
          <main className="lg:col-span-8 space-y-6">
            {/* Account details */}
            <section className="card p-5">
              <h2 className="text-sm font-semibold mb-4 text-foreground">Account details</h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
                  <input
                    value={profile.email || ''}
                    readOnly
                    className="input surface-2 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Display name</label>
                  <input
                    value={profile.displayName || ''}
                    onChange={e => setProfile({ ...profile, displayName: e.target.value })}
                    className="input"
                    placeholder="Enter your display name"
                  />
                </div>
              </div>
            </section>

            {/* Preferences */}
            <section className="card p-5">
              <h2 className="text-sm font-semibold mb-4 text-foreground">Preferences</h2>

              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 surface-2 border border-border rounded-[var(--radius-card)]">
                  <input
                    type="checkbox"
                    checked={!!profile.includeGeneral}
                    onChange={e => setProfile({ ...profile, includeGeneral: e.target.checked })}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-medium text-foreground">Breaking & general league updates</div>
                    <div className="text-xs text-muted-foreground">Include non-club-specific alerts and roundups.</div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 surface-2 border border-border rounded-[var(--radius-card)]">
                  <input
                    type="checkbox"
                    checked={!!profile.emailNotifications}
                    onChange={e => setProfile({ ...profile, emailNotifications: e.target.checked })}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-medium text-foreground">Email: breaking news</div>
                    <div className="text-xs text-muted-foreground">Get important updates in your inbox.</div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 surface-2 border border-border rounded-[var(--radius-card)]">
                  <input
                    type="checkbox"
                    checked={!!profile.marketingOptIn}
                    onChange={e => setProfile({ ...profile, marketingOptIn: e.target.checked })}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-medium text-foreground">Email: product & marketing</div>
                    <div className="text-xs text-muted-foreground">News about features, tips, and promotions.</div>
                  </div>
                </label>
              </div>
            </section>

            {/* Followed clubs */}
            <section className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground">Followed clubs</h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFollowed(allSlugs)}
                    className="btn btn-ghost"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => setFollowed(top6Slugs)}
                    className="btn btn-ghost"
                  >
                    Top 6
                  </button>
                  <button
                    type="button"
                    onClick={() => setFollowed([])}
                    className="btn btn-ghost"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Chip-like checkbox grid (keeps your logic) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2">
                {clubs.map((club) => {
                  const checked = profile.followedClubs.includes(club.id);
                  return (
                    <label
                      key={club.id}
                      className={`
                        group relative cursor-pointer
                        surface-2 border border-border rounded-[var(--radius-card)]
                        px-3 py-2 flex items-center gap-2
                        hover:opacity-90 transition
                        ${checked ? 'ring-1 ring-[hsl(var(--ring))]' : ''}
                      `}
                    >
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setProfile({ ...profile, followedClubs: [...profile.followedClubs, club.id] });
                          } else {
                            setProfile({ ...profile, followedClubs: profile.followedClubs.filter(id => id !== club.id) });
                          }
                        }}
                      />
                      {club.badgeUrl ? (
                        <img
                          src={club.badgeUrl}
                          alt={`${club.name} badge`}
                          className="w-6 h-6 object-contain shrink-0 rounded-full border border-border"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="w-6 h-6 surface-3 rounded-full border border-border shrink-0" />
                      )}
                      <span className="text-sm font-medium text-foreground truncate">{club.name}</span>
                      <span
                        className={`
                          ml-auto inline-flex h-4 w-4 items-center justify-center rounded-[4px]
                          border border-border text-[10px] leading-none
                          ${checked ? 'bg-primary text-primary-foreground' : 'surface'}
                        `}
                        aria-hidden
                      >
                        {checked ? '✓' : ''}
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>

            {/* Actions (secondary) */}
            <section className="card p-5">
              <div className="flex flex-wrap gap-2">
                <button className="btn" onClick={() => setFollowed(allSlugs)}>Select all clubs</button>
                <button className="btn" onClick={() => setFollowed(top6Slugs)}>Follow Top 6</button>
                <button className="btn" onClick={() => setFollowed([])}>Clear all</button>
                <button className="btn" onClick={resetDefaults}>Reset to defaults</button>
              </div>
            </section>

            {/* Mobile sticky save (nice UX) */}
            <div className="lg:hidden sticky bottom-3">
              <div className="flex gap-2">
                <button
                  onClick={save}
                  disabled={saving}
                  className="btn btn-primary w-full disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                <button onClick={doSignOut} className="btn w-full">Sign out</button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
