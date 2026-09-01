"use client";

import { useAuth } from '@/contexts/auth-context';
import { useInfoWidgets } from '@/hooks/use-info-widgets';
import { translations } from '@/lib/translations';
import { HomeGroupedSection, HomeGroupList } from '@/components/home/home-grouped-section';

export default function HomeInfoWidgets() {
  const { currentUser } = useAuth();
  const { widgets, loading } = useInfoWidgets();
  const lang = currentUser?.preferredLanguage || 'en';
  const t = translations[lang];

  if (loading || widgets.length === 0) return null;

  const visible = widgets.filter((widget) => {
    const body = lang === 'ko' && widget.bodyKo ? widget.bodyKo : widget.body;
    return !!body.trim();
  });

  if (visible.length === 0) return null;

  return (
    <HomeGroupedSection id="home-notices-heading" title={t.homeNotices}>
      <HomeGroupList>
        {visible.map((widget) => {
          const title = lang === 'ko' && widget.titleKo ? widget.titleKo : widget.title;
          const body = lang === 'ko' && widget.bodyKo ? widget.bodyKo : widget.body;
          return (
            <article key={widget.id} className="home-notice-row">
              {title ? <h3 className="text-sm font-medium text-foreground">{title}</h3> : null}
              <p className="whitespace-pre-wrap text-sm leading-snug text-muted-foreground">{body}</p>
            </article>
          );
        })}
      </HomeGroupList>
    </HomeGroupedSection>
  );
}
