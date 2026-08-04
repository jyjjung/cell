/**
 * Catch-up cron can skip the heavy roster/event/user scans when the morning
 * (or manual) sweep already succeeded for this community day. Push retries and
 * scheduled announcements still run — those fail independently of duty sends.
 */
export function shouldSkipCatchupFullScan(input: {
  todayIso: string;
  lastRunTodayIso?: string | null;
  lastRunSource?: string | null;
  lastError?: string | null;
}): boolean {
  if (!input.lastRunTodayIso || input.lastRunTodayIso !== input.todayIso) {
    return false;
  }
  if (input.lastError) return false;
  return input.lastRunSource === 'scheduled' || input.lastRunSource === 'manual';
}

export const EMPTY_REMINDER_COUNTS = {
  candidates: 0,
  sent: 0,
  skipped: 0,
} as const;
