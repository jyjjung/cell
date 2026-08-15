'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/context/LocaleProvider';
import {
  formatChapterTime,
  YOUTUBE_FULL_VIDEO_VALUE,
  type YouTubeChapter,
} from '@/lib/ndcpc/youtube-chapters';

type YouTubeChapterSelectProps = {
  chapters: YouTubeChapter[];
  value: string;
  onChange: (value: string) => void;
  videoTitle?: string;
};

export function YouTubeChapterSelect({
  chapters,
  value,
  onChange,
  videoTitle,
}: YouTubeChapterSelectProps) {
  const { t } = useTranslation();

  if (chapters.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Label>{t('resources.youtubeChapter')}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={t('resources.selectChapter')} />
        </SelectTrigger>
        <SelectContent className="z-[100] max-h-72">
          <SelectItem value={YOUTUBE_FULL_VIDEO_VALUE}>{t('resources.fullVideo')}</SelectItem>
          {chapters.map((chapter, index) => (
            <SelectItem key={`${chapter.startSeconds}-${chapter.title}`} value={String(index)}>
              {formatChapterTime(chapter.startSeconds)} - {chapter.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {videoTitle && (
        <p className="text-sm text-muted-foreground">
          {t('resources.chapterHint', { title: videoTitle })}
        </p>
      )}
    </div>
  );
}
