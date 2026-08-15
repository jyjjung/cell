#!/usr/bin/env node
/**
 * Copy NDCPC Firestore collections into cell-abca4 (namespaced).
 *
 * Usage:
 *   node scripts/migrate-ndcpc-firestore-to-em.cjs
 *   node scripts/migrate-ndcpc-firestore-to-em.cjs --apply --confirm-project=cell-abca4
 *
 * Reads scripts/ndcpc-uid-remap.json when present to rewrite userId / authorUid fields.
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { resolveServiceAccount } = require('./lib/resolve-service-account.cjs');

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');
const confirmedProject = process.argv.find((a) => a.startsWith('--confirm-project='))?.split('=')[1];
const EM_PROJECT = 'cell-abca4';
const NDCPc_PROJECT = 'studio-7483951484-e5df7';

const COLLECTION_MAP = {
  volunteers: 'ndcpcVolunteers',
  schedules: 'ndcpcSchedules',
  announcements: 'ndcpcAnnouncements',
  prayerTopics: 'ndcpcPrayerTopics',
  resources: 'ndcpcResources',
  setlists: 'ndcpcSetlists',
  photos: 'ndcpcPhotos',
  chatMessages: 'ndcpcChatMessages',
  worshipFormats: 'ndcpcWorshipFormats',
  rosterReminders: 'ndcpcRosterReminders',
};

const UID_FIELDS = ['userId', 'authorUid', 'uploadedBy'];

if (APPLY && confirmedProject !== EM_PROJECT) {
  throw new Error(`Apply requires --confirm-project=${EM_PROJECT}`);
}

function initApp(name, projectId, credsJson) {
  const parsed = typeof credsJson === 'string' ? JSON.parse(credsJson) : credsJson;
  return admin.initializeApp({ credential: admin.credential.cert(parsed), projectId }, name);
}

function remapData(data, remap) {
  const out = { ...data };
  for (const field of UID_FIELDS) {
    if (out[field] && remap[out[field]]) out[field] = remap[out[field]];
  }
  if (Array.isArray(out.volunteerIds)) {
    out.volunteerIds = out.volunteerIds.map((id) => remap[id] || id);
  }
  return out;
}

async function copyCollection(ndcpcDb, emDb, src, dest, remap) {
  const snap = await ndcpcDb.collection(src).get();
  let written = 0;
  for (const doc of snap.docs) {
    const data = remapData(doc.data(), remap);
    if (APPLY) {
      await emDb.collection(dest).doc(doc.id).set(data, { merge: true });
    }
    written++;
  }
  return written;
}

async function main() {
  const emCreds = resolveServiceAccount();
  const ndcpcCreds = resolveServiceAccount({ jsonEnvKeys: ['NDCPC_SERVICE_ACCOUNT_JSON'] });
  if (!emCreds || !ndcpcCreds) throw new Error('Missing service account env vars (EM + NDCPC_SERVICE_ACCOUNT_JSON)');

  initApp('em', EM_PROJECT, emCreds);
  initApp('ndcpc', NDCPc_PROJECT, ndcpcCreds);

  const ndcpcDb = admin.app('ndcpc').firestore();
  const emDb = admin.app('em').firestore();

  const remapPath = path.join(process.cwd(), 'scripts', 'ndcpc-uid-remap.json');
  const remap = fs.existsSync(remapPath) ? JSON.parse(fs.readFileSync(remapPath, 'utf8')) : {};

  const totals = {};
  for (const [src, dest] of Object.entries(COLLECTION_MAP)) {
    totals[src] = await copyCollection(ndcpcDb, emDb, src, dest, remap);
  }

  console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', totals }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
