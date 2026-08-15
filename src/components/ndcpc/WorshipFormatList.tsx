'use client';

import {
  formatWorshipFormatLabel,
  formatWorshipFormatTimeRange,
} from '@/lib/ndcpc/worship-format';
import type { WorshipFormatItem } from '@/types/ndcpc-ported';
import { useTranslation } from '@/context/LocaleProvider';

type WorshipFormatListProps = {
  items: WorshipFormatItem[];
};

export function WorshipFormatList({ items }: WorshipFormatListProps) {
  const { t } = useTranslation();

  return (
    <ol className="space-y-2">
      {items.map((item, index) => {
        const timeRange = formatWorshipFormatTimeRange(item);

        return (
          <li key={`${item.id ?? item.label}-${index}`} className="flex gap-3 text-sm leading-relaxed">
            <span className="w-5 shrink-0 tabular-nums text-muted-foreground">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <span>{formatWorshipFormatLabel(item, t)}</span>
              {timeRange && (
                <span className="ml-2 tabular-nums text-muted-foreground">{timeRange}</span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
