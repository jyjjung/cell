'use client';

import {
  formatWorshipFormatLabel,
  formatWorshipFormatTimeRange,
} from '@/lib/ndcpc/worship-format';
import { getRosterNamesForStep } from '@/lib/ndcpc/schedule-roles';
import type { Schedule, WorshipFormatItem } from '@/types/ndcpc-ported';
import { useTranslation } from '@/context/LocaleProvider';

type CombinedServiceViewProps = {
  items: WorshipFormatItem[];
  schedule?: Schedule | null;
};

export function CombinedServiceView({ items, schedule }: CombinedServiceViewProps) {
  const { t } = useTranslation();

  return (
    <ol className="divide-y divide-border/40">
      {items.map((item, index) => {
        const timeRange = formatWorshipFormatTimeRange(item);
        const people = getRosterNamesForStep(item, schedule);

        return (
          <li
            key={`${item.id ?? item.label}-${index}`}
            className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 py-3 text-sm first:pt-0 last:pb-0"
          >
            <span className="pt-0.5 tabular-nums text-muted-foreground">{index + 1}</span>
            <div className="min-w-0 space-y-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="font-medium">{formatWorshipFormatLabel(item, t)}</span>
                {timeRange && (
                  <span className="shrink-0 tabular-nums text-muted-foreground">{timeRange}</span>
                )}
              </div>
              {people.length > 0 ? (
                <div className="space-y-0.5 text-muted-foreground">
                  {people.map((person) => (
                    <p key={person}>{person}</p>
                  ))}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
