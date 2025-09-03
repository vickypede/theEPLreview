"use client";
import React, { useEffect, useRef, useState } from "react";
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
    if (!open || !auth) return; // only try when modal is open to avoid surprise redirects
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
        } catch (e: unknown) {
          setErr(e instanceof Error ? e.message : "Failed to complete sign-in");
        } finally {
          setBusy(false);
        }
      })();
    }
  }, [open, onAuthed]);

  // React to auth state: if logged in, auto-close
  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        onAuthed?.();
        onClose();
      }
    });
    return () => unsub();
  }, [onClose, onAuthed]);

  const startGoogle = async () => {
    if (!auth) return;
    try {
      setBusy(true); setErr(null); setMsg(null);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will close the modal
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  const sendMagic = async () => {
    if (!auth) return;
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
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not send magic link");
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
