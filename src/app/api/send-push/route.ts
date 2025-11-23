
import { type NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import type { AppNotification } from '@/types';

// Check if the service account key is available
if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
}

// Initialize Firebase Admin SDK
// This needs to be done only once.
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const messaging = admin.messaging();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId } = body;

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    // 1. Fetch the notification from Firestore
    const notifDoc = await db.collection('notifications').doc(notificationId).get();
    if (!notifDoc.exists) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    const notification = notifDoc.data() as AppNotification;

    let tokens: string[] = [];

    // 2. Get the target user tokens
    if (notification.isGlobal) {
      const usersSnapshot = await db.collection('users').get();
      const allTokens: string[] = [];
      usersSnapshot.forEach(userDoc => {
        const userData = userDoc.data();
        if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
          allTokens.push(...userData.fcmTokens);
        }
      });
      tokens = [...new Set(allTokens)]; // Deduplicate tokens
    } else if (notification.userId) {
      const userDoc = await db.collection('users').doc(notification.userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData?.fcmTokens && Array.isArray(userData.fcmTokens)) {
          tokens = userData.fcmTokens;
        }
      }
    }

    if (tokens.length === 0) {
      return NextResponse.json({ message: 'No devices to send notification to.' }, { status: 200 });
    }

    // 3. Construct and send the push notification
    const payload: admin.messaging.MessagingPayload = {
      notification: {
        title: notification.title,
        body: notification.message,
        icon: '/icon-192x192.png',
      },
      webpush: {
        fcmOptions: {
          link: notification.relatedUrl || '/',
        },
      },
    };

    const response = await messaging.sendToDevice(tokens, payload);

    // Optional: Clean up invalid tokens
    const tokensToRemove: Promise<any>[] = [];
    response.results.forEach((result, index) => {
        const error = result.error;
        if (error) {
            console.error('Failure sending notification to', tokens[index], error);
            // Here you might want to implement logic to remove invalid tokens from user profiles
            if (
                error.code === 'messaging/invalid-registration-token' ||
                error.code === 'messaging/registration-token-not-registered'
            ) {
                // This part is more complex as you need to find which user the token belongs to.
                // For simplicity, we are just logging it. A more robust solution would
                // track tokens back to users for cleanup.
                console.warn(`Token ${tokens[index]} is invalid.`);
            }
        }
    });

    return NextResponse.json({
      message: 'Push notifications sent successfully.',
      successCount: response.successCount,
      failureCount: response.failureCount,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error in /api/send-push:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
