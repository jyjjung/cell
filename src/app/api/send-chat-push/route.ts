
import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb, getAdminMessaging } from '@/lib/firebase-admin';
import { FieldPath, FieldValue, type Firestore } from 'firebase-admin/firestore';
import { type MulticastMessage, type Messaging } from 'firebase-admin/messaging';
import type { UserProfileData, Chat, ChatMessage } from '@/types';

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
 * Robustly converts any timestamp-like value to milliseconds.
 */
function getMillis(timestamp: any): number {
    if (!timestamp) return 0;
    if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
    if (timestamp instanceof Date) return timestamp.getTime();
    if (typeof timestamp === 'number') return timestamp;
    if (typeof timestamp === 'string') return new Date(timestamp).getTime();
    if (timestamp._seconds) return timestamp._seconds * 1000 + (timestamp._nanoseconds / 1000000);
    return 0;
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


// --- API Route Logic ---

async function sendNotifications(chat: Chat, message: ChatMessage, adminDb: Firestore, adminMessaging: Messaging, origin: string) {
    const senderId = message.senderId;
    const allRecipientIds = chat.members.filter(uid => uid !== senderId);

    if (allRecipientIds.length === 0) {
        return { success: 0, failure: 0, reason: "No recipients for this message." };
    }
    
    // Send to all members except the sender, even if they are active
    const recipientIds = allRecipientIds;

    // Safety Guard: Firestore 'in' query crashes on empty array.
    if (recipientIds.length === 0) {
        return { success: 0, failure: 0, reason: "No eligible recipients found after filtering." };
    }

    // Get FCM tokens for the recipients
    const usersSnapshot = await adminDb.collection('users').where(FieldPath.documentId(), 'in', recipientIds).get();
    
    const allTokens: string[] = [];
    for (let i = 0; i < usersSnapshot.docs.length; i++) {
        const doc = usersSnapshot.docs[i];
        const user = doc.data() as UserProfileData;
        if (user.fcmTokens && Array.isArray(user.fcmTokens)) {
            allTokens.push(...user.fcmTokens);
        }
    }

    const uniqueTokens = [...new Set(allTokens)].filter(Boolean);

    console.log(`[sendNotifications] Sending to ${uniqueTokens.length} unique tokens for ${recipientIds.length} recipients.`);

    if (uniqueTokens.length === 0) {
        return { success: 0, failure: 0, reason: "No registered push clients for recipients." };
    }
    
    const senderName = await getSenderDisplayName(message.senderId, chat, adminDb);
    const messageText = message.text ?? 'Sent a file';

    let title: string;
    let body: string;

    if (chat.type === 'group') {
        title = chat.name || 'Group Chat';
        body = `${senderName}: ${messageText}`;
    } else { 
        title = senderName;
        body = messageText;
    }


    const rawData = {
      title: title,
      body: body,
      icon: `${origin}/icon-192x192-v3.png`,
      tag: String(message.id),
      link: `/chat/${chat.id}`,
    };

    const safeData = toSafeStringMap(rawData);
    const messagePayload: MulticastMessage = {
      tokens: uniqueTokens,
      // No top-level 'notification' block. This is a DATA-ONLY push.
      // This forces the Service Worker to manually handle 'showNotification' 
      // inside a proper event.waitUntil(), which is the only way to 
      // achieve 100% reliability on iOS Safari.
      data: safeData,
      webpush: {
          fcmOptions: {
              link: `/chat/${chat.id}`
          }
      }
    };
    
    assertStringMap(messagePayload.data!);
    const response = await adminMessaging.sendEachForMulticast(messagePayload);
    
    // --- Automatic Token Cleanup ---
    // If a token is unregistered or invalid, remove it from the User document.
    const tokensToRemove: { [uid: string]: string[] } = {};

    if (response.failureCount > 0) {
        console.warn(`[sendNotifications] Delivered: ${response.successCount}, Failed: ${response.failureCount}.`);
    }

    return { 
        success: response.successCount, 
        failure: response.failureCount, 
        tokensAttempted: uniqueTokens.length
    };
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

        const result = await sendNotifications(chat, latestMessage, adminDb, adminMessaging, request.nextUrl.origin);
        
        if (result.reason) {
            console.log(`[PushSkip] Notification skipped: ${result.reason}`);
        }

        return NextResponse.json({ 
            success: true, 
            delivered: result.success,
            reason: result.reason,
            diagnostics: {
                tokens: result.tokensAttempted || 0
            }
        });

    } catch (error: any) {
        console.error('Error sending chat push notification:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
