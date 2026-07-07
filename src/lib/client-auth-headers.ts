import { auth } from '@/lib/firebase';

export async function getClientAuthHeaders(
  extra: Record<string, string> = {},
): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}
