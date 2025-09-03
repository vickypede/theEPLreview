"use client";
import { useCallback, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

// A simple hook that opens a login modal when the user is not authenticated.
// It exposes: requireAuth(action) which ensures the user is logged in before running action().
export function useAuthGate() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [pending, setPending] = useState<(() => Promise<any> | any) | null>(null);

  const requireAuth = useCallback(async (fn: () => Promise<any> | any) => {
    if (!auth) return;
    const user = auth.currentUser;
    if (user) return fn();

    return new Promise<void>((resolve, reject) => {
      setPending(() => async () => {
        try { await fn(); resolve(); } catch (e) { reject(e); }
      });
      setLoginOpen(true);
    });
  }, []);

  const onAuthed = useCallback(() => {
    if (pending) pending();
    setPending(null);
  }, [pending]);

  return { loginOpen, setLoginOpen, onAuthed, requireAuth } as const;
}
