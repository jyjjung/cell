import fs from 'node:fs/promises';
import { FieldValue } from 'firebase-admin/firestore';
import { bucket, db } from './admin.mjs';

const apply = process.argv.includes('--apply');
const firestoreOnly = process.argv.includes('--firestore-only');
const manifestPath = process.argv.find((arg) => arg.startsWith('--manifest='))?.split('=')[1];
const backupId = process.argv.find((arg) => arg.startsWith('--backup-id='))?.split('=')[1];
const confirmedProject = process.argv.find((arg) => arg.startsWith('--confirm-project='))?.split('=')[1];
if (!manifestPath) throw new Error('Use --manifest=<inventory-manifest.json>.');
if (apply && (!backupId || confirmedProject !== 'cell-abca4')) {
  throw new Error('Apply requires --backup-id=<id> --confirm-project=cell-abca4.');
}

const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
if (manifest.projectId !== 'cell-abca4') throw new Error('Manifest project mismatch.');
const runId = process.argv.find((arg) => arg.startsWith('--run-id='))?.split('=')[1]
  || `quarantine-${Date.now()}`;
const legacyFields = [
  'displayName',
  'title',
  'groupIds',
  'roles',
  'sidebar',
  'feedbackCount',
  'unlockedSecrets',
  'glassEnabled',
  'clickMeCount',
  'clickMeLastClaimAt',
  'colorScheme',
  'backgroundMode',
  'birthday',
  'holidayHomework',
  'mode',
  'theme',
  'notificationPreferences',
  'achievementBonusMessages',
  'achievementBonusLastClaimAt',
  'wallpaperSetId',
  'fcmTokensRepairedAt',
  'fcmNeedsReenable',
];

async function main() {
  const [feedback, users] = await Promise.all([
    db.collection('feedback').get(),
    db.collection('users').get(),
  ]);
  const userCandidates = users.docs
    .map((doc) => ({
      id: doc.id,
      values: Object.fromEntries(legacyFields
        .filter((field) => doc.data()[field] !== undefined)
        .map((field) => [field, doc.data()[field]])),
    }))
    .filter((candidate) => Object.keys(candidate.values).length > 0);
  const storageCandidates = firestoreOnly ? [] : (manifest.storage?.orphanCandidates || []);

  const summary = {
    mode: apply ? 'apply' : 'dry-run',
    runId,
    feedbackDocuments: feedback.size,
    usersWithLegacyFields: userCandidates.length,
    storageObjects: storageCandidates.length,
    originalsDeleted: 0,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (!apply) return;

  const archiveRoot = db.collection('migrationArchive').doc(runId);
  const ops = [];
  for (const doc of feedback.docs) {
    const archiveRef = archiveRoot.collection('documents').doc(`feedback_${doc.id}`);
    ops.push((batch) => batch.set(archiveRef, {
      sourcePath: doc.ref.path,
      payload: doc.data(),
      reason: 'unused-feedback-collection',
      archivedAt: FieldValue.serverTimestamp(),
    }));
  }
  for (const candidate of userCandidates) {
    const archiveRef = archiveRoot.collection('documents').doc(`users_${candidate.id}_legacy`);
    ops.push((batch) => batch.set(archiveRef, {
      sourcePath: `users/${candidate.id}`,
      payload: candidate.values,
      reason: 'legacy-user-fields',
      archivedAt: FieldValue.serverTimestamp(),
    }));
  }
  for (let i = 0; i < ops.length; i += 400) {
    const batch = db.batch();
    ops.slice(i, i + 400).forEach((op) => op(batch));
    await batch.commit();
  }

  if (bucket) {
    for (const candidate of storageCandidates) {
      const source = bucket.file(candidate.path);
      const destination = bucket.file(`quarantine/${runId}/${candidate.path}`);
      await source.copy(destination, {
        preconditionOpts: { ifGenerationMatch: 0 },
      }).catch((error) => {
        if (error?.code !== 412) throw error;
      });
    }
  }
  await archiveRoot.set({
    type: 'cleanup-quarantine',
    status: 'holding',
    backupId,
    manifestPath,
    summary,
    deleteAfter: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    createdAt: FieldValue.serverTimestamp(),
  });
}

await main();
