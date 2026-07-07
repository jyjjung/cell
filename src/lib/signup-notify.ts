import { auth } from '@/lib/firebase';

export async function notifySignupPending(userId: string) {
  try {
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : undefined;
    if (!token) return;

    await fetch('/api/signup/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId }),
    });
  } catch (error) {
    console.error('[notifySignupPending]', error);
  }
}
