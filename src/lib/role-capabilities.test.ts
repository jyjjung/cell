import { describe, expect, it } from 'vitest';
import { deriveRoleState, normalizeRoleCapabilities } from '@/lib/role-capabilities';

const roles = [
  { id: 'admin', capabilities: ['app.admin'], status: 'active' as const },
  { id: 'youth', capabilities: ['member.youth'], status: 'active' as const },
  { id: 'worship', capabilities: ['worship.manage'], status: 'active' as const },
  { id: 'archived', capabilities: ['app.admin'], status: 'archived' as const },
];

describe('deriveRoleState', () => {
  it('derives flags and capabilities from active assigned roles', () => {
    expect(deriveRoleState(['youth', 'admin'], roles)).toEqual({
      roleIds: ['youth', 'admin'],
      capabilityKeys: ['app.admin', 'member.youth'],
      isAdmin: true,
      isYouth: true,
    });
  });

  it('drops unknown, duplicate, and archived role IDs', () => {
    expect(deriveRoleState(['admin', 'admin', 'missing', 'archived'], roles)).toEqual({
      roleIds: ['admin'],
      capabilityKeys: ['app.admin'],
      isAdmin: true,
      isYouth: false,
    });
  });

  it('keeps a capability supplied by another assigned role', () => {
    const duplicated = [
      ...roles,
      { id: 'second-admin', capabilities: ['app.admin'], status: 'active' as const },
    ];
    expect(deriveRoleState(['second-admin'], duplicated).isAdmin).toBe(true);
  });

  it('ignores unknown capability values', () => {
    expect(normalizeRoleCapabilities(['app.admin', 'unknown', 'app.admin'])).toEqual(['app.admin']);
  });
});
