"use client";

import { useAuth } from '@/contexts/auth-context';
import { useInfoWidgets } from '@/hooks/use-info-widgets';

export default function HomeInfoWidgets() {
  const { currentUser } = useAuth();
  const { widgets, loading } = useInfoWidgets();
  const lang = currentUser?.preferredLanguage || 'en';

  if (loading || widgets.length === 0) return null;

  return (
    <>
      {widgets.map((widget) => {
        const title = lang === 'ko' && widget.titleKo ? widget.titleKo : widget.title;
        return (
          <div key={widget.id} className="space-y-2 border-b border-border/50 pb-4">
            <p className="text-eyebrow">{title}</p>
            <ul className="space-y-1.5">
              {widget.items.map((item) => {
                const label = lang === 'ko' && item.labelKo ? item.labelKo : item.label;
                return (
                  <li
                    key={item.id}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-right font-medium tabular-nums text-foreground">
                      {item.value}
                      {item.detail ? (
                        <span className="font-normal text-muted-foreground">
                          {' — '}
                          {item.detail}
                        </span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </>
  );
}
