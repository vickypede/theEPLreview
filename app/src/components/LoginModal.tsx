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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[hsl(0_0%_0%_/_0.6)] backdrop-blur-sm p-4" aria-modal role="dialog">
      <div ref={dialogRef} className="w-full max-w-md transform overflow-hidden rounded-3xl bg-card border border-border shadow-2xl transition-all text-foreground">
        {/* Header */}
        <div className="relative surface-2 px-8 py-12">
          <button 
            onClick={onClose} 
            className="absolute right-4 top-4 rounded-full p-2 text-foreground/80 hover:opacity-80 transition-colors"
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
            <p className="mt-2 text-muted">Sign in to access your account</p>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-8">
          {/* Messages */}
          {msg && (
            <div className="mb-6 rounded-xl surface-2 border border-border p-4">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-success mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-foreground font-medium">{msg}</p>
              </div>
            </div>
          )}
          
          {err && (
            <div className="mb-6 rounded-xl surface-2 border border-border p-4">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-warning mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-foreground font-medium">{err}</p>
              </div>
            </div>
          )}

          {step === "pick" && (
            <div className="space-y-4">
              {/* Google Sign In */}
              <button
                onClick={startGoogle}
                disabled={busy}
                className="group relative w-full rounded-xl border border-border surface px-6 py-4 font-semibold text-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="surface px-4 text-muted">or continue with email</span>
                </div>
              </div>

              {/* Email Option */}
              <button
                onClick={() => setStep("email")}
                disabled={busy}
                className="w-full rounded-xl border border-border surface px-6 py-4 font-semibold text-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <div className="flex items-center justify-center">
                  <svg className="h-5 w-5 mr-3 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Use email (magic link)
                </div>
              </button>
            </div>
          )}

          {step === "email" && (
            <div className="space-y-6">
              {/* Back Button */}
              <button
                onClick={() => setStep("pick")}
                className="group flex items-center text-primary hover:opacity-90 font-medium transition-colors"
              >
                <svg className="h-4 w-4 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to sign-in options
              </button>

              {/* Email Input */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Email address</label>
                <input
                  type="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-border px-4 py-4 text-lg outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-all duration-200 surface"
                  placeholder="Enter your email"
                />
              </div>

              {/* Send Button */}
              <button
                onClick={sendMagic}
                disabled={busy || !email}
                className="w-full rounded-xl bg-primary px-6 py-4 font-semibold text-primary-foreground shadow-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] transition-all duration-200"
              >
                {busy ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary-foreground" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </div>
                ) : (
                  "Send magic link"
                )}
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-muted">
              By continuing you agree to our{" "}
              <a href="#" className="text-primary hover:underline">Terms</a>
              {" "}and acknowledge our{" "}
              <a href="#" className="text-primary hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
