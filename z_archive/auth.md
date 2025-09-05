// App assumptions
// - Next.js (App Router or Pages) or any React SPA
// - Firebase JS SDK v9+ (modular). Run: npm i firebase
// - You already enabled Google + Email/Link (passwordless) in Firebase Console
// - You want public read access to the site, but require login only when a user tries an action (e.g., send mail)
//
// Files:
// 1) lib/firebase.ts             -> Firebase bootstrap
// 2) components/LoginModal.tsx   -> Minimal, accessible login modal (Google + Magic Link)
// 3) hooks/useAuthGate.tsx       -> Just‑in‑time auth gate for protected actions
// 4) example/SendMailCard.tsx    -> Example showing how to require auth only at submit
// 5) (optional) app/auth/finish/page.tsx (Next.js App Router) -> fallback handler for email link completion
//
// Notes on Magic Link (Email Link) setup:
// - In the Firebase Console > Authentication > Settings, add your site domain to Authorized domains.
// - actionCodeSettings.url must be an allowed domain and should route back to your app. Here we use the current URL by default.
// - We store the email locally until the link is clicked (localStorage key: "mf_auth_emailForSignIn").
// - If the link is opened on a different device, we re-prompt the email to complete sign-in.

// ================================
// lib/firebase.ts
// ================================

// lib/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth";

// 1) Replace with your Firebase web config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Ensure session stays after refresh (local)
setPersistence(auth, browserLocalPersistence);

// ================================
// components/LoginModal.tsx
// ================================

// components/LoginModal.tsx
"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { auth } from "@/lib/firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendSignInLinkToEmail,
  onAuthStateChanged,
} from "firebase/auth";

// Small utility for body scroll lock when modal is open
function useLockBody(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

export type LoginModalProps = {
  open: boolean;
  onClose: () => void;
  // Optional callback when a user becomes authenticated (e.g., resume a pending action)
  onAuthed?: () => void;
  // You can force a specific return URL (otherwise the current URL is used)
  returnUrl?: string;
};

export default function LoginModal({ open, onClose, onAuthed, returnUrl }: LoginModalProps) {
  useLockBody(open);

  const [step, setStep] = useState<"pick" | "email">("pick");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Complete magic link if the URL contains oobCode for email link
  useEffect(() => {
    if (!open) return; // only try when modal is open to avoid surprise redirects
    if (isSignInWithEmailLink(auth, window.location.href)) {
      (async () => {
        try {
          setBusy(true);
          let stored = window.localStorage.getItem("mf_auth_emailForSignIn") || "";
          if (!stored) {
            // Ask the user for the email that received the link
            const promptEmail = window.prompt("Enter your email to finish sign-in:") || "";
            stored = promptEmail.trim();
          }
          const cred = await signInWithEmailLink(auth, stored, window.location.href);
          window.localStorage.removeItem("mf_auth_emailForSignIn");
          setMsg(`Welcome ${cred.user.email ?? ""}!`);
          onAuthed?.();
          // (optional) Clean the URL
          const url = new URL(window.location.href);
          url.search = ""; url.hash = "";
          window.history.replaceState({}, document.title, url.toString());
        } catch (e: any) {
          setErr(e?.message ?? "Failed to complete sign-in");
        } finally {
          setBusy(false);
        }
      })();
    }
  }, [open, onAuthed]);

  // React to auth state: if logged in, auto-close
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        onAuthed?.();
        onClose();
      }
    });
    return () => unsub();
  }, [onClose, onAuthed]);

  const startGoogle = async () => {
    try {
      setBusy(true); setErr(null); setMsg(null);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will close the modal
    } catch (e: any) {
      setErr(e?.message ?? "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  const sendMagic = async () => {
    try {
      setBusy(true); setErr(null); setMsg(null);
      const url = returnUrl || window.location.href; // deep-link back here
      const actionCodeSettings = {
        url,
        handleCodeInApp: true,
      } as const;
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem("mf_auth_emailForSignIn", email);
      setMsg("Magic link sent! Check your inbox on this device or another.");
      setStep("pick");
    } catch (e: any) {
      setErr(e?.message ?? "Could not send magic link");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" aria-modal role="dialog">
      <div ref={dialogRef} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Sign in to continue</h2>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-sm text-gray-500 hover:bg-gray-100">Close</button>
        </div>

        {msg && <p className="mb-3 rounded-lg bg-green-50 p-3 text-green-800">{msg}</p>}
        {err && <p className="mb-3 rounded-lg bg-red-50 p-3 text-red-800">{err}</p>}

        {step === "pick" && (
          <div className="space-y-3">
            <button
              onClick={startGoogle}
              disabled={busy}
              className="w-full rounded-xl border px-4 py-2 font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Continue with Google
            </button>
            <div className="relative my-2 text-center text-sm text-gray-500">
              <span className="bg-white px-2">or</span>
              <div className="absolute left-0 top-1/2 w-full -translate-y-1/2 border-t" />
            </div>
            <button
              onClick={() => setStep("email")}
              disabled={busy}
              className="w-full rounded-xl border px-4 py-2 font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Use email (magic link)
            </button>
          </div>
        )}

        {step === "email" && (
          <div className="space-y-3">
            <label className="block text-sm text-gray-700">Email address</label>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setStep("pick")}
                className="rounded-xl border px-4 py-2 text-sm"
              >
                Back
              </button>
              <button
                onClick={sendMagic}
                disabled={busy || !email}
                className="ml-auto rounded-xl bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
              >
                Send magic link
              </button>
            </div>
          </div>
        )}

        <p className="mt-4 text-xs text-gray-500">
          By continuing you agree to our Terms and acknowledge our Privacy Policy.
        </p>
      </div>
    </div>
  );
}

// ================================
// hooks/useAuthGate.tsx
// ================================

// hooks/useAuthGate.tsx
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

// ================================
// example/SendMailCard.tsx
// ================================

// example/SendMailCard.tsx
"use client";
import React, { useState } from "react";
import { auth } from "@/lib/firebase";
import LoginModal from "@/components/LoginModal";
import { useAuthGate } from "@/hooks/useAuthGate";

export default function SendMailCard() {
  const { loginOpen, setLoginOpen, onAuthed, requireAuth } = useAuthGate();
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const actuallySend = async () => {
    setStatus("Sending…");
    // TODO: implement your send logic — e.g., call a Cloud Function / Edge API
    await new Promise((r) => setTimeout(r, 800));
    setStatus(`Sent to ${to}!`);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await requireAuth(actuallySend);
  };

  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border bg-white p-6 shadow">
      <h3 className="mb-4 text-lg font-semibold">Send a message</h3>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="email"
          placeholder="Recipient email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          required
          className="w-full rounded-xl border px-3 py-2"
        />
        <textarea
          placeholder="Say something nice…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="w-full rounded-xl border px-3 py-2"
        />
        <div className="flex items-center gap-3">
          <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-white">Send</button>
          {status && <span className="text-sm text-gray-600">{status}</span>}
        </div>
      </form>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} onAuthed={onAuthed} />
    </div>
  );
}

// ================================
// (Optional) Next.js App Router deep-link finisher
// app/auth/finish/page.tsx
// If your magic link returns to /auth/finish, we show the modal to auto-complete sign-in.

// app/auth/finish/page.tsx
"use client";
import React, { useEffect, useState } from "react";
import LoginModal from "@/components/LoginModal";

export default function FinishAuthPage() {
  const [open, setOpen] = useState(true);
  useEffect(() => { setOpen(true); }, []);
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <LoginModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
