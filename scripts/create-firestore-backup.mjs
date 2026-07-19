import dotenv from 'dotenv';
import { cert, initializeApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { GoogleAuth } from 'google-auth-library';

dotenv.config({ path: '.env.local' });
const apply = process.argv.includes('--apply');
const confirmedProject = process.argv.find((arg) => arg.startsWith('--confirm-project='))?.split('=')[1];
if (!apply || confirmedProject !== 'cell-abca4') {
  throw new Error('Backup creation requires --apply --confirm-project=cell-abca4.');
}

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'cell-abca4.firebasestorage.app';
if (!projectId || !clientEmail || !privateKey || !storageBucket) {
  throw new Error('Firebase Admin credentials or storage bucket are missing.');
}

const credentials = { client_email: clientEmail, private_key: privateKey, project_id: projectId };
const app = initializeApp({
  credential: cert({ projectId, clientEmail, privateKey }),
  storageBucket,
}, `backup-${Date.now()}`);
const bucket = getStorage(app).bucket(storageBucket);
await bucket.setMetadata({ versioning: { enabled: true } });

const auth = new GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/datastore', 'https://www.googleapis.com/auth/cloud-platform'],
});
const client = await auth.getClient();
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputUriPrefix = `gs://${storageBucket}/managed-backups/firestore-${stamp}`;
const response = await client.request({
  url: `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default):exportDocuments`,
  method: 'POST',
  data: { outputUriPrefix },
});
const operationName = response.data.name;
if (!operationName) throw new Error('Firestore export did not return an operation name.');

let operation;
do {
  await new Promise((resolve) => setTimeout(resolve, 3000));
  operation = (await client.request({
    url: `https://firestore.googleapis.com/v1/${operationName}`,
  })).data;
  if (operation.error) throw new Error(`Firestore export failed: ${JSON.stringify(operation.error)}`);
} while (!operation.done);

console.log(JSON.stringify({
  operationName,
  outputUriPrefix,
  storageVersioning: true,
  completed: true,
}, null, 2));
