/**
 * Bulk import cleaning roster entries from embedded schedule data.
 * Usage: node scripts/import-cleaning-roster.mjs [--dry-run]
 */
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const DRY_RUN = process.argv.includes('--dry-run');

function loadServiceAccount() {
  const raw =
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    try {
      return JSON.parse(trimmed.replace(/\\"/g, '"').replace(/^"|"$/g, ''));
    } catch {
      return null;
    }
  }
}

const serviceAccount = loadServiceAccount();
if (!serviceAccount) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    console.error('Firebase admin credentials missing from environment.');
    process.exit(1);
  }
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
} else {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

const DAY_IDS = {
  wednesday: 'eTZtQlyh3HLwe9m4uFct',
  koinonia: '7ZJVdl2Emfl1SYV1fK7s',
  sunday: 'N8bhPyq9VnMhdtjsah1G',
};

/** First person in each row is lead (bold in source table). Order preserved. */
const SCHEDULE = [
  { date: '2026-06-17', day: 'wednesday', people: ['Claire', 'Rose'] },
  { date: '2026-06-24', day: 'koinonia', people: ['Michelle', 'Jayden', 'Hannah'] },
  { date: '2026-07-01', day: 'wednesday', people: ['Josh C', 'Isaac Lee'] },
  { date: '2026-07-05', day: 'sunday', people: ['John', 'Gloria', 'Yuggeun', 'Byron', 'Aiden'] },
  { date: '2026-07-08', day: 'wednesday', people: ['Ye Chan', 'Sharon', 'Sophia'] },
  { date: '2026-07-15', day: 'wednesday', people: ['Grace', 'Emma', 'David L'] },
  { date: '2026-07-22', day: 'wednesday', people: ['Jihun', 'Sam', 'Ireh'] },
  { date: '2026-07-29', day: 'koinonia', people: ['Miya', 'Jooee', 'Jeean'] },
  { date: '2026-08-02', day: 'sunday', people: ['Michelle', 'Rose', 'Lynn', 'Shawn', 'Andy'] },
  { date: '2026-08-05', day: 'wednesday', people: ['Hyun', 'Jun', 'Jin'] },
  { date: '2026-08-12', day: 'wednesday', people: ['Ye Chan', 'Chris'] },
  { date: '2026-08-19', day: 'wednesday', people: ['Grace', 'Gloria'] },
  { date: '2026-08-26', day: 'koinonia', people: ['Jihun', 'Hannah', 'Jayden'] },
  { date: '2026-09-02', day: 'wednesday', people: ['Miya', 'Sam', 'Ireh'] },
  { date: '2026-09-06', day: 'sunday', people: ['Josh C', 'John', 'Isaac Lee', 'Yuggeun', 'Aiden'] },
  { date: '2026-09-09', day: 'wednesday', people: ['Michelle', 'Sharon', 'Sophia'] },
  { date: '2026-09-16', day: 'wednesday', people: ['Ye Chan', 'Emma', 'David L'] },
  { date: '2026-09-23', day: 'wednesday', people: ['Grace', 'Chris'] },
  { date: '2026-09-30', day: 'koinonia', people: ['Hyun', 'Jun', 'Jin'] },
  { date: '2026-10-04', day: 'sunday', people: ['THE BRIDGE'], bridge: true },
  { date: '2026-10-07', day: 'wednesday', people: ['Jihun', 'Jooee', 'Jeean'] },
  { date: '2026-10-14', day: 'wednesday', people: ['Miya', 'Gloria'] },
  { date: '2026-10-21', day: 'wednesday', people: ['Michelle', 'Rose'] },
  { date: '2026-10-28', day: 'wednesday', people: ['Josh C', 'Sam', 'Ireh'] },
  { date: '2026-11-01', day: 'sunday', people: ['Josh K', 'John', 'Lynn', 'Shawn', 'Byron'] },
  { date: '2026-11-04', day: 'wednesday', people: ['Ye Chan', 'Sharon', 'Sophia'] },
  { date: '2026-11-11', day: 'wednesday', people: ['Grace', 'Jayden', 'Andy'] },
  { date: '2026-11-18', day: 'wednesday', people: ['Jihun', 'Rose'] },
  { date: '2026-11-25', day: 'koinonia', people: ['Michelle', 'Hannah', 'Jin'] },
  { date: '2026-12-02', day: 'wednesday', people: ['Miya', 'Jooee', 'Jeean'] },
  { date: '2026-12-06', day: 'sunday', people: ['Hyun', 'Josh K', 'Isaac Lee', 'Jun', 'Jayden'] },
  { date: '2026-12-09', day: 'wednesday', people: ['Josh C', 'Josh K'] },
  { date: '2026-12-16', day: 'wednesday', people: ['Ye Chan', 'Chris'] },
  { date: '2026-12-23', day: 'wednesday', people: ['Grace', 'Emma', 'David L'] },
  { date: '2026-12-30', day: 'koinonia', people: ['Jihun', 'Lynn'] },
];

/** Explicit roster shorthand → user match keys or emails */
const ALIASES = {
  'Josh C': ['Joshua Choi'],
  'Josh K': ['Joshua Kang'],
  'David L': ['David Lee'],
  'Isaac Lee': ['Isaac Lee'],
  'Big Isaac': ['Isaac Lee'],
  Chris: ['Christopher Jung'],
  Sam: ['Samuel Bang'],
  'Ye Chan': ['David Jung'],
  Rose: ['Rose Jung'],
  Hyun: ['Hyun Chang'],
};

function normalize(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function displayName(u) {
  return `${u.firstName || ''} ${u.lastName || ''}`.trim();
}

function buildUserIndex(users) {
  const byNorm = new Map();
  for (const u of users) {
    const full = displayName(u);
    const keys = [
      full,
      u.firstName,
      u.displayName,
      `${u.firstName} ${u.lastName?.[0] ?? ''}`.trim(),
    ].filter(Boolean);
    for (const key of keys) {
      byNorm.set(normalize(key), u.uid);
    }
  }
  return byNorm;
}

function resolvePerson(name, byNorm, users) {
  const aliasTargets = ALIASES[name] || [name];
  for (const target of aliasTargets) {
    const uid = byNorm.get(normalize(target));
    if (uid) return uid;
  }
  // Email fallback for newly registered users
  const emailAliases = {
    Rose: 'rjung4585@gmail.com',
    Hyun: 'hyun.denny2006@gmail.com',
  };
  const email = emailAliases[name];
  if (email) {
    const match = users.find((u) => (u.email || '').toLowerCase() === email);
    if (match) return match.uid;
  }
  const first = normalize(name.split(/\s+/)[0]);
  const matches = users.filter((u) => normalize(u.firstName || '') === first);
  if (matches.length === 1) return matches[0].uid;
  return null;
}

async function run() {
  const usersSnap = await db.collection('users').get();
  const users = usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() }));
  const byNorm = buildUserIndex(users);

  const unresolved = new Set();
  const entries = [];

  for (const row of SCHEDULE) {
    if (row.bridge) {
      entries.push({ date: row.date, dayId: DAY_IDS[row.day], bridge: true, assignedUserIds: [] });
      continue;
    }
    const assignedUserIds = [];
    for (const person of row.people) {
      const uid = resolvePerson(person, byNorm, users);
      if (uid) assignedUserIds.push(uid);
      else unresolved.add(person);
    }
    entries.push({ date: row.date, dayId: DAY_IDS[row.day], assignedUserIds });
  }

  if (unresolved.size) {
    console.error('Unresolved names (no matching user account):');
    for (const n of [...unresolved].sort()) console.error('  -', n);
    console.error('\nAvailable users:');
    users
      .sort((a, b) => displayName(a).localeCompare(displayName(b)))
      .forEach((u) => console.error(' ', displayName(u), `(${u.uid})`));
    process.exit(1);
  }

  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Importing ${entries.length} cleaning roster entries...`);

  let batch = db.batch();
  let count = 0;

  for (const entry of entries) {
    const ref = db.collection('cleaningRosters').doc(entry.date);

    if (entry.bridge) {
      console.log(`${entry.date}: (THE BRIDGE — removing cleaning entry)`);
      if (!DRY_RUN) {
        batch.delete(ref);
        count++;
      }
      continue;
    }

    const payload = {
      date: entry.date,
      dayId: entry.dayId,
      assignedUserIds: entry.assignedUserIds,
      isCompleted: false,
      completedAt: null,
      completedBy: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const names = entry.assignedUserIds.map((uid) => displayName(users.find((u) => u.uid === uid)));
    console.log(`${entry.date}: ${names.join(', ')}`);

    if (!DRY_RUN) {
      batch.set(ref, payload, { merge: true });
      count++;
      if (count >= 400) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }
  }

  if (!DRY_RUN && count > 0) await batch.commit();
  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
