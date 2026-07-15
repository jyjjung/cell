
import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb, getAdminMessaging } from '@/lib/firebase-admin';
import { FieldPath, FieldValue, type Firestore } from 'firebase-admin/firestore';
import { type Messaging } from 'firebase-admin/messaging';
import type { UserProfileData, Chat, ChatMessage } from '@/types';
import { calculateTotalUnread, toSafeStringMap } from '@/lib/server-badge-utils';
import { isAuthError, verifyAuthToken } from '@/lib/api-auth';


async function getSenderDisplayName(senderId: string, chat: Chat, db: Firestore): Promise<string> {
    try {
        const userDocRef = db.collection('users').doc(senderId);
        const userDoc = await userDocRef.get();

        if (userDoc.exists) {
            const userProfile = userDoc.data() as UserProfileData;
            if (userProfile.firstName) {
                const fullName = `${userProfile.firstName} ${userProfile.lastName || ''}`.trim();
                if (fullName) return fullName;
            }
        }
    } catch (error) {
        console.error(`[getSenderDisplayName] Error fetching user profile for ${senderId}:`, error);
    }

    const senderInfoFromChat = chat.memberInfo?.[senderId];
    if (senderInfoFromChat) {
        if (senderInfoFromChat.firstName) {
            const fullName = `${senderInfoFromChat.firstName || ''} ${senderInfoFromChat.lastName || ''}`.trim();
            if (fullName) return fullName;
        }
    }

    return 'Someone';
}

async function sendNotifications(chat: Chat, message: ChatMessage, adminDb: Firestore, adminMessaging: Messaging) {
    const senderId = message.senderId;
    
    const allRecipientIds = (chat.members || [])
        .map(m => (typeof m === 'string' ? m : (m as { uid?: string }).uid))
        .filter((uid): uid is string => typeof uid === 'string' && uid !== senderId);

    if (allRecipientIds.length === 0) {
        return { success: 0, failure: 0, reason: "No recipients for this message." };
    }
    
    const recipientIds = allRecipientIds;

    const userDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    for (let i = 0; i < recipientIds.length; i += 30) {
        const chunk = recipientIds.slice(i, i + 30);
        const snap = await adminDb.collection('users').where(FieldPath.documentId(), 'in', chunk).get();
        snap.docs.forEach(d => userDocs.push(d));
    }
    
    const senderName = await getSenderDisplayName(message.senderId, chat, adminDb);
    const messageText = message.text ?? 'Sent a file';

    let title: string;
    let bodyText: string;

    if (chat.type === 'group') {
        title = chat.name || 'Group Chat';
        bodyText = `${senderName}: ${messageText}`;
    } else { 
        title = senderName;
        bodyText = messageText;
    }

    let totalSuccessCount = 0;
    let totalFailureCount = 0;

    for (let i = 0; i < userDocs.length; i++) {
        const docSnapshot = userDocs[i];
        const userId = docSnapshot.id;
        const user = docSnapshot.data() as UserProfileData;
        
        if (user.fcmTokens && Array.isArray(user.fcmTokens) && user.fcmTokens.length > 0) {
            const badgeCount = await calculateTotalUnread(userId, adminDb);

            const rawTokens = Array.isArray(user.fcmTokens) ? user.fcmTokens : [];
            const tokensSet = [...new Set(rawTokens)].filter(Boolean);
            // Send to all stored tokens (capped) — skipping extras left stale devices "opted in" but silent.
            const prunedTokens = tokensSet.slice(0, 5);

            const payload = {
              tokens: prunedTokens,
              data: toSafeStringMap({
                title: title,
                body: bodyText,
                icon: '/icon-192x192-v4.png',
                tag: String(chat.id),
                link: `/chat/${chat.id}`,
                badge: String(badgeCount),
              }),
              apns: {
                headers: {
                  'apns-priority': '10',
                },
                payload: {
                  aps: {
                     alert: {
                       title: title,
                       body: bodyText,
                     },
                     badge: badgeCount,
                     sound: 'default',
                     'mutable-content': 1,
                     'content-available': 1
                  }
                }
              },
              webpush: {
                fcm_options: {
                  link: `/chat/${chat.id}`
                }
              }
            };
            
            const response = await adminMessaging.sendEachForMulticast(payload as Parameters<Messaging['sendEachForMulticast']>[0]);
            totalSuccessCount += response.successCount;
            totalFailureCount += response.failureCount;

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
                        fcmTokens: FieldValue.arrayRemove(...staleTokens)
                    });
                }
            }
        }
    }

    return { success: totalSuccessCount, failure: totalFailureCount };
}

export async function POST(request: NextRequest) {
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const authResult = await verifyAuthToken(request);
    if (isAuthError(authResult)) return authResult;

    const { chatId, messageId, senderId: senderIdOverride, text: textOverride } = body;
    if (!chatId || !messageId) {
        return NextResponse.json({ error: 'chatId and messageId are required' }, { status: 400 });
    }

    try {
        const adminApp = getAdminApp();
        const adminDb = getAdminDb(adminApp);
        const adminMessaging = getAdminMessaging(adminApp);

        const chatDocRef = adminDb.collection('chats').doc(chatId);
        const chatDoc = await chatDocRef.get();

        if (!chatDoc.exists) {
            return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
        }
        const chat = { id: chatDoc.id, ...chatDoc.data() } as Chat;

        const members = (chat.members || []).map((m) => (typeof m === 'string' ? m : (m as { uid?: string }).uid));
        if (!members.includes(authResult.uid)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const messageDoc = await chatDocRef.collection('messages').doc(messageId).get();
        if (!messageDoc.exists) {
            return NextResponse.json({ error: 'Message not found' }, { status: 404 });
        }

        const targetMessage = { id: messageDoc.id, ...messageDoc.data() } as ChatMessage;
        const effectiveSenderId = typeof senderIdOverride === 'string' ? senderIdOverride : targetMessage.senderId;

        if (effectiveSenderId !== authResult.uid) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (typeof textOverride === 'string') {
            targetMessage.text = textOverride;
        }
        targetMessage.senderId = effectiveSenderId;

        const result = await sendNotifications(chat, targetMessage, adminDb, adminMessaging);
        return NextResponse.json({ success: true, delivered: result.success });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error sending chat push notification:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
    }
}
