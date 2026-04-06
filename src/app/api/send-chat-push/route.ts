
import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb, getAdminMessaging } from '@/lib/firebase-admin';
import { FieldPath, type Firestore } from 'firebase-admin/firestore';
import { type MulticastMessage, type Messaging } from 'firebase-admin/messaging';
import type { UserProfileData, Chat, ChatMessage } from '@/types';
import { getMillis, isChatUnread } from '@/lib/notification-utils';

/**
 * Forcefully converts all values in a record to strings to create a safe FCM data payload.
 */
function toSafeStringMap(input: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    out[key] = String(value ?? '');
  }
  return out;
}

/**
 * Calculates the total unread count for a given user across all chats and notifications.
 */
async function calculateTotalUnread(userId: string, db: Firestore): Promise<number> {
    try {
        // 1. Unread System Notifications (Checking readBy array, limited to last 30 days for performance)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const notificationsSnapshot = await db.collection('notifications')
            .where('createdAt', '>=', thirtyDaysAgo)
            .get();
            
        let unreadNotifications = 0;
        notificationsSnapshot.forEach((doc: any) => {
            const data = doc.data();
            const readBy = Array.isArray(data.readBy) ? data.readBy : [];
            const isTargetUser = data.isGlobal || data.userId === userId || data.type === 'announcement';
            if (isTargetUser && !readBy.includes(userId)) {
                unreadNotifications++;
            }
        });

        // 2. Unread Chats (using memberSeen)
        const chatsSnapshot = await db.collection('chats').where('members', 'array-contains', userId).get();
        let unreadChats = 0;
        chatsSnapshot.forEach((doc: any) => {
            const chat = { id: doc.id, ...doc.data() } as Chat;
            if (isChatUnread(chat, userId)) {
                unreadChats++;
            }
        });

        return unreadNotifications + unreadChats;
    } catch (error) {
        console.error(`[calculateTotalUnread] Error for ${userId}:`, error);
        return 0; // Default to 0 on error
    }
}

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
    
    // Check if recipients are active in the chat to avoid redundant pushes (10 second window)
    const tenSecondsAgo = Date.now() - 10000;
    const recipientIds = allRecipientIds.filter(uid => {
        const lastSeen = chat.memberSeen?.[uid];
        return !lastSeen || getMillis(lastSeen) < tenSecondsAgo;
    });

    if (recipientIds.length === 0) {
        return { success: 0, failure: 0, reason: "All recipients are currently active." };
    }

    // Get FCM tokens for the recipients
    const usersSnapshot = await adminDb.collection('users').where(FieldPath.documentId(), 'in', recipientIds).get();
    
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
    for (let i = 0; i < usersSnapshot.docs.length; i++) {
        const docSnapshot = usersSnapshot.docs[i];
        const userId = docSnapshot.id;
        const user = docSnapshot.data() as UserProfileData;
        
        if (user.fcmTokens && Array.isArray(user.fcmTokens) && user.fcmTokens.length > 0) {
            console.log(`[send-chat-push] Calculating unread for user: ${userId}`);
            const badgeCount = await calculateTotalUnread(userId, adminDb);
            const tokensSet = [...new Set(user.fcmTokens)].filter(Boolean);
            
            console.log(`[send-chat-push] Sending to ${tokensSet.length} tokens. Badge: ${badgeCount}`);

            const payload = {
              tokens: tokensSet,
              notification: {
                title: title,
                body: bodyText,
              },
              data: toSafeStringMap({
                title: title,
                body: bodyText,
                icon: '/icon.svg',
                tag: String(chat.id),
                link: `/chat/${chat.id}`,
              }),
              apns: {
                payload: {
                  aps: {
                     badge: badgeCount,
                     sound: 'default'
                  }
                }
              },
              webpush: {
                notification: {
                  icon: '/icon.svg',
                  badge: '/icon.svg',
                  tag: String(chat.id),
                  data: {
                    link: `/chat/${chat.id}`
                  }
                },
                fcm_options: {
                  link: `/chat/${chat.id}`
                }
              }
            };
            
            const response = await adminMessaging.sendEachForMulticast(payload as any);
            console.log(`[send-chat-push] Result for ${userId}: ${response.successCount} success, ${response.failureCount} failure`);
            totalSuccessCount += response.successCount;
            totalFailureCount += response.failureCount;
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

    const { chatId } = body;
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

        const result = await sendNotifications(chat, latestMessage, adminDb, adminMessaging);
        return NextResponse.json({ success: true, delivered: result.success });

    } catch (error: any) {
        console.error('Error sending chat push notification:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
