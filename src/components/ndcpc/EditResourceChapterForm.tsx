'use client';
import { NDCPc_COLLECTIONS } from '@/lib/ndcpc/collections';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { deleteField, doc, updateDoc } from 'firebase/firestore';
import { useTranslation } from '@/context/LocaleProvider';
import { getYouTubeVideoId } from '@/lib/ndcpc/video';
import {
  findChapterIndexForStart,
  getBaseVideoTitle,
  resolveYouTubeClip,
  YOUTUBE_FULL_VIDEO_VALUE,
  type YouTubeChapter,
} from '@/lib/ndcpc/youtube-chapters';
import { YouTubeChapterSelect } from '@/components/ndcpc/YouTubeChapterSelect';
import type { Resource } from '@/types/ndcpc-ported';

type EditResourceChapterFormProps = {
  resource: Resource;
  onSuccess?: () => void;
};

type VideoPreview = {
  title: string;
  url: string;
  chapters?: YouTubeChapter[];
};

export function EditResourceChapterForm({ resource, onSuccess }: EditResourceChapterFormProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [preview, setPreview] = useState<VideoPreview | null>(null);
  const [selectedChapter, setSelectedChapter] = useState(YOUTUBE_FULL_VIDEO_VALUE);
  const [error, setError] = useState<string | null>(null);
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    let cancelled = false;

    async function loadChapters() {
      if (!getYouTubeVideoId(resource.url)) {
        setError(t('resources.noChapters'));
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/ndcpc/video-metadata?url=${encodeURIComponent(resource.url)}`
        );
        const data = await response.json();

        if (!response.ok || data.error) {
          throw new Error(data.error || 'Could not fetch video details');
        }

        if (cancelled) {
          return;
        }

        setPreview(data);

        const chapters: YouTubeChapter[] = data.chapters ?? [];
        if (chapters.length === 0) {
          setError(t('resources.noChapters'));
          setSelectedChapter(YOUTUBE_FULL_VIDEO_VALUE);
          return;
        }

        const chapterIndex = findChapterIndexForStart(chapters, resource.startSeconds);
        setSelectedChapter(chapterIndex >= 0 ? String(chapterIndex) : YOUTUBE_FULL_VIDEO_VALUE);
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) {
          setError(t('resources.noChapters'));
          setPreview(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadChapters();

    return () => {
      cancelled = true;
    };
  }, [resource.id, resource.url, resource.startSeconds, t]);

  async function onSave() {
    if (!firestore || !preview) {
      toast({ variant: 'destructive', title: t('common.offline') });
      return;
    }

    setIsSaving(true);

    try {
      const clip = resolveYouTubeClip({
        chapters: preview.chapters,
        selectedChapter,
      });

      const baseTitle = getBaseVideoTitle(resource.title, preview.title);
      const title = clip.chapterTitle ? `${baseTitle} - ${clip.chapterTitle}` : baseTitle;

      await updateDoc(doc(firestore, NDCPc_COLLECTIONS.resources, resource.id), {
        title,
        ...(clip.startSeconds !== undefined
          ? { startSeconds: clip.startSeconds }
          : { startSeconds: deleteField() }),
        ...(clip.endSeconds !== undefined
          ? { endSeconds: clip.endSeconds }
          : { endSeconds: deleteField() }),
      });

      toast({ title: t('common.saved') });
      onSuccess?.();
    } catch (saveError) {
      console.error(saveError);
      toast({ variant: 'destructive', title: t('toast.couldntSave') });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t('resources.loadingChapters')}</p>;
  }

  if (error || !preview?.chapters?.length) {
    return <p className="text-sm text-muted-foreground">{error || t('resources.noChapters')}</p>;
  }

  return (
    <div className="space-y-4">
      <YouTubeChapterSelect
        chapters={preview.chapters}
        value={selectedChapter}
        onChange={setSelectedChapter}
        videoTitle={preview.title}
      />
      <Button type="button" className="w-full" onClick={onSave} disabled={isSaving}>
        {isSaving ? t('common.saving') : t('common.save')}
      </Button>
    </div>
  );
}
