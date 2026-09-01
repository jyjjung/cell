"use client";

import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { useFirestoreDoc } from '@/hooks/use-firestore-doc';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

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
  lastRunDutySent?: number;
  lastRunDutyCandidates?: number;
  lastRunEventsSent?: number;
  lastRunFormsSent?: number;
  lastRunFormsCandidates?: number;
  lastRunPushRetriesSent?: number;
  lastRunFullScanSkipped?: boolean;
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

  if (loading) {
    return (
      <div className="rounded-xl border border-border/60 p-3" role="status" aria-live="polite" aria-busy="true">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-2 h-3 w-64" />
        <span className="sr-only">{t.loading}</span>
      </div>
    );
  }

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
      data?.lastRunSource === 'catchup'
        ? data?.lastRunFullScanSkipped
          ? ` (${t.adminReminderHealthCatchupSkipped})`
          : ` (${t.adminReminderHealthCatchup})`
        : '';
    detail = `${t.adminReminderHealthLastRun} ${relative}${viaCatchup}`;
  }

  const metrics: string[] = [];
  if (typeof data?.lastRunDutySent === 'number') {
    metrics.push(`${t.adminReminderHealthDutySent}: ${data.lastRunDutySent}`);
  }
  if (typeof data?.lastRunDutyCandidates === 'number') {
    metrics.push(`${t.adminReminderHealthDutyCandidates}: ${data.lastRunDutyCandidates}`);
  }
  if (typeof data?.lastRunEventsSent === 'number') {
    metrics.push(`${t.adminReminderHealthEventsSent}: ${data.lastRunEventsSent}`);
  }
  if (typeof data?.lastRunFormsSent === 'number') {
    metrics.push(`Forms sent: ${data.lastRunFormsSent}`);
  }
  if (typeof data?.lastRunFormsCandidates === 'number') {
    metrics.push(`Forms candidates: ${data.lastRunFormsCandidates}`);
  }
  if (typeof data?.lastRunPushRetriesSent === 'number') {
    metrics.push(`${t.adminReminderHealthPushRetries}: ${data.lastRunPushRetriesSent}`);
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
      <div className="min-w-0 stack-gap-sm">
        <div>
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
        {metrics.length > 0 && (
          <p className="text-xs text-muted-foreground">{metrics.join(' · ')}</p>
        )}
        {failedSinceLastRun && data?.lastError && (
          <p className="text-xs text-destructive break-words">
            {t.adminReminderHealthErrorDetail}: {data.lastError}
          </p>
        )}
      </div>
    </div>
  );
}
