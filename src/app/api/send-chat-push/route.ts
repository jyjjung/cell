
import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb, getAdminMessaging } from '@/lib/firebase-admin';
import { FieldPath, FieldValue, type Firestore } from 'firebase-admin/firestore';
import { type MulticastMessage, type Messaging } from 'firebase-admin/messaging';
import type { UserProfileData, Chat, ChatMessage } from '@/types';
import { getMillis, isChatUnread } from '@/lib/notification-utils';

// --- Strict FCM Payload Utilities ---

/**
 * Forcefully converts all values in a record to strings to create a safe FCM data payload.
 * Nullish values become empty strings.
 */
function toSafeStringMap(input: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    out[key] = String(value ?? '');
  }
  return out;
}


/**
 * Asserts that all values in a record are strings. Throws a detailed error if not.
 */
function assertStringMap(data: Record<string, string>) {
  for (const [key, value] of Object.entries(data)) {
    if (typeof value !== 'string') {
      const errorDetail = {
        key: key,
        value: value,
        type: typeof value,
      };
      console.error('[FCM] PAYLOAD VALIDATION FAILED. Offending field:', JSON.stringify(errorDetail));
      throw new Error(`[FCM HARD FAIL] Payload integrity check failed: value for key "${key}" is not a string.`);
    }
  }
}


// --- Helper Functions ---
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


async function calculateTotalUnread(userId: string, db: Firestore): Promise<number> {
    try {
        // 1. Unread Notifications (Announcements/Alerts)
        // Optimization: Only check the most recent 20 notifications for badge status.
        const notificationsSnapshot = await db.collection('notifications')
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();
            
        let unreadAlerts = 0;
        notificationsSnapshot.forEach(doc => {
            const data = doc.data();
            const readBy = Array.isArray(data.readBy) ? data.readBy : [];
            if (!readBy.includes(userId)) {
                unreadAlerts++;
            }
        });

        // 2. Unread Chats
        const chatsSnapshot = await db.collection('chats').where('members', 'array-contains', userId).get();
        let unreadChats = 0;
        
        chatsSnapshot.forEach(doc => {
            const chat = doc.data() as Chat;
            if (isChatUnread(chat, userId)) {
                unreadChats++;
            }
        });

        return unreadAlerts + unreadChats;
    } catch (error) {
        console.error(`[calculateTotalUnread] Error for user ${userId}:`, error);
        return 0;
    }
}


// --- API Route Logic ---

