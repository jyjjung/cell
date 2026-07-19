import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { auth, bucket, db } from './data-cleanup/admin.mjs';

const apply = process.argv.includes('--apply');
const confirmedProject = process.argv.find((arg) => arg.startsWith('--confirm-project='))?.split('=')[1];
if (!apply || confirmedProject !== 'cell-abca4') {
  throw new Error('Backup creation requires --apply --confirm-project=cell-abca4.');
}
if (!bucket) throw new Error('Storage bucket is unavailable.');

function serialize(value) {
  return JSON.parse(JSON.stringify(value, (_key, item) => {
    if (item?.constructor?.name === 'Timestamp') {
      return { __type: 'timestamp', seconds: item.seconds, nanoseconds: item.nanoseconds };
    }
    if (item?.constructor?.name === 'DocumentReference') {
      return { __type: 'reference', path: item.path };
    }
    if (item?.constructor?.name === 'GeoPoint') {
      return { __type: 'geopoint', latitude: item.latitude, longitude: item.longitude };
    }
    if (Buffer.isBuffer(item)) {
      return { __type: 'bytes', base64: item.toString('base64') };
    }
    return item;
  }));
}

const documents = [];
const rootCollections = await db.listCollections();
const rootSnapshots = await Promise.all(rootCollections.map((collection) => collection.get()));
for (const snapshot of rootSnapshots) {
  for (const document of snapshot.docs) {
    documents.push({ path: document.ref.path, data: serialize(document.data()) });
  }
}
const nestedCollectionNames = ['messages', 'thread', 'entries', 'comments'];
const nestedSnapshots = await Promise.all(
  nestedCollectionNames.map((name) => db.collectionGroup(name).get()),
);
for (const snapshot of nestedSnapshots) {
  for (const document of snapshot.docs) {
    documents.push({ path: document.ref.path, data: serialize(document.data()) });
  }
}

const authUsers = [];
let pageToken;
do {
  const page = await auth.listUsers(1000, pageToken);
  authUsers.push(...page.users.map((user) => serialize(user.toJSON())));
  pageToken = page.pageToken;
} while (pageToken);

const createdAt = new Date().toISOString();
const payload = JSON.stringify({
  format: 'cell-master-logical-backup-v1',
  projectId: 'cell-abca4',
  createdAt,
  documents,
  authUsers,
});
const checksum = createHash('sha256').update(payload).digest('hex');
const backupId = `logical-${createdAt.replace(/[:.]/g, '-')}`;
const path = `managed-backups/${backupId}.json.gz`;
await bucket.file(path).save(gzipSync(payload), {
  resumable: false,
  metadata: {
    contentType: 'application/gzip',
    cacheControl: 'private, no-store',
    metadata: { checksum, documentCount: String(documents.length), authUserCount: String(authUsers.length) },
  },
  preconditionOpts: { ifGenerationMatch: 0 },
});
console.log(JSON.stringify({
  backupId,
  path,
  checksum,
  documentCount: documents.length,
  authUserCount: authUsers.length,
}, null, 2));
