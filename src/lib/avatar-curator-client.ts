import { auth } from '@/lib/firebase';
import type { AvatarData } from '@/types';

export type AvatarCuratorUpdatePayload = {
  targetUserId: string;
  avatar?: AvatarData;
  avatarChangesEnabled?: boolean;
};

export async function updateMemberAvatarAsCurator(
  payload: AvatarCuratorUpdatePayload,
): Promise<{ success: boolean; error?: string }> {
  const user = auth.currentUser;
  if (!user) return { success: false, error: 'Not signed in' };

  const token = await user.getIdToken();
  const response = await fetch('/api/avatar-curator/update', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { success: false, error: body.error || 'Update failed' };
  }
  return { success: true };
}
