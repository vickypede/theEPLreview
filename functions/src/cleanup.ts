import { onRequest } from "firebase-functions/https";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

export const cleanupOldArticles = onRequest({ timeoutSeconds: 300 }, async (_req, res) => {
  try {
    const cutoffTime = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
    console.log(`Cleaning up articles older than: ${cutoffTime.toISOString()}`);

    // Query for old articles
    const oldArticlesSnap = await db
      .collection("articles")
      .where("createdAt", "<", cutoffTime)
      .get();

    if (oldArticlesSnap.empty) {
      console.log("No old articles to clean up");
      res.json({ ok: true, deleted: 0, message: "No cleanup needed" });
      return;
    }

    // Delete in batches (Firestore limit is 500 per batch)
    const batchSize = 500;
    let totalDeleted = 0;
    const articles = oldArticlesSnap.docs;

    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = db.batch();
      const batchDocs = articles.slice(i, i + batchSize);
      
      batchDocs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      totalDeleted += batchDocs.length;
      console.log(`Deleted batch of ${batchDocs.length} articles`);
    }

    console.log(`Cleanup completed. Total deleted: ${totalDeleted}`);
    res.json({ ok: true, deleted: totalDeleted, cutoffTime: cutoffTime.toISOString() });
  } catch (e: any) {
    console.error("Cleanup error:", e);
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});
