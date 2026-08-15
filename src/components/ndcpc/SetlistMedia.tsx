'use client';

import { Resource } from '@/types/ndcpc-ported';
import { VideoEmbed } from '@/components/ndcpc/VideoEmbed';
import { useTranslation } from '@/context/LocaleProvider';

type SetlistMediaProps = {
  songs: Resource[];
  chants: Resource[];
};

function VideoList({ resources, startIndex = 1 }: { resources: Resource[]; startIndex?: number }) {
  if (resources.length === 0) return null;

  return (
    <ol className="space-y-6">
      {resources.map((resource, index) => (
          <li key={resource.id} className="space-y-2">
            <p
              className="break-words text-sm font-medium [overflow-wrap:anywhere]"
              title={resource.title}
            >
              {startIndex + index}. {resource.title}
            </p>
            <VideoEmbed
              url={resource.url}
              title={resource.title}
              startSeconds={resource.startSeconds}
              endSeconds={resource.endSeconds}
            />
          </li>
        ))}
    </ol>
  );
}

export function SetlistMedia({ songs, chants }: SetlistMediaProps) {
  const { t } = useTranslation();

  if (songs.length === 0 && chants.length === 0) return null;

  return (
    <div className="space-y-8">
      {songs.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('resources.songs')}
          </h3>
          <VideoList resources={songs} />
        </section>
      )}
      {chants.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('resources.chants')}
          </h3>
          <VideoList resources={chants} startIndex={1} />
        </section>
      )}
    </div>
  );
}
