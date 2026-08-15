import { startOfDay } from 'date-fns';
import { toCalendarDate } from '@/lib/ndcpc/dates';
import { normalizeName } from '@/lib/ndcpc/name-similarity';
import {
  SCHEDULE_ROLE_KEYS,
  getScheduleRoleValue,
  type ScheduleRoleKey,
} from '@/lib/ndcpc/schedule-roles';
import type { Schedule, UserProfile } from '@/types/ndcpc-ported';

export type UpcomingDuty = {
  scheduleId: string;
  date: Date;
  roles: ScheduleRoleKey[];
};

export function getRolesForSchedule(
  schedule: Schedule,
  displayName: string,
): ScheduleRoleKey[] {
  const normalized = normalizeName(displayName);
  if (!normalized) return [];

  return SCHEDULE_ROLE_KEYS.filter((role) => {
    const assigned = getScheduleRoleValue(schedule, role);
    return Boolean(assigned && normalizeName(assigned) === normalized);
  });
}

/** Match schedule assignments against the account display name. */
export function getUpcomingDuties(
  schedules: Schedule[] | null | undefined,
  profile: UserProfile | null | undefined,
  from = new Date(),
): UpcomingDuty[] {
  if (!schedules?.length || !profile) return [];

  const displayName = profile.displayName?.trim();
  if (!displayName) return [];

  const today = startOfDay(from);
  const duties: UpcomingDuty[] = [];

  for (const schedule of schedules) {
    const scheduleDate = toCalendarDate(schedule.date);
    if (!scheduleDate || scheduleDate < today) continue;

    const roles = getRolesForSchedule(schedule, displayName);
    if (roles.length === 0) continue;

    duties.push({
      scheduleId: schedule.id,
      date: scheduleDate,
      roles,
    });
  }

  return duties.sort((a, b) => a.date.getTime() - b.date.getTime());
}
