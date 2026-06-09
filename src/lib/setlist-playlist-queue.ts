import type { ReferenceTrack, SetlistSong, WorshipSetlist } from '@/types';
import { getReferenceTracks, parseYoutubeVideoId } from '@/lib/worship-utils';

export interface PlaylistQueueItem {
  id: string;
  songTitle: string;
  songKey: SetlistSong['key'];
  note?: string;
  url: string;
  videoId: string;
}

export function buildSetlistPlaylistQueue(setlist: WorshipSetlist): PlaylistQueueItem[] {
  const ordered = [...setlist.songs].sort((a, b) => a.order - b.order);
  const items: PlaylistQueueItem[] = [];

  for (const song of ordered) {
    const tracks = getReferenceTracks(song);
    tracks.forEach((track: ReferenceTrack, trackIndex: number) => {
      const videoId = parseYoutubeVideoId(track.url);
      if (!videoId) return;
      items.push({
        id: `${song.songId}-${trackIndex}-${videoId}`,
        songTitle: song.title,
        songKey: song.key,
        note: track.note,
        url: track.url,
        videoId,
      });
    });
  }

  return items;
}

export function playlistItemLabel(item: PlaylistQueueItem): string {
  return item.note?.trim() || item.songTitle;
}
