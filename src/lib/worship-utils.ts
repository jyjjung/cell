import type { WorshipSong, SetlistSong, SongChordSheet } from '@/types';

const YOUTUBE_ID_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/i;

/** Extract a YouTube video ID from a watch, youtu.be, or embed URL. */
export function parseYoutubeVideoId(url: string): string | null {
  if (!url.trim()) return null;
  const match = url.trim().match(YOUTUBE_ID_REGEX);
  return match ? match[1] : null;
}

/** Normalize a YouTube URL to a canonical watch URL, or return null if invalid. */
export function normalizeYoutubeUrl(url: string): string | null {
  const id = parseYoutubeVideoId(url);
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

const youtubeTitleCache = new Map<string, string>();

/** Fetch a YouTube video title via oEmbed (no API key required). */
export async function fetchYoutubeVideoTitle(videoId: string): Promise<string | null> {
  const cached = youtubeTitleCache.get(videoId);
  if (cached) return cached;

  try {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string };
    const title = data.title?.trim();
    if (title) {
      youtubeTitleCache.set(videoId, title);
      return title;
    }
  } catch {
    /* offline or blocked */
  }
  return null;
}

/** Resolve which chord sheets to use for a setlist song entry. */
export function resolveChordSheetsForSetlistSong(
  libSong: WorshipSong | undefined,
  setlistSong: Pick<SetlistSong, 'key' | 'chordSheetIds'>,
): SongChordSheet[] {
  if (!libSong) return [];
  const forKey = libSong.chordSheets.filter((s) => s.key === setlistSong.key);
  if (!setlistSong.chordSheetIds || setlistSong.chordSheetIds.length === 0) {
    return forKey;
  }
  const idSet = new Set(setlistSong.chordSheetIds);
  return forKey.filter((s) => idSet.has(s.id));
}

/** Sheets available for a key on a library song (no setlist selection applied). */
export function chordSheetsForKey(
  libSong: WorshipSong | undefined,
  key: SetlistSong['key'],
): SongChordSheet[] {
  if (!libSong) return [];
  return libSong.chordSheets.filter((s) => s.key === key);
}
