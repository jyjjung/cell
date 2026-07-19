"use client";

import { useAuth } from '@/contexts/auth-context';
import { useInfoWidgets } from '@/hooks/use-info-widgets';

export default function HomeInfoWidgets() {
  const { currentUser } = useAuth();
  const { widgets, loading } = useInfoWidgets();
  const lang = currentUser?.preferredLanguage || 'en';

  if (loading || widgets.length === 0) return null;

  const visible = widgets.filter((widget) => {
    const body = lang === 'ko' && widget.bodyKo ? widget.bodyKo : widget.body;
    return !!body.trim();
  });

  if (visible.length === 0) return null;

  return (
    <section className="ui-card space-y-5">
      {visible.map((widget, index) => {
        const title = lang === 'ko' && widget.titleKo ? widget.titleKo : widget.title;
        const body = lang === 'ko' && widget.bodyKo ? widget.bodyKo : widget.body;
        return (
          <div
            key={widget.id}
            className={index > 0 ? 'space-y-2 border-t border-border/50 pt-5' : 'space-y-2'}
          >
            <p className="text-eyebrow">{title}</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {body}
            </p>
          </div>
        );
      })}
    </section>
  );
}
