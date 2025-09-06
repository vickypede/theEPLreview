import 'server-only';
import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

function normalizePrivateKey(raw?: string): string | undefined {
  if (!raw) return undefined;
  let key = raw.trim();
  // Strip accidental wrapping quotes
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith('\'') && key.endsWith('\''))) {
    key = key.slice(1, -1);
  }
  // Convert escaped \n to real newlines
  if (key.includes('\\n')) key = key.replace(/\\n/g, '\n');
  // If no PEM markers, try base64 decode
  if (!key.includes('BEGIN') && /^[A-Za-z0-9+/=\s]+$/.test(key)) {
    try {
      const decoded = Buffer.from(key, 'base64').toString('utf8');
      if (decoded.includes('BEGIN')) key = decoded;
    } catch {}
  }
  return key;
}

function getCred() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin env vars. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.');
  }
  if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
    throw new Error('FIREBASE_PRIVATE_KEY is not valid PEM. Paste with real newlines or escape with \\n.');
  }
  return cert({ projectId, clientEmail, privateKey });
}

let app: App | undefined;
function getAdminApp(): App {
  if (!app) {
    app = getApps()[0] ?? initializeApp({ credential: getCred() });
  }
  return app;
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}