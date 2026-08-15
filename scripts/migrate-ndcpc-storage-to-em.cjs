#!/usr/bin/env node
/**
 * Copy NDCPC Storage photo blobs into cell-abca4 and rewrite downloadUrl / storagePath in ndcpcPhotos.
 *
 * Usage:
 *   node scripts/migrate-ndcpc-storage-to-em.cjs
 *   node scripts/migrate-ndcpc-storage-to-em.cjs --apply --confirm-project=cell-abca4
 *
 * Reads scripts/ndcpc-uid-remap.json so photos/{legacyUid}/… lands under the community UID.
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');
const { resolveServiceAccount } = require('./lib/resolve-service-account.cjs');

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');
const confirmedProject = process.argv.find((a) => a.startsWith('--confirm-project='))?.split('=')[1];
const EM_PROJECT = 'cell-abca4';
const NDCPc_PROJECT = 'studio-7483951484-e5df7';

if (APPLY && confirmedProject !== EM_PROJECT) {
  throw new Error(`Apply requires --confirm-project=${EM_PROJECT}`);
}

function initApp(name, projectId, credsJson) {
  const parsed = typeof credsJson === 'string' ? JSON.parse(credsJson) : credsJson;
  return admin.initializeApp(
    {
      credential: admin.credential.cert(parsed),
      projectId,
      storageBucket: `${projectId}.firebasestorage.app`,
    },
    name,
  );
}

function remapStoragePath(storagePath, remap) {
  const match = /^photos\/([^/]+)\/(.+)$/.exec(storagePath);
  if (!match) return storagePath;
  const [, uid, rest] = match;
  const nextUid = remap[uid] || uid;
  return `photos/${nextUid}/${rest}`;
}

async function copyObject(sourceBucket, destBucket, sourcePath, destPath) {
  const sourceFile = sourceBucket.file(sourcePath);
  const [exists] = await sourceFile.exists();
  if (!exists) {
    return { status: 'missing' };
  }

  if (!APPLY) {
    return { status: 'would-copy', destPath };
  }

  // Cross-project rewriteTo is denied; download then upload with dest credentials.
  const [contents] = await sourceFile.download();
  const [sourceMeta] = await sourceFile.getMetadata();
  const token = crypto.randomUUID();
  const destFile = destBucket.file(destPath);
  await destFile.save(contents, {
    contentType: sourceMeta.contentType || 'image/jpeg',
    metadata: {
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
    resumable: false,
  });

  const bucketName = destBucket.name;
  const encoded = encodeURIComponent(destPath);
  const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encoded}?alt=media&token=${token}`;

  return { status: 'copied', downloadUrl, destPath };
}

async function main() {
  const emCreds = resolveServiceAccount();
  let ndcpcCreds = resolveServiceAccount({ jsonEnvKeys: ['NDCPC_SERVICE_ACCOUNT_JSON'] });
  if (!ndcpcCreds && process.env.NDCPC_SERVICE_ACCOUNT_JSON) {
    const raw = process.env.NDCPC_SERVICE_ACCOUNT_JSON.trim();
    ndcpcCreds = raw.startsWith('{') ? JSON.parse(raw) : JSON.parse(fs.readFileSync(raw, 'utf8'));
  }
  if (!emCreds || !ndcpcCreds) {
    throw new Error('Missing EM credentials and NDCPC_SERVICE_ACCOUNT_JSON');
  }

  initApp('em', EM_PROJECT, emCreds);
  initApp('ndcpc', NDCPc_PROJECT, ndcpcCreds);

  const ndcpcBucket = admin.storage(admin.app('ndcpc')).bucket();
  const emBucket = admin.storage(admin.app('em')).bucket();
  const emDb = admin.firestore(admin.app('em'));

  const remapPath = path.join(process.cwd(), 'scripts', 'ndcpc-uid-remap.json');
  const remap = fs.existsSync(remapPath) ? JSON.parse(fs.readFileSync(remapPath, 'utf8')) : {};

  const photosSnap = await emDb.collection('ndcpcPhotos').get();
  let copied = 0;
  let missing = 0;
  let urlUpdates = 0;
  let pathRemaps = 0;

  for (const photoDoc of photosSnap.docs) {
    const data = photoDoc.data();
    const storagePath = data.storagePath;
    if (!storagePath || typeof storagePath !== 'string') continue;

    const destPath = remapStoragePath(storagePath, remap);
    if (destPath !== storagePath) pathRemaps += 1;

    const result = await copyObject(ndcpcBucket, emBucket, storagePath, destPath);
    if (result.status === 'missing') {
      missing += 1;
      continue;
    }
    copied += 1;

    if (APPLY) {
      const patch = {};
      if (result.downloadUrl && result.downloadUrl !== data.downloadUrl) {
        patch.downloadUrl = result.downloadUrl;
      }
      if (destPath !== data.storagePath) {
        patch.storagePath = destPath;
      }
      if (Object.keys(patch).length) {
        await photoDoc.ref.update(patch);
        urlUpdates += 1;
      }
    }
  }

  console.log(
    JSON.stringify(
      { mode: APPLY ? 'apply' : 'dry-run', copied, missing, urlUpdates, pathRemaps },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
