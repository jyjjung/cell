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
