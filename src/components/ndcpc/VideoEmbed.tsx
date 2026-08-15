'use client';

import { useEffect, useRef } from 'react';
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

/**
 * YouTube often ignores embed ?start= when the viewer is signed in with watch history.
 * nocookie + enablejsapi lets us force-seek to the chapter start after the player is ready.
 */
function seekYouTubeIframe(iframe: HTMLIFrameElement, startSeconds: number) {
  iframe.contentWindow?.postMessage(
    JSON.stringify({
      event: 'command',
      func: 'seekTo',
      args: [startSeconds, true],
    }),
    '*'
  );
}

export function VideoEmbed({
  url,
  title,
  className,
  startSeconds,
  endSeconds,
}: VideoEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const start = toFiniteSeconds(startSeconds);
  const end = toFiniteSeconds(endSeconds);
  const youtubeId = getYouTubeVideoId(url);
  const embedUrl = getVideoEmbedUrl(url, {
    startSeconds: start,
    endSeconds: end,
    enableJsApi: Boolean(youtubeId && start !== undefined),
  });

  useEffect(() => {
    if (!youtubeId || start === undefined) {
      return;
    }

    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }

    const timers: number[] = [];

    const seek = () => {
      for (const delay of [300, 800, 1600]) {
        timers.push(window.setTimeout(() => seekYouTubeIframe(iframe, start), delay));
      }
    };

    seek();
    iframe.addEventListener('load', seek);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      iframe.removeEventListener('load', seek);
    };
  }, [youtubeId, start, end, embedUrl]);

  const clipLabel =
    start !== undefined
      ? end !== undefined
        ? `${formatChapterTime(start)} – ${formatChapterTime(end)}`
        : formatChapterTime(start)
      : null;

  return (
    <div className="space-y-2">
      <div className={className ?? 'aspect-video w-full overflow-hidden rounded-md bg-muted/30'}>
        {embedUrl ? (
          <iframe
            key={`${youtubeId ?? url}-${start ?? 'full'}-${end ?? 'x'}`}
            ref={iframeRef}
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
