import type { Firestore } from 'firebase-admin/firestore';
import { hasCapability } from '@/lib/role-capabilities';

export async function userHasAdminAccess(
  adminDb: Firestore,
  userId: string,
): Promise<boolean> {
  const userDoc = await adminDb.collection('users').doc(userId).get();
  if (!userDoc.exists) return false;

  const data = userDoc.data()!;
  return hasCapability(data.capabilityKeys, 'app.admin');
}
