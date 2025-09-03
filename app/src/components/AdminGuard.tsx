'use client';
import { ReactNode, useEffect, useState } from 'react';
import { auth, ensureAdminClaim, fns } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import LoginModal from './LoginModal';

export default function AdminGuard({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'loading'|'noauth'|'noadmin'|'ok'>('loading');
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    if (!auth) return setState('noauth');
    
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return setState('noauth');
      
      try {
        // First, try to sync admin claim
        const synced = await ensureAdminClaim();
        if (synced) {
          setState('ok');
          return;
        }
        
        // If sync failed, check existing token
        const token = await getIdTokenResult(user, true);
        const isAdmin = token.claims.isAdmin === true;
        if (isAdmin) {
          setState('ok');
        } else {
          setState('noadmin');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setState('noadmin');
      }
    });
    return () => unsub();
  }, []);

  const handleAuthSuccess = () => {
    // The LoginModal will auto-close and AdminGuard will re-check auth state
  };

  if (state === 'loading') return <div className="p-6">Loading…</div>;
  
  if (state === 'noauth') {
    return (
      <>
        <div className="p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Access Required</h2>
          <p className="text-gray-600 mb-6">Please sign in to access the admin area.</p>
          <button
            onClick={() => setShowLogin(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Sign In
          </button>
        </div>
        <LoginModal 
          open={showLogin} 
          onClose={() => setShowLogin(false)} 
          onAuthed={handleAuthSuccess}
        />
      </>
    );
  }
  
  if (state === 'noadmin') {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Access Denied</h2>
        <p className="text-gray-600 mb-4">You don&apos;t have admin access to this area.</p>
        <p className="text-sm text-gray-500">Contact your administrator to request access.</p>
      </div>
    );
  }
  
  return <>{children}</>;
}
