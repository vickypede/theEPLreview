'use client';
import { ReactNode, useEffect, useState } from 'react';
import { auth, ensureAdminClaim } from '@/lib/firebase';
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth';

export default function AdminGuard({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'loading'|'noauth'|'noadmin'|'ok'>('loading');

  useEffect(() => {
    if (!auth) return setState('noauth');
    
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return setState('noauth');
      // refresh token to pick up latest custom claims
      const token = await getIdTokenResult(user, true);
      const isAdmin = token.claims.isAdmin === true;
      if (!isAdmin) {
        const synced = await ensureAdminClaim();
        if (!synced) return setState('noadmin');
      }
      setState('ok');
    });
    return () => unsub();
  }, []);

  if (state === 'loading') return <div className="p-6">Loading…</div>;
  if (state === 'noauth') return <div className="p-6">Please sign in to continue.</div>;
  if (state === 'noadmin') return <div className="p-6">You don&apos;t have admin access.</div>;
  return <>{children}</>;
}
