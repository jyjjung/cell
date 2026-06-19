/**
 * One-time backfill: userBibleChecklists → communityProgress
 * Usage: node scripts/backfill-community-progress.mjs
 */
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

function initAdmin() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (projectId && clientEmail && privateKey) {
    return admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Firebase admin credentials missing.');
  const trimmed = raw.trim();
  try {
    return admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(trimmed)),
    });
  } catch {
    return admin.initializeApp({
      credential: admin.credential.cert(
        JSON.parse(trimmed.replace(/\\"/g, '"').replace(/^"|"$/g, '')),
      ),
    });
  }
}

initAdmin();
const db = admin.firestore();

async function run() {
  console.log('Reading userBibleChecklists...');
  const checklistsSnap = await db.collection('userBibleChecklists').get();
  console.log(`Found ${checklistsSnap.size} checklist(s).`);

  let batch = db.batch();
  let batchCount = 0;
  let written = 0;
  let skipped = 0;

  for (const docSnap of checklistsSnap.docs) {
    const data = docSnap.data();
    const completedPassages = Array.isArray(data.completedPassages) ? data.completedPassages : [];
    if (completedPassages.length === 0) {
      skipped++;
      continue;
    }

    const ref = db.collection('communityProgress').doc(docSnap.id);
    batch.set(
      ref,
      {
        userId: docSnap.id,
        completedCount: completedPassages.length,
        completedPassages,
        updatedAt: data.updatedAt ?? admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    written++;
    batchCount++;

    if (batchCount >= 400) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) await batch.commit();

  console.log(`Done. Wrote ${written} communityProgress doc(s), skipped ${skipped} empty.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
