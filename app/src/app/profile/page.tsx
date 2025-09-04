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
          emailNotifications: true, // Breaking news via email - on by default
          marketingOptIn: false, // Product and marketing news - off by default
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
    alert('Saved');
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

  if (!user) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[hsl(0_0%_0%_/_0.6)] backdrop-blur-sm p-4">
        <div className="w-full max-w-md transform overflow-hidden rounded-3xl bg-card border border-border shadow-2xl transition-all text-foreground">
          {/* Header (mirrors LoginModal) */}
          <div className="relative surface-2 px-8 pt-8 pb-4">
            <button
              onClick={() => router.push('/')}
              className="absolute right-4 top-4 rounded-full p-2 text-foreground/80 hover:opacity-80 transition-colors"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full surface-3 border border-border backdrop-blur-sm">
                <svg className="h-8 w-8 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold">Welcome Back</h2>
              <p className="mt-1 text-muted-foreground">Sign in to access your account</p>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 pt-4 pb-6">
            <button
              onClick={signIn}
              className="group relative w-full rounded-xl border border-border surface px-6 py-4 font-semibold text-foreground hover:opacity-90 transition-all duration-200"
            >
              <div className="flex items-center justify-center">
                <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </div>
            </button>

            <p className="text-sm text-muted-foreground mt-6 text-center">
              We&apos;ll create your profile automatically with smart defaults
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return (
    <div className="min-h-screen surface flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-border mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading your profile...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen surface">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="bg-card rounded-3xl shadow-lg p-8 mb-8 border border-border">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Your Profile</h1>
              <p className="text-muted-foreground">Customize your Premier League experience</p>
            </div>
            <button 
              onClick={doSignOut} 
              className="px-6 py-3 border border-border text-foreground rounded-2xl font-medium transition-all duration-200 hover:opacity-90"
            >
              Sign out
            </button>
          </div>
          
          {/* User Info */}
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Email</label>
                <input 
                  value={profile.email || ''} 
                  readOnly 
                  className="w-full border border-border rounded-2xl p-4 surface-2 text-muted-foreground cursor-not-allowed" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Display Name</label>
                <input
                  value={profile.displayName || ''}
                  onChange={e => setProfile({ ...profile, displayName: e.target.value })}
                  className="w-full border border-border rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-all duration-200 text-lg font-medium text-foreground surface"
                  placeholder="Enter your display name"
                />
                {profile.displayName && (
                  <p className="text-sm text-success mt-2 font-medium">
                    ✓ Your display name is set to: <span className="font-semibold text-foreground">{profile.displayName}</span>
                  </p>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Followed Clubs */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">⚽ Followed Clubs</label>
                <div className="max-h-48 overflow-y-auto border border-border rounded-2xl p-4 surface-2">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {clubs.map((club) => (
                      <label key={club.id} className="flex items-center gap-3 p-3 border border-border rounded-xl transition-all duration-200 cursor-pointer surface">
                        <input
                          type="checkbox"
                          checked={profile.followedClubs.includes(club.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setProfile({ ...profile, followedClubs: [...profile.followedClubs, club.id] });
                            } else {
                              setProfile({ ...profile, followedClubs: profile.followedClubs.filter(id => id !== club.id) });
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <div className="flex items-center gap-2 min-w-0">
                          {club.badgeUrl && (
                            <img 
                              src={club.badgeUrl} 
                              alt={`${club.name} badge`}
                              className="w-6 h-6 object-contain flex-shrink-0"
                              onError={(e) => {
                                // Fallback if badge fails to load
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          )}
                          <span className="text-sm font-medium text-foreground truncate">{club.name}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setProfile({ ...profile, followedClubs: clubs.map(c => c.id) })}
                    className="px-3 py-1 surface-2 hover:opacity-90 text-foreground rounded-lg text-sm font-medium transition-all duration-200 border border-border"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfile({ ...profile, followedClubs: clubs.filter(c => c.isTop6).map(c => c.id) })}
                    className="px-3 py-1 surface-2 hover:opacity-90 text-foreground rounded-lg text-sm font-medium transition-all duration-200 border border-border"
                  >
                    Top 6
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfile({ ...profile, followedClubs: [] })}
                    className="px-3 py-1 surface-2 hover:opacity-90 text-foreground rounded-lg text-sm font-medium transition-all duration-200 border border-border"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-3 p-4 border border-border rounded-2xl transition-all duration-200 cursor-pointer surface">
                <input
                  type="checkbox"
                  checked={!!profile.includeGeneral}
                  onChange={e => setProfile({ ...profile, includeGeneral: e.target.checked })}
                />
                <span className="text-sm font-medium text-foreground">Follow breaking news and general league updates</span>
              </label>

              <label className="flex items-center gap-3 p-4 border border-border rounded-2xl transition-all duration-200 cursor-pointer surface">
                <input
                  type="checkbox"
                  checked={!!profile.emailNotifications}
                  onChange={e => setProfile({ ...profile, emailNotifications: e.target.checked })}
                />
                <span className="text-sm font-medium text-foreground">Send me breaking news via email</span>
              </label>

              <label className="flex items-center gap-3 p-4 border border-border rounded-2xl transition-all duration-200 cursor-pointer surface">
                <input
                  type="checkbox"
                  checked={!!profile.marketingOptIn}
                  onChange={e => setProfile({ ...profile, marketingOptIn: e.target.checked })}
                />
                <span className="text-sm font-medium text-foreground">Send me product and marketing news via email</span>
              </label>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card rounded-3xl shadow-lg p-8 mb-8 border border-border">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Quick Actions</h2>
            <p className="text-muted-foreground">Quickly set up your club preferences</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4">
            <button 
              className="px-6 py-3 surface-2 hover:opacity-90 text-foreground rounded-xl font-medium transition-all duration-200 border border-border"
              onClick={() => setFollowed(allSlugs)}
            >
              Select All Clubs
            </button>
            <button 
              className="px-6 py-3 surface-2 hover:opacity-90 text-foreground rounded-xl font-medium transition-all duration-200 border border-border"
              onClick={() => setFollowed(top6Slugs)}
            >
              Follow Top 6
            </button>
            <button 
              className="px-6 py-3 surface-2 hover:opacity-90 text-foreground rounded-xl font-medium transition-all duration-200 border border-border"
              onClick={() => setFollowed([])}
            >
              Clear All
            </button>
            <button 
              className="px-6 py-3 surface-2 hover:opacity-90 text-foreground rounded-xl font-medium transition-all duration-200 border border-border"
              onClick={resetDefaults}
            >
              Reset to Defaults
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="text-center">
          <button
            disabled={saving}
            onClick={save}
            className="bg-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-semibold py-4 px-12 rounded-2xl transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            {saving ? (
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></div>
                Saving Changes...
              </div>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
