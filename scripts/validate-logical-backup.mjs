import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { GeoPoint, Timestamp } from 'firebase-admin/firestore';
import { bucket, db } from './data-cleanup/admin.mjs';

const PROJECT_ID = 'cell-abca4';
const args = new Map(process.argv.slice(2).map((arg) => {
  const separator = arg.indexOf('=');
  return separator === -1 ? [arg, true] : [arg.slice(0, separator), arg.slice(separator + 1)];
}));
const restore = args.has('--restore');
const verifyTarget = restore || args.has('--verify-target');
const backupId = args.get('--backup-id');
const backupPath = args.get('--backup-path')
  || (backupId ? `managed-backups/${backupId}.json.gz` : null);

if (!backupPath || typeof backupPath !== 'string') {
  throw new Error('Use --backup-id=<logical-id> or --backup-path=managed-backups/<file>.json.gz.');
}
if (!/^managed-backups\/[^/]+\.json\.gz$/.test(backupPath)) {
  throw new Error('Backup path must be a direct managed-backups/*.json.gz object.');
}
if (!bucket) throw new Error('Storage bucket is unavailable.');

const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
if (verifyTarget && !emulator && args.get('--confirm-project') !== PROJECT_ID) {
  throw new Error('Production target validation requires --confirm-project=cell-abca4.');
}
if (restore && !emulator) {
  const confirmations = {
    allowProduction: args.get('--allow-production-restore') === 'yes',
    project: args.get('--confirm-project') === PROJECT_ID,
    phrase: args.get('--confirm-restore') === 'RESTORE_CELL_ABCA4',
  };
  if (!Object.values(confirmations).every(Boolean)) {
    throw new Error(
      'Production restore requires --allow-production-restore=yes '
      + '--confirm-project=cell-abca4 --confirm-restore=RESTORE_CELL_ABCA4 '
      + '--confirm-sha256=<verified checksum>.',
    );
  }
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function deserialize(value) {
  if (Array.isArray(value)) return value.map(deserialize);
  if (!value || typeof value !== 'object') return value;
  if (value.__type === 'timestamp') {
    return new Timestamp(Number(value.seconds), Number(value.nanoseconds));
  }
  if (value.__type === 'reference') return db.doc(value.path);
  if (value.__type === 'geopoint') return new GeoPoint(Number(value.latitude), Number(value.longitude));
  if (value.__type === 'bytes') return Buffer.from(value.base64, 'base64');
  // The v1 writer's JSON replacer runs after these Admin SDK types' toJSON
  // methods, so existing backups can contain their native JSON shapes.
  if (Number.isInteger(value._seconds) && Number.isInteger(value._nanoseconds)
    && Object.keys(value).every((key) => key === '_seconds' || key === '_nanoseconds')) {
    return new Timestamp(value._seconds, value._nanoseconds);
  }
  if (typeof value._latitude === 'number' && typeof value._longitude === 'number'
    && Object.keys(value).every((key) => key === '_latitude' || key === '_longitude')) {
    return new GeoPoint(value._latitude, value._longitude);
  }
  if (Array.isArray(value._path?.segments)
    && value._path.segments.every((segment) => typeof segment === 'string')
    && value._path.segments.length % 2 === 0) {
    return db.doc(value._path.segments.join('/'));
  }
  // Buffer.toJSON runs before JSON.stringify's replacer in older backup writers.
  if (value.type === 'Buffer' && Array.isArray(value.data)) return Buffer.from(value.data);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, deserialize(item)]));
}

function canonical(value) {
  if (value instanceof Timestamp) {
    return { __type: 'timestamp', seconds: value.seconds, nanoseconds: value.nanoseconds };
  }
  if (value instanceof GeoPoint) {
    return { __type: 'geopoint', latitude: value.latitude, longitude: value.longitude };
  }
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return { __type: 'bytes', base64: Buffer.from(value).toString('base64') };
  }
  if (value?.constructor?.name === 'DocumentReference') {
    return { __type: 'reference', path: value.path };
  }
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonical(value[key])]),
  );
}

