import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';
import { hashShareToken, shareTokenFromRequest } from '@/lib/file-share';

export async function GET(_request: NextRequest, props: { params: Promise<{ token: string }> }) {
  const { token: tokenValue } = await props.params;
  const token = shareTokenFromRequest(tokenValue);
  if (!token) return NextResponse.json({ error: 'Share link not found' }, { status: 404 });

  try {
    const db = getAdminDb(getAdminApp());
    const share = await db.collection('worshipSetlistShares').doc(hashShareToken(token)).get();
    const setlistId = share.data()?.setlistId;
    if (!share.exists || typeof setlistId !== 'string') {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    const setlist = await db.collection('worshipSetlists').doc(setlistId).get();
    if (!setlist.exists) return NextResponse.json({ error: 'Setlist not found' }, { status: 404 });
    const data = setlist.data() ?? {};
    const songs = Array.isArray(data.songs) ? data.songs : [];
    const songIds = [...new Set(songs.map((song) => (
      song && typeof song === 'object' && typeof song.songId === 'string' ? song.songId : null
    )).filter((id): id is string => Boolean(id)))];
    const songDocs = await Promise.all(songIds.map((id) => db.collection('worshipSongs').doc(id).get()));
    const librarySongs = songDocs.filter((doc) => doc.exists).map((doc) => {
      const song = doc.data() ?? {};
      const chordSheets = Array.isArray(song.chordSheets) ? song.chordSheets : [];
      return {
        id: doc.id,
        title: typeof song.title === 'string' ? song.title : '',
        chordSheets: chordSheets.map((sheet) => ({
          id: sheet.id,
          key: sheet.key,
          imageUrl: sheet.imageUrl,
          storagePath: sheet.storagePath,
          kind: sheet.kind,
          sourceText: sheet.sourceText,
          sourceHtml: sheet.sourceHtml,
        })),
      };
    });

    return NextResponse.json({
      setlist: {
        id: setlist.id,
        name: typeof data.name === 'string' ? data.name : 'Setlist',
        date: typeof data.date === 'string' ? data.date : '',
        songs,
      },
      songs: librarySongs,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[worship/setlists/public] Failed to load public setlist:', error);
    return NextResponse.json({ error: 'Could not load shared setlist' }, { status: 500 });
  }
}
