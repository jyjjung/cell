import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

export const sendPushOnNewNotification = functions.firestore
  .document("notifications/{notificationId}")
  .onCreate(async (snapshot, context) => {
    const notificationData = snapshot.data();

    // Only send for global notifications created by an admin
    if (!notificationData.isGlobal || notificationData.type !== "admin") {
      functions.logger.log(
        "Notification is not a global admin notification, skipping push."
      );
      return null;
    }

    functions.logger.log(
      "New global notification detected:",
      notificationData.title
    );

    // 1. Get all users
    const usersSnapshot = await db.collection("users").get();
    if (usersSnapshot.empty) {
      functions.logger.log("No users found to send notifications to.");
      return null;
    }

    // 2. Collect all FCM tokens
    const allTokens: string[] = [];
    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
        allTokens.push(...userData.fcmTokens);
      }
    });

    if (allTokens.length === 0) {
      functions.logger.log("No FCM tokens found among users.");
      return null;
    }

    // Deduplicate tokens
    const uniqueTokens = [...new Set(allTokens)];
    functions.logger.log(`Found ${uniqueTokens.length} unique tokens.`);

    // 3. Construct the push notification payload
    const payload: admin.messaging.MessagingPayload = {
      notification: {
        title: notificationData.title,
        body: notificationData.message,
        icon: "/icon-192x192.png", // Optional: path to your icon
      },
      webpush: {
        fcmOptions: {
          link: notificationData.relatedUrl || "/",
        },
      },
    };

    // 4. Send the messages
    try {
      const response = await admin
        .messaging()
        .sendToDevice(uniqueTokens, payload);
      functions.logger.log(
        "Successfully sent message:",
        response.successCount,
        "successes,",
        response.failureCount,
        "failures."
      );

      // 5. Clean up invalid tokens
      const tokensToRemove: Promise<any>[] = [];
      response.results.forEach((result, index) => {
        const error = result.error;
        if (error) {
          functions.logger.error(
            "Failure sending notification to",
            uniqueTokens[index],
            error
          );
          // Cleanup the tokens who are not registered anymore.
          if (
            error.code === "messaging/invalid-registration-token" ||
            error.code === "messaging/registration-token-not-registered"
          ) {
            // This is complex to do efficiently. A simple approach is to find
            // the user with this token and remove it. For a large user base,
            // a more scalable solution (like a separate collection for tokens)
            // would be better. For now, we'll log it.
            functions.logger.warn(
              `Token ${uniqueTokens[index]} is invalid. Consider implementing cleanup.`
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
