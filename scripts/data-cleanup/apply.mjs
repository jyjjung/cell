import fs from 'node:fs/promises';
import { FieldValue } from 'firebase-admin/firestore';
import { bucket, db } from './admin.mjs';

const apply = process.argv.includes('--apply');
const runId = process.argv.find((arg) => arg.startsWith('--run-id='))?.split('=')[1];
const manifestPath = process.argv.find((arg) => arg.startsWith('--manifest='))?.split('=')[1];
const backupId = process.argv.find((arg) => arg.startsWith('--backup-id='))?.split('=')[1];
const confirmedProject = process.argv.find((arg) => arg.startsWith('--confirm-project='))?.split('=')[1];
if (!runId || !manifestPath) throw new Error('Use --run-id=<quarantine run> --manifest=<fresh inventory>.');
if (!apply || !backupId || confirmedProject !== 'cell-abca4') {
  throw new Error('Deletion requires --apply --backup-id=<id> --confirm-project=cell-abca4.');
}

const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const currentOrphans = new Map(
  (manifest.storage?.orphanCandidates || []).map((candidate) => [candidate.path, candidate]),
);
const runRef = db.collection('migrationArchive').doc(runId);
const runSnap = await runRef.get();
if (!runSnap.exists || runSnap.data().status !== 'holding') throw new Error('Quarantine run is not holding.');
const deleteAfter = runSnap.data().deleteAfter?.toDate?.();
if (!deleteAfter || deleteAfter.getTime() > Date.now()) throw new Error('Quarantine hold has not elapsed.');

const archived = await runRef.collection('documents').get();
const batch = db.batch();
for (const archiveDoc of archived.docs) {
  const data = archiveDoc.data();
  const sourceRef = db.doc(data.sourcePath);
  if (data.reason === 'unused-feedback-collection') {
    batch.delete(sourceRef);
  } else if (data.reason === 'legacy-user-fields') {
    const deletions = Object.fromEntries(Object.keys(data.payload || {}).map((field) => [field, FieldValue.delete()]));
    batch.update(sourceRef, deletions);
  }
}
batch.update(runRef, {
  status: 'firestore-cleaned',
  appliedBackupId: backupId,
  appliedAt: FieldValue.serverTimestamp(),
});
await batch.commit();

if (bucket) {
  const [quarantined] = await bucket.getFiles({ prefix: `quarantine/${runId}/` });
  for (const copy of quarantined) {
    const originalPath = copy.name.slice(`quarantine/${runId}/`.length);
    const candidate = currentOrphans.get(originalPath);
    if (!candidate) continue;
    await bucket.file(originalPath).delete({
      ignoreNotFound: true,
      preconditionOpts: candidate.generation
        ? { ifGenerationMatch: Number(candidate.generation) }
        : undefined,
    });
  }
}
await runRef.update({ status: 'completed', completedAt: FieldValue.serverTimestamp() });
console.log(JSON.stringify({ runId, deletedAfterHold: true }, null, 2));
