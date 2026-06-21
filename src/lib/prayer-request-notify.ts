import { auth } from '@/lib/firebase';

export async function notifyPrayerRequestSubmitted(payload: {
  requestId: string;
  previewText?: string;
}) {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const token = await user.getIdToken();
    await fetch('/api/prayer-requests/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('[notifyPrayerRequestSubmitted]', error);
  }
}
