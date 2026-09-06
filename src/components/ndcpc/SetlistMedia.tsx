'use client';

import { Resource } from '@/types/ndcpc-ported';
import { VideoEmbed } from '@/components/ndcpc/VideoEmbed';
import { useTranslation } from '@/context/LocaleProvider';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useState } from 'react';

type SetlistMediaProps = {
  songs: Resource[];
  chants: Resource[];
};

function VideoList({ resources, startIndex = 1 }: { resources: Resource[]; startIndex?: number }) {
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  if (resources.length === 0) return null;

  return (
    <>
      <ol className="space-y-2">
        {resources.map((resource, index) => (
          <li key={resource.id}>
            <Button
              type="button"
              variant="ghost"
              className="h-auto min-h-11 w-full justify-start rounded-lg px-3 py-2 text-left text-sm font-medium"
              onClick={() => setSelectedResource(resource)}
            >
              {startIndex + index}. {resource.title}
            </Button>
          </li>
        ))}
      </ol>
      <Dialog open={!!selectedResource} onOpenChange={(open) => !open && setSelectedResource(null)}>
        <DialogContent className="max-w-3xl rounded-xl">
          <DialogHeader>
            <DialogTitle>{selectedResource?.title}</DialogTitle>
          </DialogHeader>
          {selectedResource ? (
            <VideoEmbed
              url={selectedResource.url}
              title={selectedResource.title}
              startSeconds={selectedResource.startSeconds}
              endSeconds={selectedResource.endSeconds}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function SetlistMedia({ songs, chants }: SetlistMediaProps) {
  const { t } = useTranslation();

  if (songs.length === 0 && chants.length === 0) return null;

  return (
    <div className="space-y-8">
      {songs.length > 0 && (
        <section className="space-y-4">
          <Text as="h3" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('resources.songs')}
          </Text>
          <VideoList resources={songs} />
        </section>
      )}
      {chants.length > 0 && (
        <section className="space-y-4">
          <Text as="h3" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('resources.chants')}
          </Text>
          <VideoList resources={chants} startIndex={1} />
        </section>
      )}
    </div>
  );
}