async function sendNotifications(chat: Chat, message: ChatMessage, adminDb: Firestore, adminMessaging: Messaging, origin: string) {
    const senderId = message.senderId;
    
    // Identity Sanitization: Handle both plain string UIDs and Member objects.
    const recipientIds = chat.members
        .map(m => (typeof m === 'string' ? m : (m as any).uid))
        .filter(uid => typeof uid === 'string' && uid !== senderId);

    // Identity Tracking: Print IDs to verify the signal isn't "missing" the target.
    console.log(`[Identity] Sender: ${senderId}, Recipients: [${recipientIds.join(', ')}]`);

    if (recipientIds.length === 0) {
        return { success: 0, failure: 0, reason: "No recipients for this message." };
    }
    
    let senderName = 'Someone';
    try {
        senderName = await getSenderDisplayName(message.senderId, chat, adminDb);
    } catch (e) {
        console.error('[sendNotifications] Error fetching sender display name:', e);
    }

    const messageText = message.text ?? 'Sent a file';
    const cleanMessageText = messageText.trim() === '' ? 'Sent a file' : messageText;

    let title: string;
    let body: string;

    if (chat.type === 'group') {
        title = chat.name || 'Group Chat';
        body = `${senderName}: ${cleanMessageText}`;
    } else { 
        title = senderName;
        body = cleanMessageText;
    }

    // 4. Send Individual Notifications to each recipient with their specific unread count
    let totalSuccess = 0;
    let totalFailure = 0;

    for (const userId of recipientIds) {
        try {
            const userDoc = await adminDb.collection('users').doc(userId).get();
            if (!userDoc.exists) continue;
            
            const user = userDoc.data() as UserProfileData;
            const userTokens = (user.fcmTokens || []).slice(0, 3).filter(Boolean);
            
            if (userTokens.length === 0) {
                console.log(`[FCM] User ${userId} has 0 tokens. Skipping.`);
                continue;
            }

            // Calculate individualized unread count
            console.log(`[FCM Debug] Calculating unread for user: ${userId}`);
            const badgeCount = await calculateTotalUnread(userId, adminDb);
            const badgeString = String(badgeCount);
            const originUrl = origin;

            console.log(`[FCM Debug] Dispatching to ${userTokens.length} tokens for user ${userId}. Total unread: ${badgeCount}`);

            for (const token of userTokens) {
                try {
                    console.log(`[FCM Debug] Target token: ${token.substring(0, 10)}...`);
                    
                    const payload = {
                      token: token,
                      // We provide a 'data' block to ensure the Service Worker 'push' event fires reliably.
                      // Some browsers ignore the 'push' event if only the top-level 'notification' block is present.
                      data: toSafeStringMap({
                        title: title,
                        body: body,
                        icon: `${originUrl}/icon-192x192-v3.png`,
                        tag: String(message.id),
                        link: `/chat/${chat.id}`,
                        badge: badgeString,
                        timestamp: String(Date.now()),

                      }),
                      // Standard notification block for foreground/system handling
                      notification: {
                          title: title,
                          body: body,
                      },
                      webpush: {
                          notification: {
                              title: title,
                              body: body,
                              icon: `${originUrl}/icon-192x192-v3.png`,
                              badge: `${originUrl}/icon-192x192-v3.png`,

                              tag: String(message.id),
                          },
                          fcmOptions: {
                              link: `/chat/${chat.id}`,
                          }
                      },
                      apns: {
                          payload: {
                              aps: {
                                  badge: Number(badgeCount),
                                  sound: 'default',
                                  'content-available': 1
                              }
                          }
                      }
                    };

                    console.log(`[FCM Debug] Payload constructed. Sending via adminMessaging...`);
                    const response = await adminMessaging.send(payload);
                    console.log(`[FCM Debug] FCM Response: ${response}`);
                    totalSuccess++;
                } catch (tokenErr: any) {
                    console.warn(`[FCM Fail] Token failed for user ${userId}:`, tokenErr.code || tokenErr.message);
                    
                    // Auto-Prune Stale Tokens
                    if (tokenErr.code === 'messaging/registration-token-not-registered' || 
                        tokenErr.code === 'messaging/invalid-registration-token') {
                        console.log(`[FCM Prune] Removing stale token for user ${userId}`);
                        try {
                            await adminDb.collection('users').doc(userId).update({
                                fcmTokens: FieldValue.arrayRemove(token)
                            });
                        } catch (pruneErr) {
                            console.error(`[FCM Prune Fail] Failed to remove token for ${userId}:`, pruneErr);
                        }
                    }
                    totalFailure++;
                }
            }
        } catch (err) {
            console.error(`[sendNotifications] Failed for user ${userId}:`, err);
            totalFailure++;
        }
    }

    return { 
        success: totalSuccess, 
        failure: totalFailure, 
        recipientsProcessed: recipientIds.length
    };
}

export async function POST(request: NextRequest) {
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { chatId, messageId } = body;
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

        // Targeted Message Fetching: Use specific message if provided to avoid race conditions.
        let targetMessage: ChatMessage | null = null;
        if (messageId) {
            const messageDoc = await chatDocRef.collection('messages').doc(messageId).get();
            if (messageDoc.exists) {
                targetMessage = { id: messageDoc.id, ...messageDoc.data() } as ChatMessage;
            }
        }

        // Fallback to latest message if specific ID is missing or not found
        if (!targetMessage) {
            const messagesQuery = chatDocRef.collection('messages').orderBy('createdAt', 'desc').limit(1);
            const messagesSnapshot = await messagesQuery.get();
            if (!messagesSnapshot.empty) {
                targetMessage = { id: messagesSnapshot.docs[0].id, ...messagesSnapshot.docs[0].data() } as ChatMessage;
            }
        }

        if (!targetMessage) {
            return NextResponse.json({ success: true, delivered: 0, message: 'No message context found to notify for.' });
        }

        const result = await sendNotifications(chat, targetMessage, adminDb, adminMessaging, request.nextUrl.origin);
        
        if (result.reason) {
            console.log(`[PushSkip] Notification skipped: ${result.reason}`);
        }

        return NextResponse.json({ 
            success: true, 
            delivered: result.success,
            reason: result.reason,
            diagnostics: {
                recipients: result.recipientsProcessed || 0
            }
        });

    } catch (error: any) {
        console.error('[FCM Fatal] Error sending chat push notification:', error);
        return NextResponse.json({ 
            error: 'Internal Server Error', 
            message: error.message,
            stack: error.stack,
            code: error.code
        }, { status: 500 });
    }
}
