
import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb, getAdminMessaging } from '@/lib/firebase-admin';
import { FieldPath, FieldValue, type Firestore } from 'firebase-admin/firestore';
import { type Messaging } from 'firebase-admin/messaging';
import type { UserProfileData, Chat, ChatMessage } from '@/types';
import { calculateTotalUnread, toSafeStringMap } from '@/lib/server-badge-utils';


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
    
    // Extract recipient UIDs and ensure they are strings.
    const allRecipientIds = (chat.members || [])
        .map(m => (typeof m === 'string' ? m : (m as any).uid))
        .filter(uid => typeof uid === 'string' && uid !== senderId);

    if (allRecipientIds.length === 0) {
        return { success: 0, failure: 0, reason: "No recipients for this message." };
    }
    
    // Always send push to all non-sender members. The client-side foreground handler
    // (onMessage in app-layout.tsx) already suppresses the notification popup when
    // the user is currently viewing this specific chat.
    const recipientIds = allRecipientIds;

    // Get FCM tokens for the recipients (batch in chunks of 30 — Firestore `in` query limit)
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

    // Send individualized notifications to support correct unread counts (badges)
    for (let i = 0; i < userDocs.length; i++) {
        const docSnapshot = userDocs[i];
        const userId = docSnapshot.id;
        const user = docSnapshot.data() as UserProfileData;
        
        if (user.fcmTokens && Array.isArray(user.fcmTokens) && user.fcmTokens.length > 0) {
            console.log(`[send-chat-push] Calculating unread for user: ${userId}`);
            const badgeCount = await calculateTotalUnread(userId, adminDb);

            // Prune tokens to the most recent 3, matching the client-side limit.
            const rawTokens = Array.isArray(user.fcmTokens) ? user.fcmTokens : [];
            const tokensSet = [...new Set(rawTokens)].filter(Boolean);
            const prunedTokens = tokensSet.slice(0, 3);
            
            console.log(`[send-chat-push] Sending to ${prunedTokens.length} tokens (pruned from ${tokensSet.length}). Badge: ${badgeCount}`);

            const payload = {
              tokens: prunedTokens,
              // DATA-ONLY: omitting top-level `notification` so Firebase SDK does NOT
              // auto-handle it and skips our onBackgroundMessage handler in the SW.
              // All display is controlled by the SW via the data fields below.
              data: toSafeStringMap({
                title: title,
                body: bodyText,
                icon: '/icon.svg',
                tag: String(chat.id),
                link: `/chat/${chat.id}`,
                badge: String(badgeCount), // Used by SW to update home screen badge when app is closed
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
                // No webpush.notification here — our firebase-messaging-sw.js
                // onBackgroundMessage handler controls display. Including
                // webpush.notification causes FCM to show a second generic
                // notification ("em." / "from em.") alongside ours.
                fcm_options: {
                  link: `/chat/${chat.id}`
                }
              }
            };
            
            const response = await adminMessaging.sendEachForMulticast(payload as any);
            console.log(`[send-chat-push] Result for ${userId}: ${response.successCount} success, ${response.failureCount} failure`);
            totalSuccessCount += response.successCount;
            totalFailureCount += response.failureCount;

            // --- Stale Token Cleanup ---
            // Remove any tokens FCM reports as invalid to prevent ever-growing zombie lists.
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
                    console.log(`[send-chat-push] Pruning ${staleTokens.length} stale tokens for user ${userId}`);
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

    const { chatId, senderId: senderIdOverride, text: textOverride } = body;
    if (!chatId) {
        return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
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

        const messagesQuery = chatDocRef.collection('messages').orderBy('createdAt', 'desc').limit(1);
        const messagesSnapshot = await messagesQuery.get();

        if (messagesSnapshot.empty) {
            return NextResponse.json({ success: true, delivered: 0, message: 'No messages in chat to notify for.' });
        }
        const latestMessage = { id: messagesSnapshot.docs[0].id, ...messagesSnapshot.docs[0].data() } as ChatMessage;
        
        // Allow callers (e.g. thread replies) to override sender/text so the notification
        // is correctly attributed instead of showing the original message author.
        if (senderIdOverride) (latestMessage as any).senderId = senderIdOverride;
        if (textOverride) (latestMessage as any).text = textOverride;

        const result = await sendNotifications(chat, latestMessage, adminDb, adminMessaging);
        return NextResponse.json({ success: true, delivered: result.success });

    } catch (error: any) {
        console.error('Error sending chat push notification:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
