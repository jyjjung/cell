"use client";

import { useAuth } from '@/contexts/auth-context';
import { useInfoWidgets } from '@/hooks/use-info-widgets';
import { PageSection } from '@/components/ui/page-layout';

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
    <>
      {visible.map((widget) => {
        const title = lang === 'ko' && widget.titleKo ? widget.titleKo : widget.title;
        const body = lang === 'ko' && widget.bodyKo ? widget.bodyKo : widget.body;
        return (
          <PageSection key={widget.id} title={title}>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {body}
            </p>
          </PageSection>
        );
      })}
    </>
  );
}
