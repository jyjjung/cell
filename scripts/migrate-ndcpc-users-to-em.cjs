#!/usr/bin/env node
/**
 * Migrate NDCPC Auth + user profiles into cell-abca4.
 *
 * Usage:
 *   node scripts/migrate-ndcpc-users-to-em.cjs              # dry-run report
 *   node scripts/migrate-ndcpc-users-to-em.cjs --apply --confirm-project=cell-abca4
 *
 * Requires:
 *   - EM_* service account env for cell-abca4 (FIREBASE_* or GOOGLE_APPLICATION_CREDENTIALS)
 *   - NDCPc_* service account for studio-7483951484-e5df7 (NDCPC_SERVICE_ACCOUNT_JSON)
 *
 * Optional (preserves passwords for CREATE accounts):
 *   - NDCPC_AUTH_EXPORT_JSON — path or JSON from `firebase auth:export`
 *   - NDCPC_HASH_CONFIG_JSON — { algorithm, signerKey, saltSeparator, rounds, memoryCost }
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

if (APPLY && confirmedProject !== EM_PROJECT) {
  throw new Error(`Apply requires --confirm-project=${EM_PROJECT}`);
}

function parseJsonEnv(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return JSON.parse(trimmed);
  if (fs.existsSync(trimmed)) return JSON.parse(fs.readFileSync(trimmed, 'utf8'));
  return JSON.parse(trimmed);
}

function decodeFirebaseExportBuffer(value) {
  if (!value) return undefined;
  // Auth export uses standard base64 (often URL-safe variants appear too).
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64');
}

function initApp(name, projectId, credsJson) {
  if (!credsJson) throw new Error(`Missing credentials for ${name}`);
  const parsed = typeof credsJson === 'string' ? JSON.parse(credsJson) : credsJson;
  return admin.initializeApp(
    { credential: admin.credential.cert(parsed), projectId },
    name,
  );
}

function splitDisplayName(displayName) {
  if (!displayName?.trim()) return { firstName: 'Member', lastName: '' };
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

async function listAllUsers(auth, nextPageToken) {
  const res = await auth.listUsers(1000, nextPageToken);
  let users = res.users;
  if (res.pageToken) {
    users = users.concat(await listAllUsers(auth, res.pageToken));
  }
  return users;
}

async function main() {
  const emCreds = resolveServiceAccount();
  let ndcpcCreds = resolveServiceAccount({ jsonEnvKeys: ['NDCPC_SERVICE_ACCOUNT_JSON'] });
  if (!ndcpcCreds && process.env.NDCPC_SERVICE_ACCOUNT_JSON) {
    ndcpcCreds = parseJsonEnv(process.env.NDCPC_SERVICE_ACCOUNT_JSON);
  }
  if (!emCreds) throw new Error('Set FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY or FIREBASE_SERVICE_ACCOUNT_KEY for cell-abca4');
  if (!ndcpcCreds) throw new Error('Set NDCPC_SERVICE_ACCOUNT_JSON for NDCPC export');

  initApp('em', EM_PROJECT, emCreds);
  initApp('ndcpc', NDCPc_PROJECT, ndcpcCreds);

  const emAuth = admin.app('em').auth();
  const ndcpcAuth = admin.app('ndcpc').auth();
  const emDb = admin.app('em').firestore();
  const ndcpcDb = admin.app('ndcpc').firestore();

  const authExport = parseJsonEnv(process.env.NDCPC_AUTH_EXPORT_JSON);
  const hashConfigRaw = parseJsonEnv(process.env.NDCPC_HASH_CONFIG_JSON);
  const exportByEmail = new Map(
    (authExport?.users || []).filter((u) => u.email).map((u) => [u.email.toLowerCase(), u]),
  );
  const importHashOptions = hashConfigRaw
    ? {
        hash: {
          algorithm: hashConfigRaw.algorithm || 'SCRYPT',
          key: Buffer.from(hashConfigRaw.signerKey, 'base64'),
          saltSeparator: Buffer.from(hashConfigRaw.saltSeparator || 'Bw==', 'base64'),
          rounds: hashConfigRaw.rounds ?? 8,
          memoryCost: hashConfigRaw.memoryCost ?? 14,
        },
      }
    : null;

  const [emUsers, ndcpcUsers] = await Promise.all([
    listAllUsers(emAuth),
    listAllUsers(ndcpcAuth),
  ]);

  const emByEmail = new Map(
    emUsers.filter((u) => u.email).map((u) => [u.email.toLowerCase(), u]),
  );
  const emUids = new Set(emUsers.map((u) => u.uid));

  const remap = {};
  const report = { link: 0, create: 0, skip: 0, passwordImport: 0, passwordMissing: 0, errors: [] };

  for (const ndUser of ndcpcUsers) {
    const email = ndUser.email?.toLowerCase();
    if (!email) {
      report.skip++;
      continue;
    }

    const ndProfileSnap = await ndcpcDb.collection('users').doc(ndUser.uid).get();
    const ndProfile = ndProfileSnap.data() || {};
    const approved = ndProfile.approved === true;
    const ndcpcRole = ndProfile.role === 'admin' ? 'admin' : 'member';
    const { firstName, lastName } = splitDisplayName(ndProfile.displayName || ndUser.displayName);

    const existing = emByEmail.get(email);
    let targetUid;

    if (existing) {
      targetUid = existing.uid;
      remap[ndUser.uid] = targetUid;
      report.link++;
      if (APPLY) {
        const curSnap = await emDb.collection('users').doc(targetUid).get();
        const cur = curSnap.data() || {};

        const tokenSnap = await ndcpcDb.collection('users').doc(ndUser.uid).collection('fcmTokens').get();
        const legacyTokens = tokenSnap.docs
          .map((d) => d.data().token)
          .filter(Boolean);
        const mergedTokens = [...new Set([...(cur.fcmTokens || []), ...legacyTokens])];

        const chatPref = ndProfile.notificationPrefs?.chat;
        const preferences = {
          ...(cur.preferences || {}),
          notifications: {
            ...((cur.preferences || {}).notifications || {}),
            ndcpc: {
              ...(((cur.preferences || {}).notifications || {}).ndcpc || {}),
              ...(chatPref === false ? { chat: false } : {}),
            },
          },
        };

        await emDb.collection('users').doc(targetUid).set(
          {
            access: {
              cell: cur.access?.cell ?? true,
              ndcpc: approved,
            },
            isApproved: cur.isApproved || approved,
            ndcpcRole: approved ? ndcpcRole : admin.firestore.FieldValue.delete(),
            fcmTokens: mergedTokens,
            preferences,
            legacyNdcpcUid: ndUser.uid,
            migratedFrom: 'ndcpc',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }
    } else {
      report.create++;
      if (APPLY) {
        const tokenSnap = await ndcpcDb.collection('users').doc(ndUser.uid).collection('fcmTokens').get();
        const legacyTokens = tokenSnap.docs
          .map((d) => d.data().token)
          .filter(Boolean);

        const exported = exportByEmail.get(email);
        const keepUid = !emUids.has(ndUser.uid) ? ndUser.uid : undefined;
        const displayName = ndUser.displayName || `${firstName} ${lastName}`.trim();

        if (exported?.passwordHash && importHashOptions) {
          const importResult = await emAuth.importUsers(
            [
              {
                uid: keepUid,
                email: ndUser.email,
                emailVerified: ndUser.emailVerified,
                displayName,
                disabled: ndUser.disabled,
                passwordHash: decodeFirebaseExportBuffer(exported.passwordHash),
                passwordSalt: decodeFirebaseExportBuffer(exported.salt),
              },
            ],
            importHashOptions,
          );
          if (importResult.errors?.length) {
            report.errors.push({ email, import: importResult.errors.map((e) => e.error?.message || String(e)) });
            const created = await emAuth.createUser({
              uid: keepUid,
              email: ndUser.email,
              emailVerified: ndUser.emailVerified,
              disabled: ndUser.disabled,
              displayName,
            });
            targetUid = created.uid;
            report.passwordMissing++;
            console.warn(`Created ${email} without password (import failed) — send password reset`);
          } else {
            targetUid = keepUid || (await emAuth.getUserByEmail(ndUser.email)).uid;
            report.passwordImport++;
          }
        } else {
          const created = await emAuth.createUser({
            uid: keepUid,
            email: ndUser.email,
            emailVerified: ndUser.emailVerified,
            disabled: ndUser.disabled,
            displayName,
          });
          targetUid = created.uid;
          report.passwordMissing++;
          console.warn(`Created ${email} without password — send password reset`);
        }

        emUids.add(targetUid);
        remap[ndUser.uid] = targetUid;
        await emDb.collection('users').doc(targetUid).set(
          {
            uid: targetUid,
            email: ndUser.email,
            firstName,
            lastName,
            isApproved: approved,
            access: { cell: false, ndcpc: approved },
            ndcpcRole: approved ? ndcpcRole : 'member',
            legacyNdcpcUid: ndUser.uid,
            migratedFrom: 'ndcpc',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            roleIds: [],
            capabilityKeys: [],
            fcmTokens: legacyTokens,
            preferences: {
              notifications: {
                ndcpc: {
                  chat: ndProfile.notificationPrefs?.chat !== false,
                  announcements: true,
                  dutyReminders: true,
                  rosterReminders: true,
                },
              },
            },
          },
          { merge: true },
        );
      } else {
        targetUid = !emUids.has(ndUser.uid) ? ndUser.uid : `(new:${email})`;
        remap[ndUser.uid] = targetUid;
      }
    }
  }

  const outPath = path.join(process.cwd(), 'scripts', 'ndcpc-uid-remap.json');
  if (APPLY) {
    fs.writeFileSync(outPath, JSON.stringify(remap, null, 2));
    console.log(`Wrote UID remap → ${outPath}`);
  }

  console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', report, remapCount: Object.keys(remap).length }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
