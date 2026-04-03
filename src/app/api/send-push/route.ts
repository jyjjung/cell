
import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb, getAdminMessaging } from '@/lib/firebase-admin';
import type { AppNotification, UserProfileData, Chat } from '@/types';
import { FieldPath, type Firestore } from 'firebase-admin/firestore';
import { type Messaging } from 'firebase-admin/messaging';

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
 * Server-side calculation of a user's total unread count (Chats + Alerts).
 */
async function calculateTotalUnread(userId: string, db: Firestore): Promise<number> {
    try {
        const notificationsSnapshot = await db.collection('notifications')
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();
            
        let unreadAlerts = 0;
        notificationsSnapshot.forEach(doc => {
            const data = doc.data();
            const readBy = Array.isArray(data.readBy) ? data.readBy : [];
            if (!readBy.includes(userId)) unreadAlerts++;
        });

        const chatsSnapshot = await db.collection('chats').where('members', 'array-contains', userId).get();
        let unreadChats = 0;
        chatsSnapshot.forEach(doc => {
            const chat = doc.data() as Chat;
            if (!chat.lastMessageSentAt || !chat.lastMessageSenderId) return;
            if (chat.lastMessageSenderId === userId) return;
            const lastSeen = chat.memberSeen?.[userId];
            if (getMillis(chat.lastMessageSentAt) > getMillis(lastSeen)) unreadChats++;
        });

        return unreadAlerts + unreadChats;
    } catch (error) {
        console.error(`[calculateTotalUnread] Error for user ${userId}:`, error);
        return 0;
    }
}

export async function POST(request: NextRequest) {
  try {
    const { notificationId } = await request.json();

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    const adminApp = getAdminApp();
    const adminDb = getAdminDb(adminApp);
    const adminMessaging = getAdminMessaging(adminApp);
      
    const notifDocRef = adminDb.collection('notifications').doc(notificationId);
    const notifDoc = await notifDocRef.get();

    if (!notifDoc.exists) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    const notification = { id: notifDoc.id, ...notifDoc.data() } as AppNotification;

    let targetUserIds: string[] = [];
    if (notification.isGlobal) {
      const usersSnapshot = await adminDb.collection('users').get();
      targetUserIds = usersSnapshot.docs.map(doc => doc.id);
    } else if (notification.userId) {
      targetUserIds = [notification.userId];
    }

    let totalSuccess = 0;
    let totalFailure = 0;

    for (const userId of targetUserIds) {
        try {
            const userDoc = await adminDb.collection('users').doc(userId).get();
            if (!userDoc.exists) continue;
            
            const user = userDoc.data() as UserProfileData;
            const userTokens = (user.fcmTokens || []).slice(0, 3).filter(Boolean);
            
            if (userTokens.length === 0) continue;

            const badgeCount = await calculateTotalUnread(userId, adminDb);
            const title = notification.title || 'New Notification';
            const body = notification.message || '';
            const originUrl = 'https://ndcem.vercel.app';
            console.log(`[FCM] User ${userId} has ${userTokens.length} tokens. Badge: ${badgeCount}`);

            for (const token of userTokens) {
                try {
                    const payload = {
                      token: token,
                      notification: { title, body },
                      data: toSafeStringMap({
                        title,
                        body,
                        icon: `${originUrl}/icon-192x192-v3.png`,
                        tag: notification.id,
                        link: notification.relatedUrl || '/',
                        badge: String(badgeCount),
                      }),
                      webpush: {
                          notification: {
                              title,
                              body,
                              icon: `${originUrl}/icon-192x192-v3.png`,
                              badge: `${originUrl}/icon-192x192-v3.png`,
                              tag: notification.id,
                          },
                          fcmOptions: {
                              link: notification.relatedUrl || '/',
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

                    await adminMessaging.send(payload);
                    totalSuccess++;
                } catch (tokenErr: any) {
                    console.warn(`[FCM Fail] Token failed for user ${userId}:`, tokenErr.code || tokenErr.message);
                    
                    // Auto-Prune Stale Tokens
                    if (tokenErr.code === 'messaging/registration-token-not-registered' || 
                        tokenErr.code === 'messaging/invalid-registration-token') {
                        console.log(`[FCM Prune] Removing stale token for user ${userId}`);
                        try {
                            // Import FieldValue dynamically if needed or use from adminDb
                            const { FieldValue } = require('firebase-admin/firestore');
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
            console.error(`[send-push] Failed for user ${userId}:`, err);
            totalFailure++;
        }
    }
    
    return NextResponse.json({ success: true, delivered: totalSuccess, failed: totalFailure });

  } catch (error: any) {
    console.error('Error sending push notification:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
