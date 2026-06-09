/**
 * Add a user (by email) to every chat's members list.
 * Usage: node scripts/add-user-to-all-chats.mjs yejoon7154@gmail.com
 */
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/add-user-to-all-chats.mjs <email>');
  process.exit(1);
}

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
const CHATS_COLLECTION = 'chats';
const USERS_COLLECTION = 'users';

const DEFAULT_AVATAR = {
  hair: 'short',
  hairColor: '#3b2f2f',
  skinColor: '#f5d0b5',
  outfit: 'hoodie',
  outfitColor: '#4a5568',
  accessory: 'none',
  mouth: 'smile',
  facialHair: 'none',
  background: 'blue',
};

async function findUserByEmail(targetEmail) {
  const snap = await db.collection(USERS_COLLECTION).where('email', '==', targetEmail).limit(5).get();
  if (snap.empty) {
    const authUser = await admin.auth().getUserByEmail(targetEmail).catch(() => null);
    if (!authUser) return null;
    const doc = await db.collection(USERS_COLLECTION).doc(authUser.uid).get();
    return doc.exists ? { uid: authUser.uid, ...doc.data() } : null;
  }
  const doc = snap.docs[0];
  return { uid: doc.id, ...doc.data() };
}

async function run() {
  const user = await findUserByEmail(email);
  if (!user?.uid) {
    console.error(`No user found for ${email}`);
    process.exit(1);
  }

  console.log(`Found user: ${user.firstName ?? ''} ${user.lastName ?? ''} (${user.uid})`);

  const chatsSnap = await db.collection(CHATS_COLLECTION).get();
  let added = 0;
  let skipped = 0;
  let batch = db.batch();
  let batchCount = 0;

  const memberInfo = {
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    avatar: user.avatar ?? DEFAULT_AVATAR,
  };

  for (const chatDoc of chatsSnap.docs) {
    const chat = chatDoc.data();
    const members = chat.members ?? [];
    if (members.includes(user.uid)) {
      skipped++;
      continue;
    }

    batch.update(chatDoc.ref, {
      members: admin.firestore.FieldValue.arrayUnion(user.uid),
      [`memberInfo.${user.uid}`]: memberInfo,
      [`memberSeen.${user.uid}`]: new admin.firestore.Timestamp(0, 0),
    });
    added++;
    batchCount++;

    if (batchCount >= 400) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) await batch.commit();

  console.log(`Done. Added to ${added} chat(s), already member of ${skipped}. Total chats: ${chatsSnap.size}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
