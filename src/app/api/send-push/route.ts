
import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb, getAdminMessaging } from '@/lib/firebase-admin';
import type { AppNotification, UserProfileData } from '@/types';

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

    let targetTokens: string[] = [];
    if (notification.isGlobal) {
      // Optimization: Fetch all users and filter locally to avoid complex index requirements for prototype
      const usersSnapshot = await adminDb.collection('users').get();
      usersSnapshot.forEach(doc => {
        const user = doc.data() as UserProfileData;
        if (user.fcmTokens && Array.isArray(user.fcmTokens) && user.fcmTokens.length > 0) {
          targetTokens.push(...user.fcmTokens);
        }
      });
    } else if (notification.userId) {
      const userDoc = await adminDb.collection('users').doc(notification.userId).get();
      if (userDoc.exists) {
        const user = userDoc.data() as UserProfileData;
        if (user.fcmTokens && Array.isArray(user.fcmTokens)) {
          targetTokens = user.fcmTokens;
        }
      }
    }

    const uniqueTokens = [...new Set(targetTokens)].filter(Boolean);

    if (uniqueTokens.length === 0) {
      return NextResponse.json({ success: true, delivered: 0 });
    }
    
    const message = {
      tokens: uniqueTokens,
      notification: {
        title: notification.title || 'New Notification',
        body: notification.message || '',
      },
      webpush: {
          notification: {
              title: notification.title || 'New Notification',
              body: notification.message || '',
              icon: `${request.nextUrl.origin}/icon-192x192.png`,
              tag: notification.id,
          },
          fcmOptions: {
              link: notification.relatedUrl || '/',
          }
      },
      data: toSafeStringMap({
        title: notification.title || 'New Notification',
        body: notification.message || '',
        icon: '/icon-192x192.png',
        tag: notification.id,
        link: notification.relatedUrl || '/',
      }),
    };
    
    const response = await adminMessaging.sendEachForMulticast(message);
    return NextResponse.json({ success: true, delivered: response.successCount });

  } catch (error: any) {
    console.error('Error sending push notification:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
