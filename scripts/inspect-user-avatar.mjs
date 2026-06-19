import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

function initAdmin() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (projectId && clientEmail && privateKey) {
    return admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Firebase admin credentials missing.');
  const trimmed = raw.trim();
  try {
    return admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(trimmed)),
    });
  } catch {
    return admin.initializeApp({
      credential: admin.credential.cert(
        JSON.parse(trimmed.replace(/\\"/g, '"').replace(/^"|"$/g, '')),
      ),
    });
  }
}

initAdmin();
const db = admin.firestore();
const uid = process.argv[2] || '1GClJubuKUWcs68dtvjDjbQI3K13';

const snap = await db.collection('users').doc(uid).get();
const data = snap.data();
console.log('user', data?.firstName, data?.lastName);
console.log('avatar', JSON.stringify(data?.avatar, null, 2));

const imageUrl = data?.avatar?.imageUrl;
if (imageUrl) {
  try {
    const res = await fetch(imageUrl, { method: 'HEAD' });
    console.log('imageUrl HEAD', res.status, res.headers.get('content-type'));
  } catch (e) {
    console.log('imageUrl fetch error', e.message);
  }
}

const chats = await db.collection('chats').where('members', 'array-contains', uid).limit(3).get();
for (const doc of chats.docs) {
  const mi = doc.data().memberInfo?.[uid]?.avatar;
  console.log('chat memberInfo avatar', doc.id.slice(0, 24), JSON.stringify(mi));
}

const bucket = admin.storage().bucket('cell-abca4.firebasestorage.app');
const [files] = await bucket.getFiles({ prefix: `avatars/${uid}_` });
console.log('storage files:', files.map((f) => f.name));

const profilePath = data?.avatar?.imageUrl?.match(/avatars%2F([^?]+)/)?.[1]
  ? decodeURIComponent(data.avatar.imageUrl.match(/avatars%2F([^?]+)/)[1])
  : null;
if (profilePath) {
  const [exists] = await bucket.file(profilePath).exists();
  console.log('profile file exists?', profilePath, exists);
}

if (files.length > 0) {
  const latest = files.sort((a, b) => a.name.localeCompare(b.name)).at(-1);
  const [meta] = await latest.getMetadata();
  const token = meta.metadata?.firebaseStorageDownloadTokens?.split(',')[0];
  if (token) {
    const dl = `https://firebasestorage.googleapis.com/v0/b/cell-abca4.firebasestorage.app/o/${encodeURIComponent(latest.name)}?alt=media&token=${token}`;
    const res = await fetch(dl, { method: 'HEAD' });
    console.log('latest file download HEAD', latest.name, res.status);
  }
}
