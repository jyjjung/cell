import { WORSHIP_ROLES, type WorshipRosterSlot } from '@/types';

export const WORSHIP_SETTINGS_COLLECTION = 'worshipSettings';
export const WORSHIP_ROSTER_ROLES_DOC_ID = 'rosterRoles';
export const WORSHIP_ROLE_LABEL_MAX_LENGTH = 32;

export function normalizeWorshipRoleLabel(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function parseWorshipRosterRoles(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const seen = new Set<string>();
  const roles: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const label = normalizeWorshipRoleLabel(item);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    roles.push(label.slice(0, WORSHIP_ROLE_LABEL_MAX_LENGTH));
  }
  return roles;
}

export function rolesFromSettingsDoc(
  data: { roles?: unknown } | null | undefined,
): string[] {
  const parsed = parseWorshipRosterRoles(data?.roles);
  return parsed ?? [...WORSHIP_ROLES];
}

export function findWorshipRoleConflict(
  roles: readonly string[],
  candidate: string,
): string | undefined {
  const key = normalizeWorshipRoleLabel(candidate).toLowerCase();
  if (!key) return undefined;
  return roles.find((role) => role.toLowerCase() === key);
}

export function emptySlotsForRoles(roles: readonly string[]): WorshipRosterSlot[] {
  return roles.map((role, order) => ({ role, members: [], order }));
}

export function roleBadgeClass(role: string): string {
  if (role === 'Lead') return 'bg-primary/10 border-primary/30 text-primary';
  if (role === 'Drums') return 'bg-chart-4/15 border-chart-4/30 text-chart-4';
  if (role.startsWith('Keys')) return 'bg-chart-4/15 border-chart-4/30 text-chart-4';
  if (role === 'Bass') return 'bg-chart-3/15 border-chart-3/30 text-chart-3';
  if (role.startsWith('Vox')) return 'bg-success/10 border-success/30 text-success';
  if (role.startsWith('E/G')) return 'bg-chart-2/15 border-chart-2/30 text-chart-2';
  if (role === 'A/G') return 'bg-chart-5/15 border-chart-5/30 text-chart-5';
  if (role === 'PPT') return 'bg-secondary border-border text-secondary-foreground';
  if (role === 'Sound') return 'bg-chart-3/10 border-chart-3/25 text-chart-3';
  if (role === 'Lighting') return 'bg-chart-4/10 border-chart-4/25 text-chart-4';
  const palette = [
    'bg-primary/10 border-primary/30 text-primary',
    'bg-chart-2/15 border-chart-2/30 text-chart-2',
    'bg-chart-3/15 border-chart-3/30 text-chart-3',
    'bg-chart-4/15 border-chart-4/30 text-chart-4',
    'bg-chart-5/15 border-chart-5/30 text-chart-5',
    'bg-success/10 border-success/30 text-success',
  ];
  let hash = 0;
  for (let i = 0; i < role.length; i += 1) {
    hash = (hash + role.charCodeAt(i)) % palette.length;
  }
  return palette[hash] ?? 'bg-muted border-border/40 text-muted-foreground';
}
