
import { type NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import type { AppNotification, UserProfileData } from '@/types';

// Function to initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return;
  }

  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.");
    }
    
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error: any) {
    console.error("Firebase Admin Initialization Error in /api/send-push:", error.message);
    // Don't re-throw; the check below will handle the uninitialized state.
  }
}

export async function POST(request: NextRequest) {
  initializeFirebaseAdmin();

  if (admin.apps.length === 0) {
    console.error("API Route /api/send-push: Firebase Admin SDK not initialized. Push notification will not be sent.");
    return NextResponse.json({ success: false, error: "Server not configured for push notifications." }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { notification, targetUserIds } = body as { notification: AppNotification, targetUserIds?: string[] };

    if (!notification || !notification.title || !notification.message) {
      return NextResponse.json({ success: false, error: 'Invalid notification data provided.' }, { status: 400 });
    }

    const db = admin.firestore();
    let tokens: string[] = [];

    if (notification.isGlobal) {
        const usersSnapshot = await db.collection('users').get();
        usersSnapshot.forEach(doc => {
            const userData = doc.data() as UserProfileData;
            const canReceive = userData.notificationPreferences?.[notification.type] ?? true;
            if (canReceive && userData.fcmTokens && userData.fcmTokens.length > 0) {
                tokens.push(...userData.fcmTokens);
            }
        });
    } else if (targetUserIds && targetUserIds.length > 0) {
        // Chunk the user IDs to stay within Firestore's 30-item limit for 'in' queries
        for (let i = 0; i < targetUserIds.length; i += 30) {
            const chunk = targetUserIds.slice(i, i + 30);
            const usersSnapshot = await db.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', chunk).get();
            usersSnapshot.forEach(doc => {
                const userData = doc.data() as UserProfileData;
                const canReceive = userData.notificationPreferences?.[notification.type] ?? true;
                if (canReceive && userData.fcmTokens && userData.fcmTokens.length > 0) {
                    tokens.push(...userData.fcmTokens);
                }
            });
        }
    }

    if (tokens.length === 0) {
      return NextResponse.json({ success: true, message: 'No users subscribed to push notifications for this type.' });
    }

    const uniqueTokens = [...new Set(tokens)];

    const messagePayload = {
      notification: {
        title: notification.title,
        body: notification.message,
      },
      webpush: {
        notification: {
          icon: '/icon-192x192.png',
        },
        fcm_options: {
            link: notification.relatedUrl || '/',
        },
      },
    };

    if (uniqueTokens.length > 0) {
      const response = await admin.messaging().sendToDevice(uniqueTokens, messagePayload);
      
      response.results.forEach((result, index) => {
        const error = result.error;
        if (error) {
          console.warn('Failure sending notification to', uniqueTokens[index], error);
          if (error.code === 'messaging/invalid-registration-token' || error.code === 'messaging/registration-token-not-registered') {
            // In a real-world app, you would implement cleanup logic here.
          }
        }
      });
      return NextResponse.json({ success: true, sentCount: response.successCount, failedCount: response.failureCount });
    } else {
       return NextResponse.json({ success: true, message: 'No valid tokens found for users who can receive this notification.' });
    }

  } catch (error: any) {
    console.error("Error in /api/send-push:", error);
    return NextResponse.json({ success: false, error: error.message || 'An internal server error occurred.' }, { status: 500 });
  }
}
