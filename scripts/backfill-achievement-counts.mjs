/**
 * One-time backfill of feedbackCount on user profiles.
 * Usage: node scripts/backfill-achievement-counts.mjs
 */
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    try {
      return JSON.parse(trimmed.replace(/\\"/g, '"').replace(/^"|"$/g, ''));
    } catch {
      return null;
    }
  }
}

const serviceAccount = loadServiceAccount();
if (!serviceAccount) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    console.error('Firebase admin credentials missing.');
    process.exit(1);
  }
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
} else {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function buildFeedbackCounts() {
  const counts = new Map();
  const snap = await db.collection('suggestions').select('userId').get();
  for (const docSnap of snap.docs) {
    const userId = docSnap.data().userId;
    if (userId && userId !== 'anonymous') {
      counts.set(userId, (counts.get(userId) || 0) + 1);
    }
  }
  return counts;
}

async function run() {
  console.log('Scanning feedback...');
  const feedbackCounts = await buildFeedbackCounts();

  const usersSnap = await db.collection('users').get();
  let batch = db.batch();
  let batchCount = 0;
  let updated = 0;

  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id;
    batch.update(userDoc.ref, {
      feedbackCount: feedbackCounts.get(userId) || 0,
    });
    updated++;
    batchCount++;
    if (batchCount >= 400) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) await batch.commit();
  console.log(`Done. Backfilled ${updated} user(s).`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
