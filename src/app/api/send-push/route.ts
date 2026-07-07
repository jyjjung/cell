
import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb, getAdminMessaging } from '@/lib/firebase-admin';
import type { AppNotification } from '@/types';
import { isAuthError, verifyAuthToken } from '@/lib/api-auth';
import { deliverPushWithLock } from '@/lib/push-delivery-lock';
import { userHasAdminAccess } from '@/lib/server-admin-access';
import { userCanManageWorship } from '@/lib/server-worship-access';


export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (isAuthError(authResult)) return authResult;

    const { notificationId } = await request.json();

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    const adminApp = getAdminApp();
    const adminDb = getAdminDb(adminApp);
    const adminMessaging = getAdminMessaging(adminApp);

    const notifDoc = await adminDb.collection('notifications').doc(notificationId).get();
    if (!notifDoc.exists) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const notification = { id: notifDoc.id, ...notifDoc.data() } as AppNotification;
    const callerUid = authResult.uid;
    const [isAdmin, canManageWorship] = await Promise.all([
      userHasAdminAccess(adminDb, callerUid),
      userCanManageWorship(adminDb, callerUid),
    ]);

    if (!isAdmin) {
      const isPersonal = notification.userId === callerUid;
      const isWorshipReminder = canManageWorship && notification.type === 'reminder' && !notification.isGlobal;
      if (notification.isGlobal || notification.type === 'announcement') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (!isPersonal && !isWorshipReminder) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const result = await deliverPushWithLock(notificationId, adminDb, adminMessaging);
    return NextResponse.json({ success: true, ...result });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'NOTIFICATION_NOT_FOUND') {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    console.error('Error sending push notification:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
