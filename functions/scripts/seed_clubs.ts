import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import clubs from '../src/seed/clubs.json';

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

async function seedClubs() {
  console.log('Starting club seeding...');
  
  for (const [slug, data] of Object.entries(clubs as any)) {
    await db.collection('clubs').doc(slug).set({ 
      id: slug, 
      ...data, 
      createdAt: new Date() 
    }, { merge: true });
    console.log('✓ Upserted:', slug, '-', data.name);
  }
  
  console.log('✅ Club seeding completed!');
}

seedClubs().catch(console.error);
