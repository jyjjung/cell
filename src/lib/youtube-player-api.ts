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
      const fail = (message: string) => {
        apiReadyPromise = null;
        reject(new Error(message));
      };
      const finish = () => {
        if (window.YT?.Player) resolve(window.YT);
        else fail('YouTube API failed to load');
      };
      const existing = document.querySelector<HTMLScriptElement>('script[src*="youtube.com/iframe_api"]');
      const previousReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previousReady?.();
        finish();
      };
      if (!existing) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        tag.onerror = () => fail('YouTube API script failed');
        document.head.appendChild(tag);
      } else {
        // Script tag already present — poll briefly if ready callback already ran
        let attempts = 0;
        const check = () => {
          if (window.YT?.Player) {
            finish();
            return;
          }
          if (++attempts > 100) {
            fail('YouTube API script failed');
            return;
          }
          setTimeout(check, 50);
        };
        check();
      }
    });
  }
  return apiReadyPromise;
}

export type { YTPlayer, YTNamespace };

export const YT_PLAYING = 1;
export const YT_PAUSED = 2;
export const YT_ENDED = 0;
