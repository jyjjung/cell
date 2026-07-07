import type { Firestore } from 'firebase-admin/firestore';
import { ADMIN_ROLE_NAMES } from '@/lib/admin-access';

const ADMIN_ROLE_NAME_SET = new Set<string>(ADMIN_ROLE_NAMES);

export async function userHasAdminAccess(
  adminDb: Firestore,
  userId: string,
): Promise<boolean> {
  const userDoc = await adminDb.collection('users').doc(userId).get();
  if (!userDoc.exists) return false;

  const data = userDoc.data()!;
  if (data.isAdmin) return true;

  const roleIds: string[] = data.roleIds || [];
  if (!roleIds.length) return false;

  const rolesSnap = await adminDb.collection('roles').get();
  for (const roleDoc of rolesSnap.docs) {
    const name = roleDoc.data()?.name;
    if (
      typeof name === 'string'
      && ADMIN_ROLE_NAME_SET.has(name)
      && roleIds.includes(roleDoc.id)
    ) {
      return true;
    }
  }

  return false;
}
