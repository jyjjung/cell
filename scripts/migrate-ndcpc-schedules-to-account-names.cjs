#!/usr/bin/env node
/**
 * Rewrite NDCPC schedule role names from legacy volunteer roster names
 * to linked account display names (firstName + lastName).
 *
 * Usage:
 *   node scripts/migrate-ndcpc-schedules-to-account-names.cjs
 *   node scripts/migrate-ndcpc-schedules-to-account-names.cjs --apply --confirm-project=cell-abca4
 */
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const { resolveServiceAccount } = require('./lib/resolve-service-account.cjs');

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');
const confirmedProject = process.argv.find((a) => a.startsWith('--confirm-project='))?.split('=')[1];
const EM_PROJECT = 'cell-abca4';
const ROLE_KEYS = ['worship', 'offering', 'sermon', 'chant', 'activity'];

if (APPLY && confirmedProject !== EM_PROJECT) {
  throw new Error(`Apply requires --confirm-project=${EM_PROJECT}`);
}

function normalizeName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function accountDisplayName(user) {
  const full = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return full || (user.email || '').trim();
}

async function main() {
  const creds = resolveServiceAccount();
  if (!creds) {
    throw new Error('Missing Firebase service account credentials.');
  }

  const projectId = creds.project_id || process.env.FIREBASE_PROJECT_ID || EM_PROJECT;
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail: creds.client_email,
        privateKey: creds.private_key,
      }),
    });
  }

  const db = admin.firestore();
  const [volunteersSnap, usersSnap, schedulesSnap] = await Promise.all([
    db.collection('ndcpcVolunteers').get(),
    db.collection('users').get(),
    db.collection('ndcpcSchedules').get(),
  ]);

  const usersById = new Map();
  for (const doc of usersSnap.docs) {
    usersById.set(doc.id, { id: doc.id, ...doc.data() });
  }

  /** Map normalized volunteer/legacy name → account display name */
  const renameMap = new Map();

  for (const doc of volunteersSnap.docs) {
    const volunteer = doc.data();
    const legacyName = (volunteer.name || '').trim();
    if (!legacyName) continue;

    let accountName = '';
    if (volunteer.userId && usersById.has(volunteer.userId)) {
      accountName = accountDisplayName(usersById.get(volunteer.userId));
    } else {
      // Fall back: volunteer name already matches an account
      for (const user of usersById.values()) {
        const display = accountDisplayName(user);
        if (display && normalizeName(display) === normalizeName(legacyName)) {
          accountName = display;
          break;
        }
      }
    }

    if (accountName && normalizeName(accountName) !== normalizeName(legacyName)) {
      renameMap.set(normalizeName(legacyName), accountName);
    }
  }

  console.log(`Volunteer→account renames: ${renameMap.size}`);
  for (const [from, to] of renameMap) {
    console.log(`  "${from}" → "${to}"`);
  }

  let schedulesTouched = 0;
  let fieldsUpdated = 0;

  for (const doc of schedulesSnap.docs) {
    const data = doc.data();
    const patch = {};
    for (const key of ROLE_KEYS) {
      const current = typeof data[key] === 'string' ? data[key].trim() : '';
      if (!current) continue;
      const next = renameMap.get(normalizeName(current));
      if (next && next !== current) {
        patch[key] = next;
        fieldsUpdated += 1;
      }
    }
    if (Object.keys(patch).length === 0) continue;
    schedulesTouched += 1;
    console.log(`Schedule ${doc.id}:`, patch);
    if (APPLY) {
      await doc.ref.update(patch);
    }
  }

  console.log(
    APPLY
      ? `Applied: ${schedulesTouched} schedules, ${fieldsUpdated} fields.`
      : `Dry-run: ${schedulesTouched} schedules, ${fieldsUpdated} fields would update. Re-run with --apply --confirm-project=${EM_PROJECT}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
