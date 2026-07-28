import { FieldPath, FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import type { Chat, ChatMessage, UserProfileData } from '@/types';
import { calculateTotalUnread, toSafeStringMap } from '@/lib/server-badge-utils';
import { chatPushBadgeFields } from '@/lib/chat-push-badge';

const BADGE_TIMEOUT_MS = 2500;
const MAX_FCM_TOKENS = 5;
const FCM_SEND_ATTEMPTS = 4;
const FCM_RETRY_BASE_MS = 750;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientFcmError(error: unknown): boolean {
  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';
  const message = error instanceof Error ? error.message : String(error);
  return (
    /resource-exhausted|unavailable|internal|deadline-exceeded|quota/i.test(code) ||
    /429|RESOURCE_EXHAUSTED|UNAVAILABLE|quota|throttl/i.test(message)
  );
}

async function sendMulticastWithRetry(
  adminMessaging: Messaging,
  message: Parameters<Messaging['sendEachForMulticast']>[0],
) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= FCM_SEND_ATTEMPTS; attempt++) {
    try {
      return await adminMessaging.sendEachForMulticast(message);
    } catch (error) {
      lastError = error;
      if (!isTransientFcmError(error) || attempt === FCM_SEND_ATTEMPTS) {
        throw error;
      }
      await wait(FCM_RETRY_BASE_MS * attempt);
    }
  }
  throw lastError;
}

function chatPushLockId(chatId: string, messageId: string): string {
  return `${chatId}_${messageId}`;
}

/**
 * Prefer a real unread count. On timeout/error return null so callers omit badge
 * instead of wiping the home-screen badge with 0.
 */
export async function badgeCountWithTimeout(
  userId: string,
  db: Firestore,
  timeoutMs = BADGE_TIMEOUT_MS,
): Promise<number | null> {
  try {
    return await Promise.race([
      calculateTotalUnread(userId, db),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  } catch {
    return null;
  }
}

export { chatPushBadgeFields } from '@/lib/chat-push-badge';

async function getSenderDisplayName(senderId: string, chat: Chat, db: Firestore): Promise<string> {
  try {
    const userDoc = await db.collection('users').doc(senderId).get();
    if (userDoc.exists) {
      const userProfile = userDoc.data() as UserProfileData;
      if (userProfile.firstName) {
        const fullName = `${userProfile.firstName} ${userProfile.lastName || ''}`.trim();
        if (fullName) return fullName;
      }
    }
  } catch (error) {
    console.error(`[server-chat-push] Error fetching sender profile for ${senderId}:`, error);
  }

  const senderInfoFromChat = chat.memberInfo?.[senderId];
  if (senderInfoFromChat?.firstName) {
    const fullName = `${senderInfoFromChat.firstName || ''} ${senderInfoFromChat.lastName || ''}`.trim();
    if (fullName) return fullName;
  }

  return 'Someone';
}

async function tryClaimPushLock(adminDb: Firestore, chatId: string, messageId: string): Promise<boolean> {
  const lockRef = adminDb.collection('chatPushLocks').doc(chatPushLockId(chatId, messageId));

  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(lockRef);
      if (snap.exists) {
        throw new Error('ALREADY_CLAIMED');
      }
      tx.create(lockRef, {
        chatId,
        messageId,
        claimedAt: FieldValue.serverTimestamp(),
      });
    });
    return true;
  } catch (error) {
    if (error instanceof Error && error.message === 'ALREADY_CLAIMED') {
      return false;
    }
    throw error;
  }
}

async function releasePushLock(adminDb: Firestore, chatId: string, messageId: string): Promise<void> {
  const lockRef = adminDb.collection('chatPushLocks').doc(chatPushLockId(chatId, messageId));
  await lockRef.delete().catch(() => {});
}

