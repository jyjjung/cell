/**
 * Restore a user's chat access from role memberships and message history.
 * Usage: node scripts/restore-user-chat-access.mjs <email>
 */
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/restore-user-chat-access.mjs <email>');
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
const ROLES_COLLECTION = 'roles';

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

async function collectChatIds(user) {
  const chatIds = new Set();
  const sources = { role: [], messages: [], created: [] };

  const roleIds = user.roleIds ?? [];
  if (roleIds.length > 0) {
    const rolesSnap = await db.collection(ROLES_COLLECTION).get();
    for (const roleDoc of rolesSnap.docs) {
      const role = roleDoc.data();
      if (roleIds.includes(roleDoc.id) && role.chatId) {
        chatIds.add(role.chatId);
        sources.role.push(role.chatId);
      }
    }
  }

  const chatsSnap = await db.collection(CHATS_COLLECTION).get();
  for (const chatDoc of chatsSnap.docs) {
    const chat = chatDoc.data();
    const chatId = chatDoc.id;

    if (chat.lastMessageSenderId === user.uid) {
      chatIds.add(chatId);
      sources.created.push(chatId);
    }

    if (chat.type === 'private' && chat.members?.length === 1) {
      const msgsSnap = await chatDoc.ref.collection('messages')
        .where('senderId', '==', user.uid)
        .limit(1)
        .get();
      if (!msgsSnap.empty) {
        chatIds.add(chatId);
        sources.messages.push(chatId);
        continue;
      }
    }

    if (!chatIds.has(chatId)) {
      const msgsSnap = await chatDoc.ref.collection('messages')
        .where('senderId', '==', user.uid)
        .limit(1)
        .get();
      if (!msgsSnap.empty) {
        chatIds.add(chatId);
        sources.messages.push(chatId);
      }
    }
  }

  return { chatIds, sources };
}

async function addUserToChats(user, chatIds) {
  const memberInfo = {
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    avatar: user.avatar ?? DEFAULT_AVATAR,
  };

  let added = 0;
  let skipped = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const chatId of chatIds) {
    const chatRef = db.collection(CHATS_COLLECTION).doc(chatId);
    const chatDoc = await chatRef.get();
    if (!chatDoc.exists) continue;

    const members = chatDoc.data().members ?? [];
    if (members.includes(user.uid)) {
      skipped++;
      continue;
    }

    batch.update(chatRef, {
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
  return { added, skipped };
}

async function run() {
  const user = await findUserByEmail(email);
  if (!user?.uid) {
    console.error(`No user found for ${email}`);
    process.exit(1);
  }

  console.log(`Found user: ${user.firstName ?? ''} ${user.lastName ?? ''} (${user.uid})`);
  console.log(`Roles: ${(user.roleIds ?? []).join(', ') || '(none)'}`);

  const { chatIds, sources } = await collectChatIds(user);
  const uniqueRole = [...new Set(sources.role)];
  const uniqueMessages = [...new Set(sources.messages)];
  const uniqueCreated = [...new Set(sources.created)];

  console.log(`Chats from roles: ${uniqueRole.length}`);
  console.log(`Chats from messages: ${uniqueMessages.length}`);
  console.log(`Chats from activity metadata: ${uniqueCreated.length}`);
  console.log(`Total unique chats to restore: ${chatIds.size}`);

  const { added, skipped } = await addUserToChats(user, chatIds);
  console.log(`Done. Added to ${added} chat(s), already member of ${skipped}.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
