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

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center surface">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-border mx-auto mb-4"></div>
          <p className="text-lg font-medium text-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }
  
  if (state === 'noauth') {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center surface">
          <div className="max-w-md w-full mx-4">
            <div className="bg-card rounded-2xl shadow-2xl p-8 border border-border">
              <div className="text-center mb-8">
                <div className="mx-auto w-16 h-16 surface-2 rounded-full flex items-center justify-center mb-4 border border-border">
                  <svg className="w-8 h-8 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Admin Access Required</h2>
                <p className="text-muted">Please sign in to access the admin area</p>
              </div>
              <button
                onClick={() => setShowLogin(true)}
                className="w-full bg-primary hover:opacity-90 text-primary-foreground font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                Sign In
              </button>
            </div>
          </div>
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
      <div className="min-h-screen flex items-center justify-center surface">
        <div className="max-w-2xl w-full mx-4">
          <div className="bg-card rounded-2xl shadow-2xl p-8 border border-border">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 surface-2 rounded-full flex items-center justify-center mb-4 border border-border">
                <svg className="w-8 h-8 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
              <p className="text-muted mb-4">You don&apos;t have admin access to this area</p>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium surface-2 text-foreground border border-border">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {auth?.currentUser?.email ?? 'unknown'}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
              <button
                onClick={async () => {
                  try {
                    const synced = await ensureAdminClaim();
                    await auth?.currentUser?.getIdToken(true);
                    const token = auth?.currentUser ? await getIdTokenResult(auth.currentUser, true) : null;
                    const isAdmin = token?.claims?.isAdmin === true;
                    setDebug({ synced, isAdminClaim: isAdmin, claims: token?.claims as Record<string, unknown> | undefined });
                    setState(isAdmin || synced ? 'ok' : 'noadmin');
                  } catch {
                    // ignore
                  }
                }}
                className="w-full sm:w-auto bg-primary hover:opacity-90 text-primary-foreground font-semibold py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md"
              >
                Retry Admin Sync
              </button>
              <button
                onClick={() => auth?.signOut()}
                className="w-full sm:w-auto surface-2 hover:opacity-90 text-foreground font-medium py-2 px-4 rounded-lg transition-all duration-200 border border-border"
              >
                Sign Out
              </button>
              <button
                onClick={async () => {
                  try {
                    const token = auth?.currentUser ? await getIdTokenResult(auth.currentUser, true) : null;
                    const isAdmin = token?.claims?.isAdmin === true;
                    setDebug({ ...debug, isAdminClaim: isAdmin, claims: token?.claims as Record<string, unknown> | undefined });
                    setDebugOpen(true);
                  } catch {
                    // ignore
                  }
                }}
                className="w-full sm:w-auto surface-2 hover:opacity-90 text-foreground font-medium py-2 px-4 rounded-lg transition-all duration-200 border border-border"
              >
                Show Debug
              </button>
            </div>
            
            {debugOpen && (
              <div className="mb-6">
                <div className="surface-2 rounded-lg border border-border p-4">
                  <div className="text-sm font-medium text-foreground mb-2">Debug Information</div>
                  <pre className="whitespace-pre-wrap break-words text-xs text-foreground surface p-3 rounded border border-border">{JSON.stringify(debug, null, 2)}</pre>
                </div>
              </div>
            )}
            
            <div className="text-center">
              <p className="text-sm text-muted">
                If this persists, ensure an allowlist doc exists at <code className="surface-2 px-2 py-1 rounded text-xs border border-border">admins/your-email</code> with <code className="surface-2 px-2 py-1 rounded text-xs border border-border">isActive: true</code>.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}
