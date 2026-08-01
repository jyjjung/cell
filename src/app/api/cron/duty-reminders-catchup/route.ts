import { type NextRequest } from 'next/server';
import { handleDutyReminderSweepRequest } from '@/lib/cron-sweep-handler';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Midday safety net for the morning sweep. Vercel does not retry a missed or
 * failed cron invocation, and a "tomorrow" reminder is worthless the day after,
 * so this second run still lands on the correct community day.
 *
 * Every send is dedupe-guarded, so when the morning run succeeded this is a no-op.
 */
export async function GET(request: NextRequest) {
  return handleDutyReminderSweepRequest(request, 'catchup');
}
