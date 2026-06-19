import { auth } from '@/lib/firebase';

/** Propagate the latest profile photo/name into every chat the user belongs to. */
export async function syncProfileToChats(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const token = await user.getIdToken();
  const response = await fetch('/api/sync-profile-chats', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to sync profile to chats');
  }
}
