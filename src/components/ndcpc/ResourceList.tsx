'use client';
import { NDCPc_COLLECTIONS } from '@/lib/ndcpc/collections';

import * as React from 'react';
import { Resource } from '@/types/ndcpc-ported';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/context/LocaleProvider';
import { LoadingState } from '@/components/ndcpc/LoadingState';
import { EmptyState } from '@/components/ndcpc/EmptyState';
import { DATA_CACHE_KEYS } from '@/lib/ndcpc/data-cache';
import { VideoEmbed } from '@/components/ndcpc/VideoEmbed';
import { EditResourceChapterForm } from '@/components/ndcpc/EditResourceChapterForm';
import { getYouTubeVideoId } from '@/lib/ndcpc/video';
import { Pencil } from 'lucide-react';

interface ResourceListProps {
  category: 'songs' | 'chants';
  isManageMode: boolean;
  selectedResources: string[];
  onSelectionChange: (resourceId: string, isSelected: boolean) => void;
}

export function ResourceList({
  category,
  isManageMode,
  selectedResources,
  onSelectionChange,
}: ResourceListProps) {
  const firestore = useFirestore();
  const { t } = useTranslation();
  const [editingResource, setEditingResource] = React.useState<Resource | null>(null);

  const resourcesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, NDCPc_COLLECTIONS.resources), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: allResources, isLoading } = useCollection<Resource>(resourcesQuery, {
    cacheKey: DATA_CACHE_KEYS.resources,
  });

  const resources = React.useMemo(() => {
    if (!allResources) return [];
    return allResources.filter((resource) => resource.category === category);
  }, [allResources, category]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (!resources || resources.length === 0) {
    return (
      <EmptyState
        message={category === 'songs' ? t('resources.noSongs') : t('resources.noChants')}
      />
    );
  }

  const content = resources.map((resource) => {
    const isSelected = selectedResources.includes(resource.id);
    const canEditChapter = Boolean(getYouTubeVideoId(resource.url));

    const trigger = (
      <div className="flex w-full items-center gap-3">
        {isManageMode && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelectionChange(resource.id, !!checked)}
            onClick={(e) => e.stopPropagation()}
            aria-label={t('resources.selectItem', { title: resource.title })}
          />
        )}
        <span
          className="min-w-0 flex-1 break-words text-left [overflow-wrap:anywhere] line-clamp-2"
          title={resource.title}
        >
          {resource.title}
        </span>
      </div>
    );

    if (isManageMode) {
      return (
        <div
          key={resource.id}
          className={cn(
            'flex cursor-pointer items-center border-b border-border/40 py-4 transition-colors last:border-0',
            isSelected && 'bg-accent/50 -mx-2 px-2'
          )}
          onClick={() => onSelectionChange(resource.id, !isSelected)}
        >
          {trigger}
        </div>
      );
    }

    return (
      <AccordionItem value={resource.id} key={resource.id} className="border-b border-border/40 last:border-0">
        <AccordionTrigger className="py-4 text-[0.9375rem] no-underline hover:no-underline">
          {trigger}
        </AccordionTrigger>
        <AccordionContent className="pb-5 pt-0">
          <div className="space-y-3">
            <VideoEmbed
              url={resource.url}
              title={resource.title}
              startSeconds={resource.startSeconds}
              endSeconds={resource.endSeconds}
            />
            {canEditChapter && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="px-0"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setEditingResource(resource);
                }}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                {t('resources.editChapter')}
              </Button>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  });

  return (
    <>
      {isManageMode ? <div>{content}</div> : <Accordion type="single" collapsible>{content}</Accordion>}

      <Dialog open={!!editingResource} onOpenChange={(open) => !open && setEditingResource(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('resources.editChapter')}</DialogTitle>
          </DialogHeader>
          {editingResource && (
            <EditResourceChapterForm
              key={editingResource.id}
              resource={editingResource}
              onSuccess={() => setEditingResource(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
