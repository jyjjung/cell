import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const ADMIN_ROLE_NAMES = ['Admin', 'Leader'] as const;

const ROLES_COLLECTION = 'roles';

let cachedAdminRoleIds: string[] | null = null;
let adminRoleIdsPromise: Promise<string[]> | null = null;

export function userHasAdminRole(
  roleIds: string[] | undefined,
  adminRoleIds: string[],
): boolean {
  if (!roleIds?.length || !adminRoleIds.length) return false;
  return roleIds.some((id) => adminRoleIds.includes(id));
}

export function resolveIsAdmin(
  user: { isAdmin?: boolean; roleIds?: string[] },
  adminRoleIds: string[],
): boolean {
  return !!user.isAdmin || userHasAdminRole(user.roleIds, adminRoleIds);
}

export async function getAdminRoleIds(): Promise<string[]> {
  if (cachedAdminRoleIds) return cachedAdminRoleIds;
  if (!adminRoleIdsPromise) {
    adminRoleIdsPromise = (async () => {
      const q = query(
        collection(db, ROLES_COLLECTION),
        where('name', 'in', [...ADMIN_ROLE_NAMES]),
      );
      const snap = await getDocs(q);
      cachedAdminRoleIds = snap.docs.map((d) => d.id);
      return cachedAdminRoleIds;
    })().catch((err) => {
      adminRoleIdsPromise = null;
      throw err;
    });
  }
  return adminRoleIdsPromise;
}
