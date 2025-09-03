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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Your Profile</h1>
            <p className="text-gray-600">Sign in to customize your Premier League experience</p>
          </div>
          
          <button 
            onClick={signIn} 
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
          
          <p className="text-sm text-gray-500 mt-6">
            We&apos;ll create your profile automatically with smart defaults
          </p>
        </div>
      </div>
    );
  }

  if (!profile) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading your profile...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Your Profile</h1>
              <p className="text-gray-600">Customize your Premier League experience</p>
            </div>
            <button 
              onClick={doSignOut} 
              className="px-6 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 rounded-2xl font-medium transition-all duration-200 hover:bg-gray-50"
            >
              Sign out
            </button>
          </div>
          
          {/* User Info */}
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <input 
                  value={profile.email || ''} 
                  readOnly 
                  className="w-full border-2 border-gray-200 rounded-2xl p-4 bg-gray-50 text-gray-600 cursor-not-allowed" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Display Name</label>
                <input
                  value={profile.displayName || ''}
                  onChange={e => setProfile({ ...profile, displayName: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-2xl p-4 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 text-lg font-medium text-gray-900 bg-white placeholder:text-gray-400"
                  placeholder="Enter your display name"
                />
                {profile.displayName && (
                  <p className="text-sm text-green-600 mt-2 font-medium">
                    ✓ Your display name is set to: <span className="font-semibold">{profile.displayName}</span>
                  </p>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Followed Clubs */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">⚽ Followed Clubs</label>
                <div className="max-h-48 overflow-y-auto border-2 border-gray-200 rounded-2xl p-4 bg-gray-50">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {clubs.map((club) => (
                      <label key={club.id} className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-xl hover:border-blue-300 transition-all duration-200 cursor-pointer bg-white">
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
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex items-center gap-2 min-w-0">
                          {club.badgeUrl && (
                            <img 
                              src={club.badgeUrl} 
                              alt={`${club.name} badge`}
                              className="w-6 h-6 object-contain flex-shrink-0"
                              onError={(e) => {
                                // Fallback if badge fails to load
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          <span className="text-sm font-medium text-gray-700 truncate">{club.name}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setProfile({ ...profile, followedClubs: clubs.map(c => c.id) })}
                    className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition-all duration-200"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfile({ ...profile, followedClubs: clubs.filter(c => c.isTop6).map(c => c.id) })}
                    className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition-all duration-200"
                  >
                    Top 6
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfile({ ...profile, followedClubs: [] })}
                    className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-all duration-200"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-2xl hover:border-blue-300 transition-all duration-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!profile.includeGeneral}
                  onChange={e => setProfile({ ...profile, includeGeneral: e.target.checked })}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Follow breaking news and general league updates</span>
              </label>

              <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-2xl hover:border-blue-300 transition-all duration-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!profile.emailNotifications}
                  onChange={e => setProfile({ ...profile, emailNotifications: e.target.checked })}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Send me breaking news via email</span>
              </label>

              <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-2xl hover:border-gray-300 transition-all duration-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!profile.marketingOptIn}
                  onChange={e => setProfile({ ...profile, marketingOptIn: e.target.checked })}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Send me product and marketing news via email</span>
              </label>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-3xl shadow-lg p-8 mb-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Quick Actions</h2>
            <p className="text-gray-600">Quickly set up your club preferences</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4">
            <button 
              className="px-6 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl font-medium transition-all duration-200"
              onClick={() => setFollowed(allSlugs)}
            >
              Select All Clubs
            </button>
            <button 
              className="px-6 py-3 bg-green-100 hover:bg-green-200 text-green-700 rounded-xl font-medium transition-all duration-200"
              onClick={() => setFollowed(top6Slugs)}
            >
              Follow Top 6
            </button>
            <button 
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200"
              onClick={() => setFollowed([])}
            >
              Clear All
            </button>
            <button 
              className="px-6 py-3 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl font-medium transition-all duration-200"
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
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-12 rounded-2xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            {saving ? (
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
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
