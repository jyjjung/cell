"use client";

import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { useFirestoreDoc } from '@/hooks/use-firestore-doc';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';

/**
 * Two sweeps run per community day (morning + midday catch-up), so the widest
 * healthy gap is roughly 22h once Vercel's scheduling jitter is included.
 * Past this, both runs were missed and reminders have genuinely stopped.
 */
const STALE_AFTER_MS = 26 * 60 * 60 * 1000;

interface CronHeartbeat {
  id: string;
  lastRunAt?: Timestamp;
  lastRunSource?: string;
  lastError?: string;
  lastErrorAt?: Timestamp;
}

/**
 * Surfaces the duty-reminder cron heartbeat. Vercel gives no alerting and its
 * cron logs expire within the hour, so without this a silently missed run is
 * only noticed when someone says they never got their reminder.
 */
export function ReminderCronHealth() {
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const { data, loading } = useFirestoreDoc<CronHeartbeat>('config', 'dutyReminderCron');

  if (loading) return null;

  const lastRun = data?.lastRunAt?.toDate?.() ?? null;
  const isStale = !lastRun || Date.now() - lastRun.getTime() > STALE_AFTER_MS;
  const failedSinceLastRun = Boolean(
    data?.lastErrorAt && (!lastRun || data.lastErrorAt.toDate() > lastRun),
  );
  const needsAttention = isStale || failedSinceLastRun;

  let detail: string;
  if (failedSinceLastRun) {
    detail = t.adminReminderHealthFailed;
  } else if (!lastRun) {
    detail = t.adminReminderHealthNever;
  } else if (isStale) {
    detail = t.adminReminderHealthStale;
  } else {
    const relative = formatDistanceToNow(lastRun, { addSuffix: true });
    const viaCatchup =
      data?.lastRunSource === 'catchup' ? ` (${t.adminReminderHealthCatchup})` : '';
    detail = `${t.adminReminderHealthLastRun} ${relative}${viaCatchup}`;
  }

  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-xl border px-3 py-2.5',
        needsAttention
          ? 'border-destructive/30 bg-destructive/10'
          : 'border-border/60 bg-card/50',
      )}
    >
      {needsAttention ? (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium">{t.adminReminderHealth}</p>
        <p
          className={cn(
            'text-xs',
            needsAttention ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {detail}
        </p>
      </div>
    </div>
  );
}
