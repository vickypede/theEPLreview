import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import clubs from '../src/seed/clubs.json';

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

async function seedClubs() {
  console.log('Starting club seeding...');

  for (const [slug, data] of Object.entries(clubs as Record<string, any>)) {
    const ref = db.collection('clubs').doc(slug);
    const existing = await ref.get();
    const seedData: Record<string, any> = {
      id: slug,
      ...data,
      updatedAt: new Date(),
    };

    if (!existing.exists) {
      seedData.createdAt = new Date();
    }

    await ref.set(seedData, { merge: true });
    console.log('Upserted:', slug, '-', data.name);
  }

  console.log('Club seeding completed!');
}

seedClubs().catch((err) => {
  console.error(err);
  process.exit(1);
});
