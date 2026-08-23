import type { Schedule } from '@/types/ndcpc-ported';
import type { WorshipFormatItem } from '@/types/ndcpc-ported';
import { getStepRoles } from '@/lib/ndcpc/worship-format';

export const SCHEDULE_ROLE_KEYS = [
  'worship',
  'offering',
  'sermon',
  'chant',
  'activity',
] as const;

export const SIMPLE_SCHEDULE_ROLE_KEYS = ['worship', 'sermon'] as const;

export type ScheduleRoleKey = (typeof SCHEDULE_ROLE_KEYS)[number];

export function ndcpcScheduleRoleBadgeClass(role: ScheduleRoleKey): string {
  switch (role) {
    case 'worship':
      return 'bg-primary/10 border-primary/30 text-primary';
    case 'offering':
      return 'bg-chart-3/15 border-chart-3/30 text-chart-3';
    case 'sermon':
      return 'bg-chart-2/15 border-chart-2/30 text-chart-2';
    case 'chant':
      return 'bg-success/10 border-success/30 text-success';
    case 'activity':
      return 'bg-chart-4/15 border-chart-4/30 text-chart-4';
  }
}

export function getScheduleRoleValue(schedule: Schedule, key: ScheduleRoleKey) {
  return schedule[key]?.trim() ?? '';
}

export function getRosterNamesForStep(
  item: WorshipFormatItem,
  schedule?: Schedule | null
): string[] {
  if (!schedule) return [];
  return getStepRoles(item)
    .map((role) => getScheduleRoleValue(schedule, role))
    .filter(Boolean);
}
