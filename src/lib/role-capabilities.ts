export const ROLE_CAPABILITIES = [
  'app.admin',
  'member.youth',
  'worship.manage',
] as const;

export type RoleCapability = (typeof ROLE_CAPABILITIES)[number];
export type RoleStatus = 'active' | 'archived';

export type RoleStateInput = {
  id: string;
  capabilities?: readonly string[];
  status?: RoleStatus;
};

export type DerivedRoleState = {
  roleIds: string[];
  capabilityKeys: RoleCapability[];
  isAdmin: boolean;
  isYouth: boolean;
};

const CAPABILITY_SET = new Set<string>(ROLE_CAPABILITIES);

export function normalizeRoleCapabilities(values: readonly string[] | undefined): RoleCapability[] {
  if (!values) return [];
  return [...new Set(values.filter((value): value is RoleCapability => CAPABILITY_SET.has(value)))].sort();
}

export function deriveRoleState(
  roleIds: readonly string[] | undefined,
  roles: readonly RoleStateInput[],
): DerivedRoleState {
  const roleMap = new Map(roles.map((role) => [role.id, role]));
  const validRoleIds = [...new Set(roleIds ?? [])].filter((roleId) => {
    const role = roleMap.get(roleId);
    return !!role && role.status !== 'archived';
  });

  const capabilities = new Set<RoleCapability>();
  for (const roleId of validRoleIds) {
    for (const capability of normalizeRoleCapabilities(roleMap.get(roleId)?.capabilities)) {
      capabilities.add(capability);
    }
  }

  const capabilityKeys = [...capabilities].sort();
  return {
    roleIds: validRoleIds,
    capabilityKeys,
    isAdmin: capabilities.has('app.admin'),
    isYouth: capabilities.has('member.youth'),
  };
}

export function hasCapability(
  capabilityKeys: readonly string[] | undefined,
  capability: RoleCapability,
): boolean {
  return capabilityKeys?.includes(capability) ?? false;
}
