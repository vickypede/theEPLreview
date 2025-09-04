import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import sources from '../src/seed/sources.json';

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

async function seedSources() {
  console.log('Starting sources seeding...');

  for (const [id, data] of Object.entries(sources as Record<string, any>)) {
    await db.collection('sources').doc(id).set(
      {
        id,
        name: (data as any).name,
        type: (data as any).type,
        url: (data as any).url,
        clubSlugs: (data as any).clubSlugs ?? [],
        isActive: (data as any).isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      { merge: true },
    );
    console.log('✓ Upserted source:', id, '-', (data as any).name);
  }

  console.log('✅ Sources seeding completed!');
}

seedSources().catch((err) => {
  console.error(err);
  process.exit(1);
});


