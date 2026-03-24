import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('Firebase credentials missing from .env.local (PROJECT_ID, CLIENT_EMAIL, or PRIVATE_KEY)');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  }),
  projectId
});

const db = admin.firestore();

const COLLECTIONS = [
  'users',
  'roles',
  'events',
  'qtRosters',
  'cleaningDays',
  'cleaningRosters',
  'memoryVerses',
  'config',
  'notifications',
  'chats'
];

async function exportCollection(collectionName) {
  console.log(`Exporting ${collectionName}...`);
  const snapshot = await db.collection(collectionName).get();
  const data = [];
  snapshot.forEach(doc => {
    data.push({ id: doc.id, ...doc.data() });
  });
  return data;
}

async function run() {
  const exportData = {};
  for (const coll of COLLECTIONS) {
    try {
      exportData[coll] = await exportCollection(coll);
    } catch (e) {
      console.error(`Failed to export ${coll}:`, e.message);
    }
  }

  const outputPath = 'firestore-export.json';
  fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
  console.log(`Export completed: ${outputPath}`);
}

run().catch(console.error);
