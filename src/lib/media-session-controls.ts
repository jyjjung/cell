export type MediaSessionHandlers = {
  onPlay?: () => void;
  onPause?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onSeek?: (time: number) => void;
};

export function syncMediaSessionMetadata(opts: {
  title: string;
  artist: string;
  album?: string;
}) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: opts.title,
      artist: opts.artist,
      album: opts.album ?? 'Reference tracks',
    });
  } catch {
    /* unsupported */
  }
}

export function syncMediaSessionPosition(opts: {
  duration: number;
  position: number;
  playing: boolean;
}) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  if (!Number.isFinite(opts.duration) || opts.duration <= 0) return;
  try {
    navigator.mediaSession.setPositionState({
      duration: opts.duration,
      playbackRate: opts.playing ? 1 : 0,
      position: Math.min(Math.max(0, opts.position), opts.duration),
    });
  } catch {
    /* unsupported */
  }
}

export function bindMediaSessionHandlers(handlers: MediaSessionHandlers) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return () => {};

  const set = (
    action: MediaSessionAction,
    handler: ((details: MediaSessionActionDetails) => void) | null,
  ) => {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch {
      /* unsupported */
    }
  };

  set('play', handlers.onPlay ? () => handlers.onPlay?.() : null);
  set('pause', handlers.onPause ? () => handlers.onPause?.() : null);
  set('previoustrack', handlers.onPrevious ? () => handlers.onPrevious?.() : null);
  set('nexttrack', handlers.onNext ? () => handlers.onNext?.() : null);
  set('seekto', handlers.onSeek
    ? (details) => {
        const time = details.seekTime;
        if (typeof time === 'number') handlers.onSeek?.(time);
      }
    : null);

  return () => {
    set('play', null);
    set('pause', null);
    set('previoustrack', null);
    set('nexttrack', null);
    set('seekto', null);
  };
}

export function setMediaSessionPlaybackState(playing: boolean) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  } catch {
    /* unsupported */
  }
}
