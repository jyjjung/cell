/**
 * Forces the FCM messaging service worker + token to rebind.
 *
 * Opted-in users can keep valid-looking tokens that still deliver to an old
 * or wrong SW (often next-pwa sw.js). FCM accepts the token, but nothing is
 * shown — including chat. Bump HEAL_VERSION to force every client to rebind once.
 */
import { deleteToken, getToken } from 'firebase/messaging';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { messagingPromise, db } from '@/lib/firebase';
import { getFCMRegistration } from '@/lib/fcm-registration';

const FCM_HEAL_VERSION = '2026-07-23-v1';
const FCM_HEAL_STORAGE_KEY = 'fcm_heal_version';
export const MAX_FCM_TOKENS = 5;

function isMessagingSw(reg: ServiceWorkerRegistration): boolean {
  const url = reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || '';
  return url.includes('firebase-messaging-sw.js');
}

async function hasHealthyMessagingSw(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
  const regs = await navigator.serviceWorker.getRegistrations();
  return regs.some(isMessagingSw);
}

/**
 * Hard rebind: ensure messaging SW is registered/updated, rotate the FCM token,
 * and write it to Firestore. Clears fcmNeedsResync when present.
 */
export async function healFcmSubscription(uid: string, options?: { force?: boolean }): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const messaging = await messagingPromise;
  if (!messaging) return null;
  if (Notification.permission !== 'granted') return null;

  const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;
  if (!vapidKey) {
    console.error('[fcm-heal] Missing NEXT_PUBLIC_FCM_VAPID_KEY');
    return null;
  }

  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  const data = snap.data();
  const needsResync = Boolean(data?.fcmNeedsResync);
  const localVersion = localStorage.getItem(FCM_HEAL_STORAGE_KEY);
  const versionStale = localVersion !== FCM_HEAL_VERSION;
  const swHealthy = await hasHealthyMessagingSw();

  const shouldHardHeal = options?.force || needsResync || versionStale || !swHealthy;
  if (!shouldHardHeal && localVersion === FCM_HEAL_VERSION) {
    // Soft path already covered by useFCMToken; nothing to do.
    return null;
  }

  const registration = await getFCMRegistration();
  if (!registration) {
    console.warn('[fcm-heal] SW registration unavailable — skipping FCM heal.');
    return null;
  }
  try {
    await registration.update();
  } catch {
    // update() can fail offline; continue with current registration
  }

  if (shouldHardHeal) {
    try {
      await deleteToken(messaging);
    } catch (err) {
      console.warn('[fcm-heal] deleteToken failed (continuing):', err);
    }
  }

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    throw new Error('Could not refresh push token');
  }

  const currentTokens = Array.isArray(data?.fcmTokens)
    ? (data!.fcmTokens as string[]).filter(Boolean)
    : [];
  const filtered = currentTokens.filter((t) => t !== token);
  const newList = [token, ...filtered].slice(0, MAX_FCM_TOKENS);

  // Token write must succeed even if heal-metadata fields are not yet in Firestore rules.
  await updateDoc(userRef, { fcmTokens: newList });
  try {
    await updateDoc(userRef, {
      fcmNeedsResync: false,
      fcmLastHealedAt: serverTimestamp(),
      fcmHealVersion: FCM_HEAL_VERSION,
    });
  } catch (err) {
    console.warn('[fcm-heal] Could not clear resync flags (rules may need deploy):', err);
  }

  localStorage.setItem(FCM_HEAL_STORAGE_KEY, FCM_HEAL_VERSION);
  return token;
}
