/**
 * Flag all opted-in users so their next app open forces an FCM SW + token rebind.
 *
 * Usage: node scripts/mark-push-resync.mjs
 */
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

function parseServiceAccount(raw) {
  const trimmed = raw.trim();
  const candidates = [
    trimmed,
    trimmed.replace(/^"|"$/g, ''),
    trimmed.replace(/^"|"$/g, '').replace(/\\"/g, '"'),
  ];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed?.private_key) return parsed;
    } catch {
      // try next
    }
  }
  let s = trimmed;
  if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1);
  s = s.replace(/\\"/g, '"');
  s = s.replace(/\r?\n/g, '\\n');
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\') {
      const next = s[i + 1];
      if ('"\\/bfnrtu'.includes(next)) {
        out += s[i] + next;
        i++;
      }
    } else {
      out += s[i];
    }
  }
  try {
    const parsed = JSON.parse(out);
    if (parsed?.private_key) return parsed;
  } catch {
    // fall through
  }
  return null;
}

function initAdmin() {
  if (admin.apps.length) return admin.app();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Missing Firebase Admin credentials');
  const json = parseServiceAccount(raw);
  if (!json) throw new Error('Could not parse service account JSON');
  return admin.initializeApp({ credential: admin.credential.cert(json) });
}

async function main() {
  initAdmin();
  const db = admin.firestore();
  const snap = await db.collection('users').get();
  let marked = 0;
  let skipped = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const tokens = Array.isArray(data.fcmTokens) ? data.fcmTokens.filter(Boolean) : [];
    if (tokens.length === 0) {
      skipped++;
      continue;
    }
    await docSnap.ref.update({
      fcmNeedsResync: true,
      fcmResyncReason: 'stale-client-push-handler-2026-07-15',
      fcmResyncRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`MARKED  ${data.firstName || ''} ${data.lastName || ''} <${data.email}> (${tokens.length} token(s))`);
    marked++;
  }

  console.log(`\nMarked ${marked} opted-in users for auto rebind on next app open.`);
  console.log(`Skipped ${skipped} users with no tokens.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
