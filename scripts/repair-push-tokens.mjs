/**
 * Audit and repair FCM tokens for all users who appear opted-in.
 *
 * Problem: send paths historically only tried the first 3 tokens. If those were
 * stale while later tokens (or no remaining valid tokens) existed, users stayed
 * "Enabled" in the UI but never received pushes — and stale tokens were never pruned.
 *
 * This script:
 * 1. Loads every user with fcmTokens
 * 2. Dry-run validates ALL unique tokens against FCM
 * 3. Removes invalid tokens from Firestore
 * 4. Keeps valid tokens (newest-first order preserved where possible), capped
 * 5. Prints a report of who was broken vs healthy
 *
 * Usage:
 *   node scripts/repair-push-tokens.mjs           # apply fixes
 *   node scripts/repair-push-tokens.mjs --dry-run # report only
 */
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const APPLY = !process.argv.includes('--dry-run');
const MAX_TOKENS = 5;

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

  // .env sometimes double-escapes quotes and leaves real newlines + stray backslashes in the key.
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
      // drop invalid escapes (e.g. \s corrupted into the key)
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

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (projectId && clientEmail && privateKey) {
    return admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    const json = parseServiceAccount(raw);
    if (!json) throw new Error('Could not parse FIREBASE_SERVICE_ACCOUNT_KEY JSON');
    return admin.initializeApp({ credential: admin.credential.cert(json) });
  }

  throw new Error('Missing Firebase Admin credentials in .env');
}

function isStaleError(code) {
  return (
    code === 'messaging/registration-token-not-registered' ||
    code === 'messaging/invalid-registration-token' ||
    code === 'messaging/invalid-argument'
  );
}

async function validateTokens(messaging, tokens) {
  if (tokens.length === 0) {
    return { valid: [], stale: [], otherFailures: [] };
  }

  const response = await messaging.sendEachForMulticast(
    {
      tokens,
      data: { title: 'token-check', body: 'dry-run' },
    },
    true, // dry run — does not deliver
  );

  const valid = [];
  const stale = [];
  const otherFailures = [];

  response.responses.forEach((res, idx) => {
    const token = tokens[idx];
    if (res.success) {
      valid.push(token);
      return;
    }
    const code = res.error?.code || 'unknown';
    if (isStaleError(code)) {
      stale.push({ token, code });
    } else {
      otherFailures.push({ token, code, message: res.error?.message });
    }
  });

  return { valid, stale, otherFailures };
}

async function main() {
  initAdmin();
  const db = admin.firestore();
  const messaging = admin.messaging();

  const snap = await db.collection('users').get();
  const optedIn = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const raw = Array.isArray(data.fcmTokens) ? data.fcmTokens.filter(Boolean) : [];
    if (raw.length === 0) continue;
    optedIn.push({
      uid: doc.id,
      name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || '(no name)',
      email: data.email || '',
      tokens: [...new Set(raw)],
    });
  }

  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN (report only)'}`);
  console.log(`Opted-in users (have fcmTokens): ${optedIn.length}\n`);

  const report = {
    healthy: [],
    repaired: [],
    fullyBroken: [],
    excessTrimmed: [],
    errors: [],
  };

  for (const user of optedIn) {
    try {
      const { valid, stale, otherFailures } = await validateTokens(messaging, user.tokens);
      const kept = valid.slice(0, MAX_TOKENS);
      const excessValid = valid.length > MAX_TOKENS ? valid.slice(MAX_TOKENS) : [];
      const needsWrite =
        stale.length > 0 ||
        excessValid.length > 0 ||
        kept.length !== user.tokens.length ||
        kept.some((t, i) => t !== user.tokens[i]);

      const summary = {
        name: user.name,
        email: user.email,
        uid: user.uid,
        before: user.tokens.length,
        valid: valid.length,
        stale: stale.length,
        otherFailures: otherFailures.length,
        kept: kept.length,
      };

      if (valid.length === 0) {
        report.fullyBroken.push({ ...summary, staleCodes: stale.map((s) => s.code) });
        if (APPLY) {
          await db.collection('users').doc(user.uid).update({
            fcmTokens: [],
            fcmTokensRepairedAt: admin.firestore.FieldValue.serverTimestamp(),
            fcmNeedsReenable: true,
          });
        }
        console.log(`BROKEN  ${user.name} <${user.email}> — ${user.tokens.length} token(s), 0 valid (cleared)`);
        continue;
      }

      if (needsWrite) {
        report.repaired.push(summary);
        if (excessValid.length) report.excessTrimmed.push(summary);
        if (APPLY) {
          await db.collection('users').doc(user.uid).update({
            fcmTokens: kept,
            fcmTokensRepairedAt: admin.firestore.FieldValue.serverTimestamp(),
            fcmNeedsReenable: false,
          });
        }
        console.log(
          `REPAIRED ${user.name} <${user.email}> — ${user.tokens.length}→${kept.length} valid (removed ${stale.length} stale)`,
        );
        continue;
      }

      report.healthy.push(summary);
      console.log(`OK      ${user.name} <${user.email}> — ${valid.length} valid token(s)`);
    } catch (err) {
      report.errors.push({ uid: user.uid, email: user.email, error: String(err) });
      console.error(`ERROR   ${user.name} <${user.email}> — ${err}`);
    }
  }

  console.log('\n── Summary ──');
  console.log(`Healthy:       ${report.healthy.length}`);
  console.log(`Repaired:      ${report.repaired.length}`);
  console.log(`Fully broken:  ${report.fullyBroken.length} (need to re-enable on a device)`);
  console.log(`Errors:        ${report.errors.length}`);

  if (report.fullyBroken.length) {
    console.log('\nUsers who must re-enable notifications on a device:');
    for (const u of report.fullyBroken) {
      console.log(`  - ${u.name} <${u.email}>`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
