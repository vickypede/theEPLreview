'use client';
import { ReactNode, useEffect, useState } from 'react';
import { auth, ensureAdminClaim } from '@/lib/firebase';
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import LoginModal from './LoginModal';

export default function AdminGuard({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'loading'|'noauth'|'noadmin'|'ok'>('loading');
  const [showLogin, setShowLogin] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debug, setDebug] = useState<{ synced?: boolean; isAdminClaim?: boolean; claims?: Record<string, unknown> } | null>(null);

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
        <div className="mb-4 text-sm text-gray-500">
          <div>Signed in as: {auth?.currentUser?.email ?? 'unknown'}</div>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={async () => {
              try {
                const synced = await ensureAdminClaim();
                await auth?.currentUser?.getIdToken(true);
                const token = auth?.currentUser ? await getIdTokenResult(auth.currentUser, true) : null;
                const isAdmin = token?.claims?.isAdmin === true;
                setDebug({ synced, isAdminClaim: isAdmin, claims: token?.claims as any });
                setState(isAdmin || synced ? 'ok' : 'noadmin');
              } catch {
                // ignore
              }
            }}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Retry admin sync
          </button>
          <button
            onClick={() => auth?.signOut()}
            className="px-4 py-2 rounded-lg border hover:bg-gray-50"
          >
            Sign out
          </button>
          <button
            onClick={async () => {
              try {
                const token = auth?.currentUser ? await getIdTokenResult(auth.currentUser, true) : null;
                const isAdmin = token?.claims?.isAdmin === true;
                setDebug({ ...debug, isAdminClaim: isAdmin, claims: token?.claims as any });
                setDebugOpen(true);
              } catch {
                // ignore
              }
            }}
            className="px-4 py-2 rounded-lg border hover:bg-gray-50"
          >
            Show debug
          </button>
        </div>
        {debugOpen && (
          <div className="mx-auto mt-4 max-w-2xl text-left">
            <div className="rounded-lg border bg-gray-50 p-3 text-left">
              <div className="text-sm text-gray-700 mb-2">Debug</div>
              <pre className="whitespace-pre-wrap break-words text-xs text-gray-700">{JSON.stringify(debug, null, 2)}</pre>
            </div>
          </div>
        )}
        <p className="mt-4 text-sm text-gray-500">If this persists, ensure an allowlist doc exists at admins/your-email with isActive: true.</p>
      </div>
    );
  }
  
  return <>{children}</>;
}
