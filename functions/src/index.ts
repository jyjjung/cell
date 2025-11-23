
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

export const sendPushOnNewNotification = functions.firestore
  .document("notifications/{notificationId}")
  .onCreate(async (snapshot, context) => {
    const notificationData = snapshot.data();

    functions.logger.log(
      "New notification created:",
      context.params.notificationId,
      notificationData
    );

    let tokens: string[] = [];

    if (notificationData.isGlobal) {
      functions.logger.log("Global notification detected, sending to users who opted in.");
      const usersSnapshot = await db.collection("users").get();
      if (usersSnapshot.empty) {
        functions.logger.log("No users found to send global notification.");
        return null;
      }
      const allTokens: string[] = [];
      usersSnapshot.forEach((userDoc) => {
        const userData = userDoc.data();
        const notifPrefs = userData.notificationPreferences || {};
        const notifType = notificationData.type || 'admin';
        // Send if user has tokens AND has opted into this notification type (or if prefs don't exist, default to true)
        if (userData.fcmTokens && Array.isArray(userData.fcmTokens) && (notifPrefs[notifType] !== false)) {
          allTokens.push(...userData.fcmTokens);
        }
      });
      tokens = [...new Set(allTokens)];
    } else if (notificationData.userId) {
      functions.logger.log(
        `User-specific notification for user ${notificationData.userId}.`
      );
      const userDoc = await db
        .collection("users")
        .doc(notificationData.userId)
        .get();
      if (!userDoc.exists) {
        functions.logger.log(
          `User ${notificationData.userId} not found, cannot send notification.`
        );
        return null;
      }
      const userData = userDoc.data();
      const notifPrefs = userData?.notificationPreferences || {};
      const notifType = notificationData.type || 'admin';
      // Send if user has tokens AND has opted into this notification type (or if prefs don't exist, default to true)
      if (userData?.fcmTokens && Array.isArray(userData.fcmTokens) && (notifPrefs[notifType] !== false)) {
        tokens = userData.fcmTokens;
      }
    } else {
      functions.logger.log(
        "Notification is neither global nor user-specific. Skipping."
      );
      return null;
    }

    if (tokens.length === 0) {
      functions.logger.log("No FCM tokens found or user opted out for this notification type.");
      return null;
    }

    functions.logger.log(`Preparing to send notification to ${tokens.length} token(s).`);

    const payload: admin.messaging.MessagingPayload = {
      notification: {
        title: notificationData.title,
        body: notificationData.message,
        icon: "/icon-192x192.png",
      },
      webpush: {
        fcmOptions: {
          link: notificationData.relatedUrl || "/",
        },
      },
    };

    try {
      const response = await admin.messaging().sendToDevice(tokens, payload);
      functions.logger.log(
        "Successfully sent message:",
        response.successCount,
        "successes,",
        response.failureCount,
        "failures."
      );

      const tokensToRemove: Promise<any>[] = [];
      response.results.forEach((result, index) => {
        const error = result.error;
        if (error) {
          functions.logger.error(
            "Failure sending notification to",
            tokens[index],
            error
          );
          if (
            error.code === "messaging/invalid-registration-token" ||
            error.code === "messaging/registration-token-not-registered"
          ) {
            functions.logger.warn(
              `Token ${tokens[index]} is invalid. Consider implementing cleanup.`
            );
          }
        }
      });
      return Promise.all(tokensToRemove);
    } catch (error) {
      functions.logger.error("Error sending messages:", error);
      return null;
    }
  });
