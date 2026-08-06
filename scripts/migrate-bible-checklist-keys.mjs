/**
 * One-time admin migration: bare checklist keys -> date-scoped keys.
 *
 * Usage:
 *   node scripts/migrate-bible-checklist-keys.mjs --dry-run
 *   node scripts/migrate-bible-checklist-keys.mjs
 *
 * Requires Firebase Admin credentials in .env.local (same as other scripts).
 */
import dotenv from 'dotenv';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const dryRun = process.argv.includes('--dry-run');
const BATCH_SIZE = 100;

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY.');
  process.exit(1);
}

const app = getApps()[0] ?? initializeApp({
  credential: cert({ projectId, clientEmail, privateKey }),
  projectId,
});

const db = getFirestore(app);

function makePassageKey(date, displayText) {
  return `${date}::${displayText}`;
}

function buildFirstOccurrenceMapFromPlan(dailyReadings) {
  const map = new Map();
  for (const day of dailyReadings ?? []) {
    for (const passage of day.passages ?? []) {
      if (!passage?.displayText || map.has(passage.displayText)) continue;
      map.set(passage.displayText, day.date);
    }
  }
  return map;
}

/** Keep in sync with src/lib/bible-checklist-migration.ts */
function migrateCompletedPassages(completedPassages, firstOccurrenceMap) {
  const existingKeys = new Set(completedPassages);
  let convertedCount = 0;
  let unmatchedCount = 0;

  const migratedPassages = completedPassages.map((key) => {
    if (key.includes('::')) return key;

    const date = firstOccurrenceMap.get(key);
    if (!date) {
      unmatchedCount += 1;
      return key;
    }

    const scopedKey = makePassageKey(date, key);
    if (existingKeys.has(scopedKey)) {
      unmatchedCount += 1;
      return key;
    }

    existingKeys.add(scopedKey);
    convertedCount += 1;
    return scopedKey;
  });

  if (migratedPassages.length < completedPassages.length) {
    throw new Error('Migration aborted because it would reduce reading progress.');
  }

  const changed = migratedPassages.some((key, index) => key !== completedPassages[index]);

  return { migratedPassages, convertedCount, unmatchedCount, changed };
}

async function loadPlanDailyReadings() {
  const planSnap = await db.collection('config').doc('biblePlan').get();
  if (!planSnap.exists) {
    throw new Error('config/biblePlan not found.');
  }
  const data = planSnap.data() ?? {};
  return Array.isArray(data.dailyReadings) ? data.dailyReadings : [];
}

async function migrateAllChecklists() {
  const dailyReadings = await loadPlanDailyReadings();
  const firstOccurrenceMap = buildFirstOccurrenceMapFromPlan(dailyReadings);

  let scanned = 0;
  let updated = 0;
  let convertedKeys = 0;
  let preservedKeys = 0;
  let lastDoc = null;

  while (true) {
    let query = db.collection('userBibleChecklists').orderBy('__name__').limit(BATCH_SIZE);
    if (lastDoc) query = query.startAfter(lastDoc);

    const snap = await query.get();
    if (snap.empty) break;

    for (const docSnap of snap.docs) {
      scanned += 1;
      const data = docSnap.data();
      const completedPassages = Array.isArray(data.completedPassages) ? data.completedPassages : [];
      const bareCount = completedPassages.filter((key) => typeof key === 'string' && !key.includes('::')).length;
      if (bareCount === 0) continue;

      const result = migrateCompletedPassages(completedPassages, firstOccurrenceMap);
      if (!result.changed) {
        preservedKeys += result.unmatchedCount;
        continue;
      }

      convertedKeys += result.convertedCount;
      preservedKeys += result.unmatchedCount;
      updated += 1;

      const payload = {
        completedPassages: result.migratedPassages,
        ...(data.legacyCompletedPassagesBackupV2
          ? {}
          : { legacyCompletedPassagesBackupV2: completedPassages }),
        legacyMigrationVersion: 2,
        legacyMigratedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      if (dryRun) {
        console.log(`[dry-run] would update ${docSnap.id}: ${result.convertedCount} converted, ${result.unmatchedCount} preserved`);
      } else {
        await docSnap.ref.set(payload, { merge: true });
        console.log(`updated ${docSnap.id}: ${result.convertedCount} converted, ${result.unmatchedCount} preserved`);
      }
    }

    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.size < BATCH_SIZE) break;
  }

  console.log(
    `${dryRun ? 'Dry run complete' : 'Migration complete'} — scanned ${scanned}, updated ${updated}, converted ${convertedKeys}, preserved ${preservedKeys}.`,
  );
}

migrateAllChecklists().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
