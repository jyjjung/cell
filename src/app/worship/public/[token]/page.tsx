"use client";

import { useEffect, useMemo, useState } from 'react';
import { FullScreenViewer, type ViewerSlide } from '@/components/worship/FullScreenViewer';
import { PageLoading } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { splitSheetsForViewer } from '@/lib/chord-chart';
import { getReferenceTracks, resolveChordSheetsForSetlistSong } from '@/lib/worship-utils';
import type { SetlistSong, WorshipSetlist, WorshipSong } from '@/types';

type PublicData = { setlist: WorshipSetlist; songs: WorshipSong[] };

export default function PublicSetlistPage({ params }: { params: Promise<{ token: string }> }) {
  const [data, setData] = useState<PublicData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    void params.then(({ token }) => fetch(`/api/worship/setlists/public/${encodeURIComponent(token)}`))
      .then(async (response) => {
        const body = await response.json() as PublicData & { error?: string };
        if (!response.ok) throw new Error(body.error || 'Could not load setlist');
        setData(body);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not load setlist'));
  }, [params]);

  const slides = useMemo<ViewerSlide[]>(() => {
    if (!data) return [];
    const songsById = new Map(data.songs.map((song) => [song.id, song]));
    return [...data.setlist.songs].sort((a, b) => a.order - b.order).flatMap((setlistSong: SetlistSong) => {
      const song = songsById.get(setlistSong.songId);
      const sheets = resolveChordSheetsForSetlistSong(song, setlistSong);
      const tracks = getReferenceTracks(setlistSong);
      return sheets.length > 0 || tracks.length > 0 ? [{
        songTitle: setlistSong.title,
        key: setlistSong.key,
        ...splitSheetsForViewer(sheets),
        songId: song?.id,
        annotationId: setlistSong.annotationId,
        referenceTracks: tracks.length > 0 ? tracks : undefined,
      }] : [];
    });
  }, [data]);

  if (!data && !error) return <PageLoading />;
  if (error) {
    return <main className="page-container flex min-h-screen items-center justify-center p-6"><div className="text-center"><h1 className="text-xl font-semibold">Setlist unavailable</h1><p className="mt-2 text-muted-foreground">{error}</p></div></main>;
  }
  if (closed) return null;
  if (slides.length === 0) {
    return <main className="page-container flex min-h-screen items-center justify-center p-6"><div className="text-center"><h1 className="text-xl font-semibold">{data?.setlist.name}</h1><p className="mt-2 text-muted-foreground">This setlist has no available charts.</p><Button className="mt-4" onClick={() => setClosed(true)}>Close</Button></div></main>;
  }
  return <FullScreenViewer slides={slides} title={data?.setlist.name} mode="continuous" onClose={() => setClosed(true)} />;
}
