import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import { NDCPc_COLLECTIONS } from '@/lib/ndcpc/collections';
import type { UserProfileData } from '@/types';

const MAX_MESSAGES_SCAN = 100;
const MAX_FCM_TOKENS = 5;

async function getUnreadChatCount(db: Firestore, userId: string): Promise<number> {
  const snapshot = await db
    .collection(NDCPc_COLLECTIONS.chatMessages)
    .orderBy('createdAt', 'desc')
    .limit(MAX_MESSAGES_SCAN)
    .get();

  return snapshot.docs.filter((messageDoc) => {
    const message = messageDoc.data();
    if (message.deleted === true) return false;
    if (message.authorUid === userId) return false;
    return !message.seenBy?.[userId];
  }).length;
}

function ndcpcChatPrefEnabled(userData: UserProfileData | undefined): boolean {
  const pref = userData?.preferences?.notifications?.ndcpc?.chat;
  return pref !== false;
}

function hasNdcpcAccess(userData: UserProfileData | undefined): boolean {
  if (!userData?.isApproved) return false;
  return userData.access?.ndcpc === true;
}

export type NdcpcChatPushResult = {
  delivered: number;
  skipped: number;
  reason?: string;
};

export async function deliverNdcpcChatPush(
  input: { messageId: string; authorUid: string; authorName: string; text: string },
  db: Firestore,
  messaging: Messaging,
): Promise<NdcpcChatPushResult> {
  const { messageId, authorUid, authorName, text } = input;
  if (!text.trim()) {
    return { delivered: 0, skipped: 0, reason: 'Empty message' };
  }

  const lockRef = db.collection('ndcpcChatPushLocks').doc(messageId);
  const lockSnap = await lockRef.get();
  if (lockSnap.exists) {
    return { delivered: 0, skipped: 0, reason: 'Already sent' };
  }

  const usersSnap = await db.collection('users').get();
  const tokensByUser = new Map<string, string[]>();

  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id;
    if (userId === authorUid) continue;

    const userData = userDoc.data() as UserProfileData;
    if (userData.isApproved !== true) continue;
    if (!hasNdcpcAccess(userData)) continue;
    if (!ndcpcChatPrefEnabled(userData)) continue;

    const tokens = [...new Set(userData.fcmTokens ?? [])]
      .filter(Boolean)
      .slice(0, MAX_FCM_TOKENS);
    if (tokens.length === 0) continue;

    tokensByUser.set(userId, tokens);
  }

  if (tokensByUser.size === 0) {
    return { delivered: 0, skipped: 0, reason: 'No recipients' };
  }

  const body = text.length > 120 ? `${text.slice(0, 120)}…` : text;
  let delivered = 0;
  let skipped = 0;

  for (const [userId, tokens] of tokensByUser) {
    const badgeCount = await getUnreadChatCount(db, userId);
    const response = await messaging.sendEachForMulticast({
      tokens,
      data: {
        title: `${authorName} · NDC Preschool Chat`,
        body,
        url: '/ndcpc/chat',
        badge: String(badgeCount),
        tag: `ndcpc-chat-${messageId}`,
        icon: '/apps/ndcpc.png',
      },
      webpush: {
        headers: { Urgency: 'high' },
        fcmOptions: { link: '/ndcpc/chat' },
      },
    });

    delivered += response.successCount;
    skipped += response.failureCount;

    const staleTokens: string[] = [];
    response.responses.forEach((result, index) => {
      const code = result.error?.code;
      if (
        result.success ||
        !code ||
        ![
          'messaging/registration-token-not-registered',
          'messaging/invalid-registration-token',
          'messaging/invalid-argument',
        ].includes(code)
      ) {
        return;
      }
      staleTokens.push(tokens[index]!);
    });

    if (staleTokens.length > 0) {
      await db.collection('users').doc(userId).update({
        fcmTokens: FieldValue.arrayRemove(...staleTokens),
      });
    }
  }

  await lockRef.set({
    messageId,
    authorUid,
    sentAt: FieldValue.serverTimestamp(),
    delivered,
  });

  return { delivered, skipped };
}
