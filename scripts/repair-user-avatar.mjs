/**
 * Repair a user's profile photo when Firestore imageUrl points to a missing Storage object.
 * Picks the newest avatars/{uid}_* file and syncs memberInfo across chats.
 *
 * Usage: node scripts/repair-user-avatar.mjs [uid]
 */
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
      storageBucket: 'cell-abca4.firebasestorage.app',
    });
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Firebase admin credentials missing.');
  const trimmed = raw.trim();
  try {
    return admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(trimmed)),
      storageBucket: 'cell-abca4.firebasestorage.app',
    });
  } catch {
    return admin.initializeApp({
      credential: admin.credential.cert(
        JSON.parse(trimmed.replace(/\\"/g, '"').replace(/^"|"$/g, '')),
      ),
      storageBucket: 'cell-abca4.firebasestorage.app',
    });
  }
}

initAdmin();
const db = admin.firestore();
const bucket = admin.storage().bucket();
const uid = process.argv[2] || '1GClJubuKUWcs68dtvjDjbQI3K13';

function downloadUrlForFile(file, token) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(file.name)}?alt=media&token=${token}`;
}

async function getLatestAvatarUrl(userId) {
  const [files] = await bucket.getFiles({ prefix: `avatars/${userId}_` });
  if (files.length === 0) return null;

  const latest = files.sort((a, b) => a.name.localeCompare(b.name)).at(-1);
  const [meta] = await latest.getMetadata();
  const token = meta.metadata?.firebaseStorageDownloadTokens?.split(',')[0];
  if (!token) return null;
  return downloadUrlForFile(latest, token);
}

async function profileFileExists(imageUrl) {
  if (!imageUrl) return false;
  const match = imageUrl.match(/\/o\/([^?]+)/);
  if (!match) return false;
  const path = decodeURIComponent(match[1]);
  const [exists] = await bucket.file(path).exists();
  return exists;
}

const userRef = db.collection('users').doc(uid);
const userSnap = await userRef.get();
if (!userSnap.exists) {
  console.error('User not found:', uid);
  process.exit(1);
}

const profile = userSnap.data();
const avatar = profile.avatar || {};
const currentUrl = avatar.imageUrl;
const currentOk = await profileFileExists(currentUrl);

if (currentOk && avatar.mode === 'image') {
  console.log('Profile image URL is valid; no repair needed.');
  process.exit(0);
}

const latestUrl = await getLatestAvatarUrl(uid);
if (!latestUrl) {
  console.error('No avatar files in storage for', uid);
  process.exit(1);
}

const nextAvatar = {
  ...avatar,
  mode: 'image',
  imageUrl: latestUrl,
};

await userRef.set({ avatar: nextAvatar, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
console.log('Updated user profile imageUrl');

const memberInfo = {
  firstName: profile.firstName,
  lastName: profile.lastName,
  avatar: nextAvatar,
};

const chatsSnap = await db.collection('chats').where('members', 'array-contains', uid).get();
let batch = db.batch();
let count = 0;
let updated = 0;

for (const chatDoc of chatsSnap.docs) {
  batch.update(chatDoc.ref, { [`memberInfo.${uid}`]: memberInfo });
  count++;
  updated++;
  if (count >= 400) {
    await batch.commit();
    batch = db.batch();
    count = 0;
  }
}

if (count > 0) await batch.commit();
console.log(`Synced memberInfo in ${updated} chat(s).`);
console.log('New imageUrl:', latestUrl);
