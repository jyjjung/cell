import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

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
    const json = JSON.parse(raw.trim().replace(/^"|"$/g, '').replace(/\\"/g, '"'));
    return admin.initializeApp({ credential: admin.credential.cert(json) });
  }

  throw new Error('Missing Firebase Admin credentials in .env');
}

const TARGET_EMAIL = process.argv[2] || 'yejoon7154@gmail.com';

async function resolveUserId(db, auth, email) {
  for (const candidate of [email.trim().toLowerCase(), email.trim()]) {
    const snap = await db.collection('users').where('email', '==', candidate).limit(1).get();
    if (!snap.empty) return { uid: snap.docs[0].id, user: snap.docs[0].data() };
  }
  try {
    const authUser = await auth.getUserByEmail(email.trim());
    const doc = await db.collection('users').doc(authUser.uid).get();
    if (doc.exists) return { uid: doc.id, user: doc.data() };
    return { uid: authUser.uid, user: null };
  } catch {
    return null;
  }
}

async function main() {
  initAdmin();
  const db = admin.firestore();
  const auth = admin.auth();
  const messaging = admin.messaging();

  const resolved = await resolveUserId(db, auth, TARGET_EMAIL);
  if (!resolved) {
    console.error(`No user found for ${TARGET_EMAIL}`);
    process.exit(1);
  }

  const { uid, user } = resolved;
  const tokens = [...new Set((user?.fcmTokens || []).filter(Boolean))].slice(0, 3);
  console.log(`User: ${uid} (${user?.firstName || ''} ${user?.lastName || ''})`);
  console.log(`FCM tokens: ${tokens.length}`);

  if (tokens.length === 0) {
    console.error('No FCM tokens registered for this user. Enable notifications in Profile on a device first.');
    process.exit(1);
  }

  const title = 'Test notification';
  const message = 'Push delivery test from em. — if you see this, notifications are working.';
  const relatedUrl = '/';

  const notifRef = db.collection('notifications').doc();
  await notifRef.set({
    title,
    message,
    type: 'reminder',
    isGlobal: false,
    userId: uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    readBy: [],
    relatedUrl,
  });

  const response = await messaging.sendEachForMulticast({
    tokens,
    data: {
      title,
      body: message,
      icon: '/icon-192x192-v4.png',
      tag: notifRef.id,
      link: relatedUrl,
      badge: '1',
    },
    apns: {
      headers: { 'apns-priority': '10' },
      payload: {
        aps: {
          alert: { title, body: message },
          badge: 1,
          sound: 'default',
        },
      },
    },
    webpush: { fcm_options: { link: relatedUrl } },
  });

  console.log(`Notification doc: ${notifRef.id}`);
  console.log(`Delivered: ${response.successCount} success, ${response.failureCount} failure`);
  response.responses.forEach((res, i) => {
    if (!res.success) console.error(`  token[${i}]: ${res.error?.code} — ${res.error?.message}`);
  });

  if (response.successCount === 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