async function markPushDelivered(
  adminDb: Firestore,
  chatId: string,
  messageId: string,
  delivered: number,
): Promise<void> {
  const lockRef = adminDb.collection('chatPushLocks').doc(chatPushLockId(chatId, messageId));
  await lockRef.set(
    {
      delivered,
      sentAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  // Best-effort metadata on the message itself (may not exist yet on first attempt).
  await adminDb
    .collection('chats')
    .doc(chatId)
    .collection('messages')
    .doc(messageId)
    .set({ chatPushSentAt: FieldValue.serverTimestamp() }, { merge: true })
    .catch(() => {});
}

export type ChatPushRequest = {
  chatId: string;
  messageId: string;
  senderId: string;
  text: string;
};

export type ChatPushResult = {
  success: number;
  failure: number;
  alreadySent?: boolean;
  reason?: string;
  /** True when delivery should be retried by the client. */
  retryable?: boolean;
};

export async function deliverChatPush(
  request: ChatPushRequest,
  adminDb: Firestore,
  adminMessaging: Messaging,
): Promise<ChatPushResult> {
  const { chatId, messageId, senderId, text } = request;

  const claimed = await tryClaimPushLock(adminDb, chatId, messageId);
  if (!claimed) {
    return { success: 0, failure: 0, alreadySent: true };
  }

  try {
    const chatDoc = await adminDb.collection('chats').doc(chatId).get();
    if (!chatDoc.exists) {
      await releasePushLock(adminDb, chatId, messageId);
      return { success: 0, failure: 0, reason: 'Chat not found', retryable: true };
    }

    const chat = { id: chatDoc.id, ...chatDoc.data() } as Chat;
    const recipientIds = (chat.members || [])
      .map((m) => (typeof m === 'string' ? m : (m as { uid?: string }).uid))
      .filter((uid): uid is string => typeof uid === 'string' && uid !== senderId);

    if (recipientIds.length === 0) {
      await markPushDelivered(adminDb, chatId, messageId, 0);
      return { success: 0, failure: 0, reason: 'No recipients for this message.' };
    }

    const userDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    for (let i = 0; i < recipientIds.length; i += 30) {
      const chunk = recipientIds.slice(i, i + 30);
      const snap = await adminDb.collection('users').where(FieldPath.documentId(), 'in', chunk).get();
      snap.docs.forEach((d) => userDocs.push(d));
    }

    const senderName = await getSenderDisplayName(senderId, chat, adminDb);
    const messageText = text || 'Sent a file';
    const title = chat.type === 'group' ? chat.name || 'Group Chat' : senderName;
    const bodyText = chat.type === 'group' ? `${senderName}: ${messageText}` : messageText;
    const notificationTag = String(messageId);

    let recipientsWithTokens = 0;

    const recipientResults = await Promise.all(
      userDocs.map(async (docSnapshot) => {
        const userId = docSnapshot.id;
        const user = docSnapshot.data() as UserProfileData;

        if (!user.fcmTokens?.length) {
          return { success: 0, failure: 0 };
        }

        recipientsWithTokens += 1;
        const badgeCount = await badgeCountWithTimeout(userId, adminDb);
        const { dataBadge, apnsBadge } = chatPushBadgeFields(badgeCount);
        const prunedTokens = [...new Set(user.fcmTokens)].filter(Boolean).slice(0, MAX_FCM_TOKENS);

        const dataPayload: Record<string, unknown> = {
          title,
          body: bodyText,
          icon: '/icon-192x192-v4.png',
          tag: notificationTag,
          messageId: notificationTag,
          link: `/chat/${chat.id}`,
        };
        if (dataBadge != null) {
          dataPayload.badge = dataBadge;
        }

        const aps: Record<string, unknown> = {
          alert: { title, body: bodyText },
          sound: 'default',
          'mutable-content': 1,
          'content-available': 1,
        };
        if (apnsBadge != null) {
          aps.badge = apnsBadge;
        }

        const payload = {
          tokens: prunedTokens,
          data: toSafeStringMap(dataPayload),
          apns: {
            headers: { 'apns-priority': '10' },
            payload: { aps },
          },
          webpush: {
            fcm_options: { link: `/chat/${chat.id}` },
          },
        };

        const response = await sendMulticastWithRetry(
          adminMessaging,
          payload as Parameters<Messaging['sendEachForMulticast']>[0],
        );

        if (response.failureCount > 0) {
          const staleTokens: string[] = [];
          response.responses.forEach((res, idx) => {
            if (!res.success) {
              const code = res.error?.code || '';
              if (
                code === 'messaging/registration-token-not-registered' ||
                code === 'messaging/invalid-registration-token' ||
                code === 'messaging/invalid-argument'
              ) {
                staleTokens.push(prunedTokens[idx]);
              }
            }
          });
          if (staleTokens.length > 0) {
            await adminDb.collection('users').doc(userId).update({
              fcmTokens: FieldValue.arrayRemove(...staleTokens),
            });
          }
        }

        return { success: response.successCount, failure: response.failureCount };
      }),
    );

    const result = recipientResults.reduce(
      (totals, current) => ({
        success: totals.success + current.success,
        failure: totals.failure + current.failure,
      }),
      { success: 0, failure: 0 },
    );

    if (result.success > 0) {
      await markPushDelivered(adminDb, chatId, messageId, result.success);
      return result;
    }

    // Nobody has tokens — nothing to retry; mark complete.
    if (recipientsWithTokens === 0) {
      await markPushDelivered(adminDb, chatId, messageId, 0);
      return { ...result, reason: 'No push tokens' };
    }

    // Tokens exist but FCM delivered nothing — release lock so client/cron can retry.
    await releasePushLock(adminDb, chatId, messageId);
    return { ...result, reason: 'Delivery failed', retryable: true };
  } catch (error) {
    await releasePushLock(adminDb, chatId, messageId);
    throw error;
  }
}

/** @deprecated Use deliverChatPush with explicit text instead. */
export async function deliverChatPushFromMessage(
  chat: Chat,
  message: ChatMessage,
  adminDb: Firestore,
  adminMessaging: Messaging,
): Promise<ChatPushResult> {
  return deliverChatPush(
    {
      chatId: chat.id,
      messageId: String(message.id),
      senderId: message.senderId,
      text: message.text ?? 'Sent a file',
    },
    adminDb,
    adminMessaging,
  );
}
