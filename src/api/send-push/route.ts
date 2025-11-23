
import { type NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import type { AppNotification, UserProfileData } from '@/types';

// Initialize Firebase Admin SDK
// This is a server-side only operation
try {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.");
  }
  
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
} catch (error: any) {
  console.error("Firebase Admin Initialization Error in /api/send-push:", error.message);
  // We don't re-throw here because we want the app to build, but push notifications will fail.
  // The functions below will check for initialization and fail gracefully.
}

export async function POST(request: NextRequest) {
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

    // If targetUserIds are specified (for non-global notifications), fetch only those users.
    if (targetUserIds && targetUserIds.length > 0) {
        const usersSnapshot = await db.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', targetUserIds).get();
        usersSnapshot.forEach(doc => {
            const userData = doc.data() as UserProfileData;
            // For targeted notifications, we assume the check was done client-side before calling createNotification
            // But we can double-check here for safety.
            const canReceive = userData.notificationPreferences?.[notification.type] ?? true;
            if (canReceive && userData.fcmTokens && userData.fcmTokens.length > 0) {
                tokens.push(...userData.fcmTokens);
            }
        });
    } 
    // If it's a global notification, fetch all users and check their preferences.
    else if (notification.isGlobal) {
        const usersSnapshot = await db.collection('users').get();
        usersSnapshot.forEach(doc => {
            const userData = doc.data() as UserProfileData;
            // Check if the user wants this type of notification. Default to true if not set.
            const canReceive = userData.notificationPreferences?.[notification.type] ?? true;
            if (canReceive && userData.fcmTokens && userData.fcmTokens.length > 0) {
                tokens.push(...userData.fcmTokens);
            }
        });
    }

    if (tokens.length === 0) {
      return NextResponse.json({ success: true, message: 'No users subscribed to push notifications for this type.' });
    }

    // Remove duplicate tokens
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

      // Optional: Clean up invalid tokens from Firestore based on the response
      const tokensToDelete: Promise<any>[] = [];
      response.results.forEach((result, index) => {
        const error = result.error;
        if (error) {
          console.warn('Failure sending notification to', uniqueTokens[index], error);
          // Cleanup the tokens that are not registered anymore.
          if (error.code === 'messaging/invalid-registration-token' || error.code === 'messaging/registration-token-not-registered') {
            // This part is complex because you need to find which user has this token.
            // For simplicity, we'll skip the cleanup in this implementation, but in a real-world app,
            // you would query for the user with this token and remove it.
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
