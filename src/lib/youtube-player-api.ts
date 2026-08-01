type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  loadVideoById: (videoId: string | { videoId: string; startSeconds?: number }) => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  getVideoData: () => { video_id: string; title: string; author: string };
  destroy: () => void;
};

type YTPlayerOptions = {
  videoId?: string;
  height?: string;
  width?: string;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (event: { target: YTPlayer }) => void;
    onStateChange?: (event: { data: number; target: YTPlayer }) => void;
  };
};

type YTNamespace = {
  Player: new (
    element: string | HTMLElement,
    options: YTPlayerOptions,
  ) => YTPlayer;
  PlayerState: {
    PLAYING: number;
    PAUSED: number;
    ENDED: number;
    BUFFERING: number;
  };
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiReadyPromise: Promise<YTNamespace> | null = null;

/**
 * Loads the YouTube IFrame API once. Failures (blocked script, network) reject
 * and clear the cached promise so a later call can retry.
 */
export function loadYoutubeIframeApi(): Promise<YTNamespace> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('YouTube API is browser-only'));
  }
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }
  if (!apiReadyPromise) {
    apiReadyPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[src*="youtube.com/iframe_api"]');

      const fail = (message: string) => {
        apiReadyPromise = null;
        // Drop the dead tag so a retry re-requests the script instead of
        // waiting on a load that already failed.
        (existing ?? tag)?.remove();
        reject(new Error(message));
      };
      const finish = () => {
        if (window.YT?.Player) resolve(window.YT);
        else fail('YouTube API failed to load');
      };

      const previousReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previousReady?.();
        finish();
      };

      let tag: HTMLScriptElement | null = null;
      if (!existing) {
        tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        tag.onerror = () => fail('YouTube API script failed');
        document.head.appendChild(tag);
      }

      // The ready callback may already have fired for an existing tag, and a
      // silently blocked script never fires onerror — poll as a backstop.
      let attempts = 0;
      const check = () => {
        if (window.YT?.Player) {
          finish();
          return;
        }
        if (apiReadyPromise === null) return; // already failed
        if (++attempts > 200) {
          fail('YouTube API failed to load');
          return;
        }
        setTimeout(check, 50);
      };
      check();
    });
  }
  return apiReadyPromise;
}

/**
 * Report a swallowed player-load failure. Callers degrade gracefully, so
 * without this the breakage would be invisible in error tracking.
 */
export function captureYoutubeLoadFailure(error: unknown, where: string): void {
  void import('@sentry/nextjs')
    .then((Sentry) => {
      Sentry.captureException(error, {
        level: 'warning',
        tags: { feature: 'youtube-player', where },
      });
    })
    .catch(() => { /* reporting is best-effort */ });
}

export type { YTPlayer, YTNamespace };

export const YT_PLAYING = 1;
export const YT_PAUSED = 2;
export const YT_ENDED = 0;
