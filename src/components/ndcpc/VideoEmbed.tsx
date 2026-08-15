'use client';

import { getVideoEmbedUrl, getYouTubeVideoId } from '@/lib/ndcpc/video';
import { formatChapterTime } from '@/lib/ndcpc/youtube-chapters';

type VideoEmbedProps = {
  url: string;
  title: string;
  className?: string;
  startSeconds?: number;
  endSeconds?: number;
};

function toFiniteSeconds(value?: number | string | null) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }
  return Math.floor(parsed);
}

export function VideoEmbed({
  url,
  title,
  className,
  startSeconds,
  endSeconds,
}: VideoEmbedProps) {
  const start = toFiniteSeconds(startSeconds);
  const end = toFiniteSeconds(endSeconds);
  // YouTube rejects / blanks clips when end is not after start.
  const clipEnd =
    end !== undefined && (start === undefined || end > start) ? end : undefined;
  const youtubeId = getYouTubeVideoId(url);
  const embedUrl = getVideoEmbedUrl(url, {
    startSeconds: start,
    endSeconds: clipEnd,
  });

  const clipLabel =
    start !== undefined
      ? clipEnd !== undefined
        ? `${formatChapterTime(start)} – ${formatChapterTime(clipEnd)}`
        : formatChapterTime(start)
      : null;

  return (
    <div className="space-y-2">
      <div className={className ?? 'aspect-video w-full overflow-hidden rounded-md bg-muted/30'}>
        {embedUrl ? (
          <iframe
            key={`${youtubeId ?? url}-${start ?? 'full'}-${clipEnd ?? 'x'}`}
            width="100%"
            height="100%"
            src={embedUrl}
            title={title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <iframe src={url} className="h-full w-full" title={title} />
        )}
      </div>
      {clipLabel && (
        <p className="text-xs text-muted-foreground">
          {clipLabel}
        </p>
      )}
    </div>
  );
}
