import { isTextChordSheet } from '@/lib/chord-chart';
import type { WorshipSong, SetlistSong, SongChordSheet, ReferenceTrack } from '@/types';

const YOUTUBE_ID_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/i;

/** Extract a YouTube video ID from a watch, youtu.be, or embed URL. */
export function parseYoutubeVideoId(url: string): string | null {
  if (!url.trim()) return null;
  const match = url.trim().match(YOUTUBE_ID_REGEX);
  return match ? match[1] : null;
}

/** Normalize a YouTube URL to a canonical watch URL, or return null if invalid. */
function normalizeYoutubeUrl(url: string): string | null {
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

export function getReferenceTracks(
  song: Pick<SetlistSong, 'referenceTracks'>,
): ReferenceTrack[] {
  return song.referenceTracks?.filter((track) => parseYoutubeVideoId(track.url)) ?? [];
}

export function hasReferenceTracks(
  song: Pick<SetlistSong, 'referenceTracks'>,
): boolean {
  return getReferenceTracks(song).length > 0;
}

export type ReferenceTrackDraft = { url: string; note: string };

/** Editor rows from saved setlist song data (always at least one row). */
export function referenceTracksToDrafts(
  song: Pick<SetlistSong, 'referenceTracks'>,
): ReferenceTrackDraft[] {
  const tracks = getReferenceTracks(song);
  if (tracks.length === 0) return [{ url: '', note: '' }];
  return tracks.map((t) => ({ url: t.url, note: t.note ?? '' }));
}

/** Normalize editor rows for persistence; drops empty/invalid URLs. */
export function normalizeReferenceTrackDrafts(
  drafts: ReferenceTrackDraft[],
): ReferenceTrack[] | undefined {
  const tracks = drafts
    .map((d) => {
      const url = normalizeYoutubeUrl(d.url.trim());
      if (!url) return null;
      const note = d.note.trim();
      return { url, ...(note ? { note } : {}) };
    })
    .filter((t): t is ReferenceTrack => t !== null);
  return tracks.length > 0 ? tracks : undefined;
}

/** True if any non-empty draft URL is invalid. */
export function referenceTrackDraftsInvalid(drafts: ReferenceTrackDraft[]): boolean {
  return drafts.some((d) => d.url.trim().length > 0 && !parseYoutubeVideoId(d.url));
}

/** Image scans must match the key; pasted text charts transpose to any key. */
export function sheetUsableInKey(sheet: SongChordSheet, key: SetlistSong['key']): boolean {
  return sheet.key === key || isTextChordSheet(sheet);
}

/** Resolve which chord sheets to use for a setlist song entry. */
export function resolveChordSheetsForSetlistSong(
  libSong: WorshipSong | undefined,
  setlistSong: Pick<SetlistSong, 'key' | 'chordSheetIds'>,
): SongChordSheet[] {
  const forKey = chordSheetsForKey(libSong, setlistSong.key);
  if (!setlistSong.chordSheetIds || setlistSong.chordSheetIds.length === 0) {
    return forKey;
  }
  const idSet = new Set(setlistSong.chordSheetIds);
  const selected = forKey.filter((s) => idSet.has(s.id));
  return selected.length > 0 ? selected : forKey;
}

/** Sheets available for a key on a library song (no setlist selection applied). */
export function chordSheetsForKey(
  libSong: WorshipSong | undefined,
  key: SetlistSong['key'],
): SongChordSheet[] {
  if (!libSong) return [];
  return libSong.chordSheets.filter((s) => sheetUsableInKey(s, key));
}
