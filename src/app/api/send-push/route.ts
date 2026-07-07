
import { type NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp, getAdminDb, getAdminMessaging } from '@/lib/firebase-admin';
import type { AppNotification } from '@/types';
import { deliverNotificationPush } from '@/lib/server-push';
import { shouldDeferScheduledAnnouncement } from '@/lib/scheduled-notifications';


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

    if (notification.pushSentAt) {
      return NextResponse.json({ success: true, delivered: 0, alreadySent: true });
    }

    if (shouldDeferScheduledAnnouncement(notification.scheduledFor)) {
      return NextResponse.json({ success: true, delivered: 0, deferred: true });
    }

    const delivered = await deliverNotificationPush(notification, adminDb, adminMessaging);
    await notifDocRef.update({ pushSentAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true, delivered });

  } catch (error: any) {
    console.error('Error sending push notification:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
