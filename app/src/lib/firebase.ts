import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, httpsCallable, type Functions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string | undefined,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID as string | undefined,
};

const isBrowser = typeof window !== 'undefined';

// Only initialize Firebase in the browser to avoid SSR build errors
// Also guard against missing env vars to prevent client-side crashes
const hasConfig = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

const appInstance: FirebaseApp | undefined = isBrowser && hasConfig
  ? (getApps().length ? getApps()[0] : initializeApp(firebaseConfig as Required<typeof firebaseConfig>))
  : undefined;

export const app: FirebaseApp | undefined = appInstance;
export const auth: Auth | undefined = appInstance ? getAuth(appInstance) : (undefined as unknown as Auth);
export const db: Firestore | undefined = appInstance ? getFirestore(appInstance) : (undefined as unknown as Firestore);
export const fns: Functions | undefined = appInstance ? getFunctions(appInstance) : (undefined as unknown as Functions);

export async function ensureAdminClaim() {
  if (!fns) return false;
  const call = httpsCallable<{},{ isAdmin: boolean }>(fns, 'syncAdminClaim');
  try { 
    return (await call({})).data.isAdmin; 
  } catch { 
    return false; 
  }
}
