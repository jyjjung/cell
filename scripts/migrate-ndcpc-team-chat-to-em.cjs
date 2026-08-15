#!/usr/bin/env node
/**
 * Create the NDCPC managers team chat and migrate legacy ndcpcChatMessages into it.
 *
 * Usage:
 *   node scripts/migrate-ndcpc-team-chat-to-em.cjs
 *   node scripts/migrate-ndcpc-team-chat-to-em.cjs --apply --confirm-project=cell-abca4
 */
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const { resolveServiceAccount } = require('./lib/resolve-service-account.cjs');

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');
const confirmedProject = process.argv.find((a) => a.startsWith('--confirm-project='))?.split('=')[1];
const EM_PROJECT = 'cell-abca4';
const TEAM_CHAT_ID = 'ndcpc-team';
const TEAM_CHAT_NAME = 'Team chat';

if (APPLY && confirmedProject !== EM_PROJECT) {
  throw new Error(`Apply requires --confirm-project=${EM_PROJECT}`);
}

function hasManageAccess(user) {
  const caps = Array.isArray(user.capabilityKeys) ? user.capabilityKeys : [];
  return caps.includes('ndcpc.manage') || caps.includes('ndcpc.admin') || user.ndcpcRole === 'admin';
}

function mapMessage(id, data) {
  const seenByObj = data.seenBy && typeof data.seenBy === 'object' ? data.seenBy : {};
  const seenBy = Array.isArray(data.seenBy)
    ? data.seenBy
    : Object.keys(seenByObj);

  let replyToId;
  if (data.replyTo && typeof data.replyTo === 'object' && data.replyTo.messageId) {
    replyToId = data.replyTo.messageId;
  } else if (typeof data.replyTo === 'string') {
    replyToId = data.replyTo;
  }

  const out = {
    senderId: data.authorUid,
    text: typeof data.text === 'string' ? data.text : '',
    createdAt: data.createdAt || admin.firestore.FieldValue.serverTimestamp(),
    seenBy,
  };

  if (data.reactions && typeof data.reactions === 'object') {
    out.reactions = data.reactions;
  }
  if (replyToId) out.replyToId = replyToId;
  if (data.deleted === true || data.isDeleted === true) {
    out.isDeleted = true;
    out.deletedContentType = 'message';
  }

  return out;
}

async function main() {
  const creds = resolveServiceAccount();
  if (!creds) throw new Error('Missing Firebase service account credentials.');

  const projectId = creds.project_id || process.env.FIREBASE_PROJECT_ID || EM_PROJECT;
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail: creds.client_email,
        privateKey: creds.private_key,
      }),
    });
  }

  const db = admin.firestore();
  const usersSnap = await db.collection('users').get();
  const managers = usersSnap.docs.filter((d) => hasManageAccess(d.data()));
  const memberIds = managers.map((d) => d.id);
  const memberInfo = Object.fromEntries(
    managers.map((d) => {
      const u = d.data();
      return [
        d.id,
        {
          firstName: u.firstName,
          lastName: u.lastName,
          avatar: u.avatars?.ndcpc || u.avatar || { mode: 'initials', initials: 'U' },
        },
      ];
    }),
  );

  console.log(`Managers for team chat: ${memberIds.length}`);
  for (const d of managers) {
    const u = d.data();
    console.log(`  - ${u.firstName} ${u.lastName} (${d.id})`);
  }

  const messagesSnap = await db.collection('ndcpcChatMessages').orderBy('createdAt', 'asc').get();
  console.log(`Legacy messages: ${messagesSnap.size}`);

  let lastMessageText = 'Team chat ready.';
  let lastMessageSentAt = admin.firestore.FieldValue.serverTimestamp();
  let lastMessageSenderId = null;
  if (messagesSnap.size > 0) {
    const last = messagesSnap.docs[messagesSnap.size - 1].data();
    lastMessageText = (last.text || '').trim() || 'Team chat ready.';
    lastMessageSentAt = last.createdAt || lastMessageSentAt;
    lastMessageSenderId = last.authorUid || null;
  }

  const chatRef = db.collection('chats').doc(TEAM_CHAT_ID);
  const chatPayload = {
    type: 'group',
    name: TEAM_CHAT_NAME,
    appScope: 'ndcpc',
    ndcpcKind: 'team',
    members: memberIds,
    memberInfo,
    admins: [],
    lastMessageText,
    lastMessageSentAt,
    ...(lastMessageSenderId ? { lastMessageSenderId } : {}),
    memberSeen: {},
  };

  if (!APPLY) {
    console.log('Dry-run chat payload:', {
      ...chatPayload,
      memberInfo: `[${Object.keys(memberInfo).length} members]`,
      lastMessageSentAt: String(lastMessageSentAt),
    });
    for (const doc of messagesSnap.docs) {
      const mapped = mapMessage(doc.id, doc.data());
      console.log(`  msg ${doc.id}: ${mapped.senderId} → "${(mapped.text || '').slice(0, 50)}"`);
    }
    console.log(`Re-run with --apply --confirm-project=${EM_PROJECT}`);
    return;
  }

  const existing = await chatRef.get();
  if (existing.exists) {
    await chatRef.update({
      ...chatPayload,
      createdAt: existing.data().createdAt || admin.firestore.FieldValue.serverTimestamp(),
    });
  } else {
    await chatRef.set({
      ...chatPayload,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  let migrated = 0;
  let skipped = 0;
  for (const doc of messagesSnap.docs) {
    const dest = chatRef.collection('messages').doc(doc.id);
    const already = await dest.get();
    if (already.exists) {
      skipped += 1;
      continue;
    }
    await dest.set(mapMessage(doc.id, doc.data()));
    migrated += 1;
  }

  console.log(`Applied team chat. Migrated ${migrated} messages, skipped ${skipped} existing.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
