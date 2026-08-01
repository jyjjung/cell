import { type NextRequest } from 'next/server';
import { handleDutyReminderSweepRequest } from '@/lib/cron-sweep-handler';

/** Never serve a cached response — a cached 200 would look like a successful run. */
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Morning duty/event reminder sweep. A matching catch-up route runs later the
 * same day, because Vercel never retries a cron invocation it misses.
 */
export async function GET(request: NextRequest) {
  return handleDutyReminderSweepRequest(request, 'scheduled');
}
