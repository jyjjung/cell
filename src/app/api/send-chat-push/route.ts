
import { type NextRequest, NextResponse } from 'next/server';
import type { App as FirebaseAdminApp } from 'firebase-admin/app';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldPath, type Firestore } from 'firebase-admin/firestore';
import { getMessaging, type MulticastMessage, type Messaging } from 'firebase-admin/messaging';
import type { UserProfileData, Chat, ChatMessage, ChatMemberInfo } from '@/types';

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


// --- Firebase Admin Initialization ---

function initializeAdminApp(): FirebaseAdminApp {
  const existingApp = getApps().find(app => app.name === 'firebase-admin-app-chat-push');
  if (existingApp) {
    return existingApp;
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error('[Admin Init] CRITICAL: FIREBASE_SERVICE_ACCOUNT_KEY is not defined.');
  }

  try {
    const credential = cert(JSON.parse(serviceAccountKey));
    return initializeApp({ credential }, 'firebase-admin-app-chat-push');
  } catch (e: any) {
    throw new Error(`[Admin Init] CRITICAL: Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY or initialize app. Error: ${e.message}`);
  }
}

// --- Helper Functions ---
async function getSenderDisplayName(senderId: string, chat: Chat, db: Firestore): Promise<string> {
    try {
        const userDocRef = db.collection('users').doc(senderId);
        const userDoc = await userDocRef.get();

        if (userDoc.exists()) {
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

async function sendNotifications(chat: Chat, message: ChatMessage, adminDb: Firestore, adminMessaging: Messaging) {
    const senderId = message.senderId;
    const allRecipientIds = chat.members.filter(uid => uid !== senderId);

    if (allRecipientIds.length === 0) {
        return { success: 0, failure: 0, reason: "No recipients for this message." };
    }
    
    // Check if recipients are active in the chat to avoid redundant pushes
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
    
    const allTokens: string[] = [];
    for (let i = 0; i < usersSnapshot.docs.length; i++) {
        const doc = usersSnapshot.docs[i];
        const user = doc.data() as UserProfileData;
        if (user.fcmTokens && Array.isArray(user.fcmTokens)) {
            allTokens.push(...user.fcmTokens);
        }
    }

    const uniqueTokens = [...new Set(allTokens)].filter(Boolean);

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
      icon: '/icon.svg',
      tag: String(chat.id),
      link: `/chat/${chat.id}`,
    };

    const safeData = toSafeStringMap(rawData);
    const messagePayload: MulticastMessage = {
      tokens: uniqueTokens,
      data: safeData
    };
    
    assertStringMap(messagePayload.data!);
    const response = await adminMessaging.sendEachForMulticast(messagePayload);
    
    return { success: response.successCount, failure: response.failureCount };
}

export async function POST(request: NextRequest) {
    const body = await request.json();
    const { chatId } = body;
    if (!chatId) {
        return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
    }

    try {
        const adminApp = initializeAdminApp();
        const adminDb = getFirestore(adminApp);
        const adminMessaging = getMessaging(adminApp);

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
