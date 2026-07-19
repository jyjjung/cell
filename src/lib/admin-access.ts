import { hasCapability } from '@/lib/role-capabilities';

export function resolveIsAdmin(
  user: { capabilityKeys?: string[] },
): boolean {
  return hasCapability(user.capabilityKeys, 'app.admin');
}