function assertPayload(payload, metadata, checksum) {
  if (payload?.format !== 'cell-master-logical-backup-v1') {
    throw new Error(`Unsupported backup format: ${String(payload?.format)}`);
  }
  if (payload.projectId !== PROJECT_ID) {
    throw new Error(`Backup project is ${String(payload.projectId)}, expected ${PROJECT_ID}.`);
  }
  if (!Array.isArray(payload.documents) || !Array.isArray(payload.authUsers)) {
    throw new Error('Backup documents/authUsers must be arrays.');
  }
  const paths = new Set();
  for (const document of payload.documents) {
    if (typeof document?.path !== 'string' || document.path.split('/').length % 2 !== 0) {
      throw new Error(`Invalid Firestore document path: ${String(document?.path)}`);
    }
    if (paths.has(document.path)) throw new Error(`Duplicate Firestore path: ${document.path}`);
    paths.add(document.path);
    deserialize(document.data);
  }
  if (metadata.documentCount !== undefined
    && Number(metadata.documentCount) !== payload.documents.length) {
    throw new Error('Metadata documentCount does not match payload.');
  }
  if (metadata.authUserCount !== undefined
    && Number(metadata.authUserCount) !== payload.authUsers.length) {
    throw new Error('Metadata authUserCount does not match payload.');
  }
  if (!metadata.checksum) throw new Error('Backup is missing SHA-256 checksum metadata.');
  if (metadata.checksum !== checksum) throw new Error('SHA-256 metadata/payload mismatch.');
  const expected = args.get('--confirm-sha256') || args.get('--expected-sha256');
  if (expected && expected !== checksum) throw new Error('Supplied SHA-256 does not match payload.');
  if (restore && !emulator && args.get('--confirm-sha256') !== checksum) {
    throw new Error('Production restore requires --confirm-sha256=<verified checksum>.');
  }
}

async function compareTarget(documents) {
  const mismatches = [];
  for (let index = 0; index < documents.length; index += 250) {
    const slice = documents.slice(index, index + 250);
    const snapshots = await db.getAll(...slice.map((document) => db.doc(document.path)));
    snapshots.forEach((snapshot, offset) => {
      const source = slice[offset];
      if (!snapshot.exists) {
        mismatches.push({ path: source.path, reason: 'missing' });
        return;
      }
      const expected = canonical(deserialize(source.data));
      const actual = canonical(snapshot.data());
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        mismatches.push({ path: source.path, reason: 'data-mismatch' });
      }
    });
  }
  return mismatches;
}

const file = bucket.file(backupPath);
const [objectMetadata] = await file.getMetadata();
const [compressed] = await file.download();
let raw;
try {
  raw = gunzipSync(compressed);
} catch (error) {
  throw new Error(`Backup gzip could not be decompressed: ${error.message}`);
}
const checksum = sha256(raw);
let payload;
try {
  payload = JSON.parse(raw.toString('utf8'));
} catch (error) {
  throw new Error(`Backup payload is not valid JSON: ${error.message}`);
}
const customMetadata = objectMetadata.metadata || {};
assertPayload(payload, customMetadata, checksum);

let beforeRestoreDrift = null;
let afterRestoreDrift = null;
if (verifyTarget) beforeRestoreDrift = await compareTarget(payload.documents);

if (restore) {
  const writer = db.bulkWriter();
  for (const document of payload.documents) {
    writer.set(db.doc(document.path), deserialize(document.data));
  }
  await writer.close();
  afterRestoreDrift = await compareTarget(payload.documents);
  if (afterRestoreDrift.length > 0) {
    throw new Error(`Post-restore verification found ${afterRestoreDrift.length} drifted documents.`);
  }
}

console.log(JSON.stringify({
  mode: restore ? 'restore' : verifyTarget ? 'validate-target' : 'validate-backup',
  target: verifyTarget ? emulator ? 'firestore-emulator' : 'production' : 'storage-object-only',
  backupPath,
  generation: objectMetadata.generation,
  checksum,
  checksumVerified: true,
  format: payload.format,
  projectId: payload.projectId,
  documentCount: payload.documents.length,
  authUserCount: payload.authUsers.length,
  authRestore: 'not-performed',
  beforeRestoreDrift: beforeRestoreDrift?.length ?? null,
  afterRestoreDrift: afterRestoreDrift?.length ?? null,
  zeroDrift: afterRestoreDrift ? afterRestoreDrift.length === 0
    : beforeRestoreDrift ? beforeRestoreDrift.length === 0
      : null,
  driftSample: (afterRestoreDrift || beforeRestoreDrift || []).slice(0, 25),
}, null, 2));
