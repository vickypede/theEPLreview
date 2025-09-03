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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative card-bg rounded-3xl shadow-2xl p-8 max-w-md w-full border border-primary">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">Welcome Back</h1>
          <p className="text-secondary">Sign in to access the admin area</p>
        </div>
        
        <button
          onClick={startGoogle}
          disabled={busy}
          className="w-full bg-gradient-to-r from-background-quaternary to-background-quinary hover:from-background-tertiary hover:to-background-quaternary disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-8 rounded-2xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
        >
          {busy ? (
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Signing in...
            </div>
          ) : (
            <>
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </>
          )}
        </button>
        
        <button
          onClick={onClose}
          className="w-full mt-4 px-6 py-3 border-2 border-primary hover:border-background-quaternary text-primary hover:text-background-quaternary rounded-2xl font-medium transition-all duration-200 hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
