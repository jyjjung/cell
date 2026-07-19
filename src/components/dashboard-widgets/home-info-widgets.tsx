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
        const body = lang === 'ko' && widget.bodyKo ? widget.bodyKo : widget.body;
        if (!body.trim()) return null;
        return (
          <div key={widget.id} className="space-y-2 border-b border-border/50 pb-4">
            <p className="text-eyebrow">{title}</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {body}
            </p>
          </div>
        );
      })}
    </>
  );
}
