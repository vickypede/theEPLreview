import { getApps, initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function normalizePrivateKey(raw?: string): string | undefined {
  if (!raw) return undefined;
  // Handle escaped \n
  let key = raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw;
  // If it's base64 (no header/footer), try to decode
  if (!key.includes('BEGIN') && /^[A-Za-z0-9+/=\s]+$/.test(key)) {
    try {
      key = Buffer.from(key, 'base64').toString('utf8');
    } catch {}
  }
  return key;
}

const projectId = process.env.FIREBASE_PROJECT_ID!;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

if (!getApps().length) {
  initializeApp(
    privateKey && clientEmail
      ? { credential: cert({ projectId, clientEmail, privateKey }) }
      : { credential: applicationDefault() }
  );
}

export function getAdminDb() {
  return getFirestore();
}