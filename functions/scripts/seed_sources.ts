import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import sources from '../src/seed/sources.json';

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

async function seedSources() {
  console.log('Starting sources seeding...');

  for (const [id, data] of Object.entries(sources as Record<string, any>)) {
    const ref = db.collection('sources').doc(id);
    const existing = await ref.get();
    const seedData: Record<string, any> = {
      id,
      name: data.name,
      type: data.type,
      url: data.url,
      clubSlugs: Array.isArray(data.clubSlugs) ? data.clubSlugs : [],
      includePathRegex: data.includePathRegex || null,
      needsJs: !!data.needsJs,
      badPathRegex: data.badPathRegex || null,
      maxAgeHours: typeof data.maxAgeHours === 'number' ? data.maxAgeHours : null,
      isActive: data.isActive ?? true,
      updatedAt: new Date(),
    };

    if (!existing.exists) {
      seedData.createdAt = new Date();
    }

    await ref.set(seedData, { merge: true });
    console.log('Upserted source:', id, '-', data.name);
  }

  console.log('Sources seeding completed!');
}

seedSources().catch((err) => {
  console.error(err);
  process.exit(1);
});
