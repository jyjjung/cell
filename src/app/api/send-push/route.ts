
import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb, getAdminMessaging } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { AppNotification, UserProfileData } from '@/types';
import { calculateTotalUnread, toSafeStringMap } from '@/lib/server-badge-utils';


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
        
        // Prune tokens to the most recent 3, matching the client-side limit.
        const rawTokens = Array.isArray(targetUser.tokens) ? targetUser.tokens : [];
        const uniqueTokens = [...new Set(rawTokens)].filter(Boolean);
        const prunedTokens = uniqueTokens.slice(0, 3);
        
        console.log(`[send-push] Sending push to ${prunedTokens.length} tokens (pruned from ${uniqueTokens.length}). Badge: ${badgeCount}`);

        const message = {
          tokens: prunedTokens,
          // DATA-ONLY: omitting top-level `notification` so Firebase's auto-handling
          // is skipped and our onBackgroundMessage SW handler always fires.
          data: toSafeStringMap({
            title: notification.title || 'New Notification',
            body: notification.message || '',
            icon: '/icon.svg',
            tag: notification.id,
            link: notification.relatedUrl || '/',
            badge: String(badgeCount), // Used by SW to update home screen badge when app is closed
          }),
          apns: {
            headers: {
              'apns-priority': '10',
            },
            payload: {
              aps: {
                alert: {
                  title: notification.title || 'New Notification',
                  body: notification.message || '',
                },
                badge: badgeCount,
                sound: 'default',
                'mutable-content': 1,
                'content-available': 1
              }
            }
          },
          webpush: {
            // No webpush.notification — SW onBackgroundMessage controls display.
            // webpush.notification triggers a second generic notification from FCM.
            fcm_options: {
              link: notification.relatedUrl || '/'
            }
          }
        };

        const response = await adminMessaging.sendEachForMulticast(message as any);
        console.log(`[send-push] Result for ${targetUser.userId}: ${response.successCount} success, ${response.failureCount} failure`);
        totalSuccess += response.successCount;

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
                console.log(`[send-push] Pruning ${staleTokens.length} stale tokens for user ${targetUser.userId}`);
                await adminDb.collection('users').doc(targetUser.userId).update({
                    fcmTokens: FieldValue.arrayRemove(...staleTokens)
                });
            }
        }
    }

    return NextResponse.json({ success: true, delivered: totalSuccess });

  } catch (error: any) {
    console.error('Error sending push notification:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
