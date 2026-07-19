import fs from 'node:fs/promises';
import { auth, bucket, db } from './admin.mjs';

const outputArg = process.argv.find((arg) => arg.startsWith('--manifest='));
const outputPath = outputArg?.split('=')[1];

function storagePathFromUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    const encoded = url.pathname.split('/o/')[1];
    return encoded ? decodeURIComponent(encoded.split('?')[0]) : null;
  } catch {
    return null;
  }
}

async function main() {
  const collections = await db.listCollections();
  const collectionCounts = {};
  for (const collection of collections) {
    collectionCounts[collection.id] = (await collection.count().get()).data().count;
  }

  const [users, roles, chats, songs, messages, threads] = await Promise.all([
    db.collection('users').get(),
    db.collection('roles').get(),
    db.collection('chats').get(),
    db.collection('worshipSongs').get(),
    db.collectionGroup('messages').get(),
    db.collectionGroup('thread').get(),
  ]);
  const userIds = new Set(users.docs.map((doc) => doc.id));
  const roleIds = new Set(roles.docs.map((doc) => doc.id));
  let danglingRoleRefs = 0;
  for (const userDoc of users.docs) {
    for (const roleId of userDoc.data().roleIds || []) {
      if (!roleIds.has(roleId)) danglingRoleRefs++;
    }
  }

  const authIds = new Set();
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    page.users.forEach((user) => authIds.add(user.uid));
    pageToken = page.pageToken;
  } while (pageToken);

  const references = new Set();
  for (const userDoc of users.docs) {
    const path = storagePathFromUrl(userDoc.data().avatar?.imageUrl);
    if (path) references.add(path);
  }
  for (const chatDoc of chats.docs) {
    const path = storagePathFromUrl(chatDoc.data().photoURL);
    if (path) references.add(path);
  }
  for (const messageDoc of [...messages.docs, ...threads.docs]) {
    const path = storagePathFromUrl(messageDoc.data().imageUrl);
    if (path) references.add(path);
  }
  for (const songDoc of songs.docs) {
    for (const sheet of songDoc.data().chordSheets || []) {
      if (typeof sheet.storagePath === 'string') references.add(sheet.storagePath);
    }
  }

  const storageObjects = bucket ? (await bucket.getFiles())[0] : [];
  const recognized = storageObjects.filter((file) =>
    /^(avatars|chats|worshipChordSheets|worship-sheets)\//.test(file.name));
  const orphanCandidates = recognized
    .filter((file) => !references.has(file.name))
    .map((file) => ({ path: file.name, generation: file.metadata.generation || null }));

  const manifest = {
    generatedAt: new Date().toISOString(),
    projectId: process.env.FIREBASE_PROJECT_ID,
    collectionCounts,
    consistency: {
      danglingRoleRefs,
      authWithoutProfile: [...authIds].filter((id) => !userIds.has(id)).length,
      profileWithoutAuth: [...userIds].filter((id) => !authIds.has(id)).length,
    },
    storage: {
      objects: storageObjects.length,
      referenced: references.size,
      recognized: recognized.length,
      orphanCandidates,
    },
  };

  if (outputPath) await fs.writeFile(outputPath, JSON.stringify(manifest, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({
    generatedAt: manifest.generatedAt,
    collectionCounts,
    consistency: manifest.consistency,
    storage: {
      objects: manifest.storage.objects,
      referenced: manifest.storage.referenced,
      recognized: manifest.storage.recognized,
      orphanCandidates: orphanCandidates.length,
      manifestWritten: outputPath || null,
    },
  }, null, 2));
}

await main();
