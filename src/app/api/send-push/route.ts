
import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb, getAdminMessaging } from '@/lib/firebase-admin';
import type { AppNotification, UserProfileData, Chat } from '@/types';
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
async function calculateTotalUnread(userId: string, db: any): Promise<number> {
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

    const usersToNotify: { userId: string, tokens: string[] }[] = [];

    if (notification.isGlobal) {
      const usersSnapshot = await adminDb.collection('users').get();
      usersSnapshot.forEach(doc => {
        const user = doc.data() as UserProfileData;
        if (user.fcmTokens && Array.isArray(user.fcmTokens) && user.fcmTokens.length > 0) {
            usersToNotify.push({ userId: doc.id, tokens: user.fcmTokens });
        }
      });
    } else if (notification.userId) {
      const userDoc = await adminDb.collection('users').doc(notification.userId).get();
      if (userDoc.exists) {
        const user = userDoc.data() as UserProfileData;
        if (user.fcmTokens && Array.isArray(user.fcmTokens) && user.fcmTokens.length > 0) {
            usersToNotify.push({ userId: notification.userId, tokens: user.fcmTokens });
        }
      }
    }

    if (usersToNotify.length === 0) {
      return NextResponse.json({ success: true, delivered: 0 });
    }
    
    let totalSuccess = 0;

    // Send individualized notifications to support correct unread counts (badges)
    for (const targetUser of usersToNotify) {
        console.log(`[send-push] Calculating unread for user: ${targetUser.userId}`);
        const badgeCount = await calculateTotalUnread(targetUser.userId, adminDb);
        const uniqueTokens = [...new Set(targetUser.tokens)].filter(Boolean);
        
        console.log(`[send-push] Sending push to ${uniqueTokens.length} tokens. Badge: ${badgeCount}`);

        const message = {
          tokens: uniqueTokens,
          notification: {
            title: notification.title || 'New Notification',
            body: notification.message || '',
          },
          data: toSafeStringMap({
            title: notification.title || 'New Notification',
            body: notification.message || '',
            icon: '/icon.svg',
            tag: notification.id,
            link: notification.relatedUrl || '/',
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
              tag: notification.id,
            },
            fcm_options: {
              link: notification.relatedUrl || '/'
            }
          }
        };

        const response = await adminMessaging.sendEachForMulticast(message as any);
        console.log(`[send-push] Result for ${targetUser.userId}: ${response.successCount} success, ${response.failureCount} failure`);
        totalSuccess += response.successCount;
    }

    return NextResponse.json({ success: true, delivered: totalSuccess });

  } catch (error: any) {
    console.error('Error sending push notification:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
