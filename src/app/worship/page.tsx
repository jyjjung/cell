"use client";

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useClientSearchParams } from '@/hooks/use-client-search-params';
import { format, parseISO } from 'date-fns';
import {
  Music, Plus, ListMusic, BookOpen, ChevronRight, ChevronLeft,
  Trash2, X, Upload, Image as ImageIcon, Calendar, Loader2,
  Eye, ArrowLeft, GripVertical, Check, Search, Music2, Pencil, Save,
  Users, UserPlus, Link2, UserCheck, UserX, Shield, Download,
  ChevronUp, ChevronDown, RefreshCw, Youtube
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NavPageHeader } from '@/components/ui/page-layout';
import { cn } from '@/lib/utils';
import { formatNameString } from '@/lib/formatting';
import { useWorshipSongs } from '@/hooks/useWorshipSongs';
import { useWorshipSetlists } from '@/hooks/useWorshipSetlists';
import { useWorshipRosters } from '@/hooks/useWorshipRosters';
import { useAllUsers } from '@/hooks/use-all-users';
import { useAuth } from '@/contexts/auth-context';
import type {
  WorshipSong, WorshipSetlist, SetlistSong, ChordKey, SongChordSheet,
  WorshipRoster, WorshipRosterSlot, WorshipRosterMember, WorshipRole,
} from '@/types';
import { mergeWorshipRosterSlots } from '@/types';
import { RemoteImage } from '@/components/ui/remote-image';
import { FullScreenViewer, ViewerSlide } from '@/components/worship/FullScreenViewer';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { translations } from '@/lib/translations';
import {
  NewSongDialog, NewSetlistDialog, NewRosterDialog, AddChordSheetDialog,
  SetlistSongConfigPanel,
} from '@/components/worship/WorshipDialogs';
import { WorshipDataProvider } from '@/contexts/worship-data-context';
import { ReferenceTracksListen } from '@/components/worship/YoutubeReferenceEmbed';
import {
  resolveChordSheetsForSetlistSong, chordSheetsForKey,
  hasReferenceTracks, getReferenceTracks,
  referenceTracksToDrafts, normalizeReferenceTrackDrafts,
  referenceTrackDraftsInvalid, type ReferenceTrackDraft,
} from '@/lib/worship-utils';

// ── Constants ────────────────────────────────────────────────────────────────

const ALL_KEYS: ChordKey[] = [
  'numbers',
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F',
  'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
];

const KEY_LABEL: Record<ChordKey, string> = {
  numbers: '#', C: 'C', 'C#': 'C#', Db: 'Db', D: 'D', 'D#': 'D#',
  Eb: 'Eb', E: 'E', F: 'F', 'F#': 'F#', Gb: 'Gb', G: 'G',
  'G#': 'G#', Ab: 'Ab', A: 'A', 'A#': 'A#', Bb: 'Bb', B: 'B',
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] } }),
};

async function downloadImage(url: string, filename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(blobUrl);
    document.body.removeChild(a);
  } catch (e) {
    window.open(url, '_blank');
  }
}

// ── KeyBadge ─────────────────────────────────────────────────────────────────
function KeyBadge({ keyName, accent = false }: { keyName: ChordKey; accent?: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center justify-center min-w-[2rem] h-6 px-1.5 rounded-lg text-[11px] font-semibold tracking-tight border',
      accent
        ? 'bg-muted border-border text-primary'
        : 'bg-muted border-border/40 text-muted-foreground'
    )}>
      {keyName === 'numbers' ? '#' : keyName}
    </span>
  );
}

// Dialogs are now imported from '@/components/worship/WorshipDialogs'

// ── FullScreenViewer ─────────────────────────────────────────────────────────
// (ViewerSlide removed, imported from components/worship/FullScreenViewer)




// ── SongDetailView ────────────────────────────────────────────────────────────
function SongDetailView({
  song, onBack,
}: { song: WorshipSong; onBack: () => void }) {
  const { removeChordSheet, updateSong } = useWorshipSongs();
  const { toast } = useToast();
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [viewSheet, setViewSheet] = useState<SongChordSheet | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(song.title);
  const [editArtist, setEditArtist] = useState(song.artist || '');
  const [saving, setSaving] = useState(false);
  const { addChordSheet } = useWorshipSongs();

  const handleConvertPdf = async (sheet: SongChordSheet) => {
    setConvertingId(sheet.id);
    try {
      toast({ title: 'Downloading PDF...' });
      const res = await fetch(sheet.imageUrl);
      const blob = await res.blob();
      const file = new File([blob], `${song.title}_key_${sheet.key}.pdf`, { type: 'application/pdf' });
      
      toast({ title: 'Converting to images...' });
      const { convertPdfToImages } = await import('@/lib/pdfUtils');
      const blobs = await convertPdfToImages(file, 2);
      
      toast({ title: `Uploading ${blobs.length} pages...` });
      for (let i = 0; i < blobs.length; i++) {
        const pageFile = new File([blobs[i]], `${song.title}_pg${i+1}.jpg`, { type: 'image/jpeg' });
        await addChordSheet(song.id, pageFile, sheet.key);
      }
      
      await removeChordSheet(song.id, sheet);
      toast({ title: 'Conversion complete!' });
    } catch (e: any) {
      toast({ title: 'Conversion failed', description: e.message, variant: 'destructive' });
    } finally {
      setConvertingId(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    setSaving(true);
    try {
      await updateSong(song.id, { title: editTitle.trim(), artist: editArtist.trim() || null });
      toast({ title: 'Song updated' });
      setEditing(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const groupedByKey = useMemo(() => {
    const map = new Map<ChordKey, SongChordSheet[]>();
    for (const s of song.chordSheets) {
      if (!map.has(s.key)) map.set(s.key, []);
      map.get(s.key)!.push(s);
    }
    return map;
  }, [song.chordSheets]);

  const handleDelete = async (sheet: SongChordSheet) => {
    setDeleting(sheet.id);
    try {
      await removeChordSheet(song.id, sheet);
      toast({ title: 'Chord sheet removed' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setDeleting(null); }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-6">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl h-9 w-9 mt-0.5">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2">
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                className="rounded-xl h-9 font-bold" placeholder="Song title" />
              <Input value={editArtist} onChange={e => setEditArtist(e.target.value)}
                className="rounded-xl h-8 text-sm" placeholder="Artist (optional)" />
            </div>
          ) : (
            <>
              <h2 className="font-semibold text-lg normal-case not-italic leading-tight truncate">{song.title}</h2>
              {song.artist && <p className="text-xs text-muted-foreground/60 font-medium">{song.artist}</p>}
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {editing ? (
            <>
              <Button size="sm" variant="ghost" className="rounded-xl h-9" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" className="rounded-xl h-9 gap-1.5"
                onClick={handleSaveEdit} disabled={!editTitle.trim() || saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" className="rounded-xl h-9 gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => { setEditTitle(song.title); setEditArtist(song.artist || ''); setEditing(true); }}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
              <Button size="sm" className="rounded-xl h-9 gap-1.5"
                onClick={() => setAddSheetOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Add Sheet
              </Button>
            </>
          )}
        </div>
      </div>

      {song.chordSheets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl border-2 border-dashed border-border/40 text-center">
          <ImageIcon className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="font-semibold text-muted-foreground">No chord sheets yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Add sheet images for different keys above.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Array.from(groupedByKey.entries()).map(([key, sheets]) => (
            <div key={key} className="space-y-3">
              <div className="flex items-center gap-2">
                <KeyBadge keyName={key} accent />
                <span className="text-xs text-muted-foreground font-semibold">{sheets.length} image{sheets.length > 1 ? 's' : ''}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {sheets.map((sheet, idx) => (
                  <div key={sheet.id} className="relative group rounded-2xl overflow-hidden border border-border/40 bg-muted aspect-[3/4]">
                    {sheet.imageUrl.toLowerCase().includes('.pdf') ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-muted group-hover:bg-muted transition-colors">
                        <BookOpen className="h-10 w-10 text-primary" />
                        <span className="text-[10px] font-semibold text-primary mt-2">PDF DOCUMENT</span>
                      </div>
                    ) : (
                      <RemoteImage src={sheet.imageUrl} alt={`${key} pg ${idx + 1}`}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="200px" />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center gap-2 p-2">
                      <button onClick={() => setViewSheet(sheet)}
                        title="View sheet"
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        title="Download sheet"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadImage(sheet.imageUrl, `${song.title} - Key ${key} (Pg ${idx + 1}).png`);
                        }}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      {sheet.imageUrl.toLowerCase().includes('.pdf') && (
                        <button
                          title="Convert PDF to Images"
                          onClick={(e) => { e.stopPropagation(); handleConvertPdf(sheet); }}
                          disabled={convertingId === sheet.id}
                          className="p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/10 text-white transition-colors">
                          {convertingId === sheet.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      <button onClick={() => handleDelete(sheet)}
                        title="Delete sheet"
                        disabled={deleting === sheet.id}
                        className="p-1.5 rounded-lg bg-destructive hover:bg-destructive text-destructive-foreground transition-colors">
                        {deleting === sheet.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <span className="absolute top-1.5 left-1.5 text-[10px] font-semibold bg-black/40 text-white px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                      Pg {idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddChordSheetDialog open={addSheetOpen} song={song} onClose={() => setAddSheetOpen(false)} />

      {/* Full-screen image viewer — slides through all sheets for this song */}
      {viewSheet && (() => {
        const allSheets = song.chordSheets;
        const slides: ViewerSlide[] = Array.from(
          allSheets.reduce((map, s) => {
            if (!map.has(s.key)) map.set(s.key, []);
            map.get(s.key)!.push(s);
            return map;
          }, new Map<ChordKey, SongChordSheet[]>())
        ).map(([key, sheets]) => ({
            imageUrls: sheets.map(s => s.imageUrl),
            songTitle: song.title,
            key,
          } as ViewerSlide)
        );
        const start = slides.findIndex(sl => sl.imageUrls.includes(viewSheet.imageUrl));
        return <FullScreenViewer slides={slides} startIndex={Math.max(0, start)} onClose={() => setViewSheet(null)} />;
      })()}
    </motion.div>
  );
}

// ── SongsLibraryTab ───────────────────────────────────────────────────────────
function SongsLibraryTab({ openNewSignal }: { openNewSignal?: number }) {
  const { songs, loading, deleteSong, addChordSheet, removeChordSheet } = useWorshipSongs();
  const [newSongOpen, setNewSongOpen] = useState(false);
  const [addSheetSong, setAddSheetSong] = useState<WorshipSong | null>(null);
  const [detailSong, setDetailSong] = useState<WorshipSong | null>(null);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<WorshipSong | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (openNewSignal && openNewSignal > 0) setNewSongOpen(true);
  }, [openNewSignal]);

  const filtered = useMemo(() =>
    songs.filter(s => s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.artist?.toLowerCase().includes(search.toLowerCase()))),
    [songs, search]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await deleteSong(deleteConfirm);
      toast({ title: 'Song deleted' });
      setDeleteConfirm(null);
      if (detailSong?.id === deleteConfirm.id) setDetailSong(null);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setDeleting(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <AnimatePresence mode="wait">
      {detailSong ? (
        <SongDetailView key="detail" song={songs.find(s => s.id === detailSong.id) || detailSong}
          onBack={() => setDetailSong(null)} />
      ) : (
        <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
              <Input placeholder="Search songs…" value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 rounded-xl h-10" />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-xl border-2 border-dashed border-border/40 text-center">
              <Music className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="font-semibold text-muted-foreground">{songs.length === 0 ? 'No songs yet' : 'No results'}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {songs.length === 0 ? 'Add songs to build your worship library.' : 'Try a different search.'}
              </p>
            </div>
          ) : (
            <div className="ui-card !p-0">
              <div className="ui-list px-2">
              {filtered.map((song, i) => (
                <motion.button
                  type="button"
                  key={song.id}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  className="event-row group"
                  onClick={() => setDetailSong(song)}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                    <Music2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="event-row-body">
                    <p className="event-row-title">{song.title}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      {song.artist && <span className="event-row-meta">{song.artist}</span>}
                      {song.chordSheets.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                          {Array.from(new Set(song.chordSheets.map(s => s.key))).slice(0, 4).map(k => (
                            <KeyBadge key={k} keyName={k} />
                          ))}
                          {new Set(song.chordSheets.map(s => s.key)).size > 4 && (
                            <span className="text-[10px] text-muted-foreground">+{new Set(song.chordSheets.map(s => s.key)).size - 4}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100" onClick={e => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:text-primary hover:bg-muted"
                      onClick={() => { setAddSheetSong(song); }}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteConfirm(song)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" />
                </motion.button>
              ))}
              </div>
            </div>
          )}

          <NewSongDialog open={newSongOpen} onClose={() => setNewSongOpen(false)}
            onCreated={(id) => { const s = songs.find(x => x.id === id); if (s) setDetailSong(s); }} />
          <AddChordSheetDialog open={!!addSheetSong} song={addSheetSong} onClose={() => setAddSheetSong(null)} />

          {/* Delete confirm dialog */}
          <Dialog open={!!deleteConfirm} onOpenChange={v => !v && setDeleteConfirm(null)}>
            <DialogContent className="rounded-xl p-8 border-border/50 bg-card/95 backdrop-blur-3xl max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold normal-case not-italic">Delete &ldquo;{deleteConfirm?.title}&rdquo;?</DialogTitle>
                <DialogDescription>This will permanently remove the song and all its chord sheet images.</DialogDescription>
              </DialogHeader>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                <Button variant="destructive" className="flex-1 rounded-xl" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4" />} Delete
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function buildChordSheetIdsOption(
  libSong: WorshipSong,
  key: ChordKey,
  selectedSheetIds: string[],
): string[] | undefined {
  const sheetsForKey = chordSheetsForKey(libSong, key);
  if (sheetsForKey.length <= 1) return undefined;
  if (selectedSheetIds.length > 0 && selectedSheetIds.length < sheetsForKey.length) {
    return selectedSheetIds;
  }
  return undefined;
}

function useSetlistSongSheetSelection(song: WorshipSong | null, selectedKey: ChordKey) {
  const [selectedSheetIds, setSelectedSheetIds] = useState<string[]>([]);
  const prevKeyRef = useRef<ChordKey | null>(null);
  const prevSongIdRef = useRef<string | null>(null);
  const prevSheetCountRef = useRef(0);

  useEffect(() => {
    if (!song) {
      setSelectedSheetIds([]);
      prevKeyRef.current = null;
      prevSongIdRef.current = null;
      prevSheetCountRef.current = 0;
      return;
    }
    const sheets = chordSheetsForKey(song, selectedKey);
    const keyOrSongChanged =
      prevKeyRef.current !== selectedKey || prevSongIdRef.current !== song.id;
    const sheetsAdded = sheets.length > prevSheetCountRef.current;

    prevKeyRef.current = selectedKey;
    prevSongIdRef.current = song.id;
    prevSheetCountRef.current = sheets.length;

    if (keyOrSongChanged) {
      setSelectedSheetIds(sheets.map((s) => s.id));
    } else if (sheetsAdded) {
      setSelectedSheetIds((prev) => {
        const kept = prev.filter((id) => sheets.some((s) => s.id === id));
        const added = sheets.filter((s) => !prev.includes(s.id)).map((s) => s.id);
        return [...kept, ...added];
      });
    }
  }, [song, selectedKey]);

  return { selectedSheetIds, setSelectedSheetIds };
}

// ── AddSongToSetlistDialog ───────────────────────────────────────────────────
function AddSongToSetlistDialog({
  open, playlist, onClose,
}: { open: boolean; playlist: WorshipSetlist; onClose: () => void }) {
  const { songs } = useWorshipSongs();
  const { addSongToSetlist } = useWorshipSetlists();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedSong, setSelectedSong] = useState<WorshipSong | null>(null);
  const [selectedKey, setSelectedKey] = useState<ChordKey>('numbers');
  const [referenceTracks, setReferenceTracks] = useState<ReferenceTrackDraft[]>([{ url: '', note: '' }]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const liveSong = selectedSong ? (songs.find((s) => s.id === selectedSong.id) ?? selectedSong) : null;
  const { selectedSheetIds, setSelectedSheetIds } = useSetlistSongSheetSelection(liveSong, selectedKey);

  const filtered = useMemo(() => {
    const alreadyAdded = new Set(playlist.songs.map(s => s.songId));
    return songs.filter(s =>
      !alreadyAdded.has(s.id) &&
      (s.title.toLowerCase().includes(search.toLowerCase()) || s.artist?.toLowerCase().includes(search.toLowerCase()))
    );
  }, [songs, search, playlist.songs]);

  const tracksInvalid = referenceTrackDraftsInvalid(referenceTracks);

  const handleKeyChange = (key: ChordKey) => {
    setSelectedKey(key);
  };

  const handleAdd = async () => {
    if (!liveSong || tracksInvalid) return;
    setAdding(true);
    try {
      const normalizedTracks = normalizeReferenceTrackDrafts(referenceTracks);
      const chordSheetIds = buildChordSheetIdsOption(liveSong, selectedKey, selectedSheetIds);

      await addSongToSetlist(playlist, liveSong.id, liveSong.title, selectedKey, {
        referenceTracks: normalizedTracks,
        chordSheetIds,
      });
      toast({ title: 'Song added', description: `${liveSong.title} (${selectedKey === 'numbers' ? '#' : selectedKey}) added to setlist.` });
      reset();
      onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setAdding(false); }
  };

  const reset = () => {
    setSelectedSong(null);
    setSelectedKey('numbers');
    setReferenceTracks([{ url: '', note: '' }]);
    setSearch('');
  };

  const selectSong = (song: WorshipSong) => {
    setSelectedSong(song);
    const keys = Array.from(new Set(song.chordSheets.map(s => s.key)));
    setSelectedKey(keys.length > 0 ? keys[0] : 'numbers');
    setReferenceTracks([{ url: '', note: '' }]);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
        <DialogContent className="rounded-xl p-5 sm:p-8 border-border/50 bg-card/95 backdrop-blur-3xl max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-semibold normal-case not-italic tracking-tight">Add Song</DialogTitle>
            <DialogDescription>Choose a song, key, charts, and an optional reference track.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {!liveSong ? (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                  <Input placeholder="Search songs…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl" />
                </div>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      {songs.length === 0 ? 'No songs in library yet.' : 'No matching songs.'}
                    </p>
                  ) : filtered.map(song => (
                    <button key={song.id} onClick={() => selectSong(song)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted hover:border-border border border-transparent transition-all text-left">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Music2 className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{song.title}</p>
                        {song.artist && <p className="text-xs text-muted-foreground/60 truncate">{song.artist}</p>}
                      </div>
                      <div className="flex gap-1">
                        {Array.from(new Set(song.chordSheets.map(s => s.key))).slice(0, 3).map(k => (
                          <KeyBadge key={k} keyName={k} />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted border border-border">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Music2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{liveSong.title}</p>
                    {liveSong.artist && <p className="text-xs text-muted-foreground/60">{liveSong.artist}</p>}
                  </div>
                  <button type="button" onClick={() => { setSelectedSong(null); setSelectedKey('numbers'); setReferenceTracks([{ url: '', note: '' }]); }}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <SetlistSongConfigPanel
                  song={liveSong}
                  selectedKey={selectedKey}
                  onKeyChange={handleKeyChange}
                  selectedSheetIds={selectedSheetIds}
                  onSheetIdsChange={setSelectedSheetIds}
                  referenceTracks={referenceTracks}
                  onReferenceTracksChange={setReferenceTracks}
                  onRequestUpload={() => setUploadOpen(true)}
                  idPrefix="add-song"
                />
              </>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { reset(); onClose(); }}>Cancel</Button>
              <Button className="flex-1 rounded-xl"
                onClick={handleAdd} disabled={!liveSong || adding || tracksInvalid}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Add to Setlist
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddChordSheetDialog
        open={uploadOpen}
        song={liveSong}
        defaultKey={selectedKey}
        lockKey
        onUploaded={(ids) => setSelectedSheetIds((prev) => [...new Set([...prev, ...ids])])}
        onClose={() => setUploadOpen(false)}
      />
    </>
  );
}

// ── EditSetlistSongDialog ──────────────────────────────────────────────────────
function EditSetlistSongDialog({
  open, playlist, setlistSong, onClose,
}: {
  open: boolean;
  playlist: WorshipSetlist;
  setlistSong: SetlistSong | null;
  onClose: () => void;
}) {
  const { songs } = useWorshipSongs();
  const { updateSetlistSong } = useWorshipSetlists();
  const { toast } = useToast();
  const [selectedKey, setSelectedKey] = useState<ChordKey>('numbers');
  const [selectedSheetIds, setSelectedSheetIds] = useState<string[]>([]);
  const [referenceTracks, setReferenceTracks] = useState<ReferenceTrackDraft[]>([{ url: '', note: '' }]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const prevKeyRef = useRef<ChordKey | null>(null);
  const initRef = useRef<string | null>(null);

  const libSong = setlistSong ? songs.find((s) => s.id === setlistSong.songId) : null;

  useEffect(() => {
    if (!open) {
      initRef.current = null;
      return;
    }
    if (!setlistSong || !libSong) return;
    const token = setlistSong.songId;
    if (initRef.current === token) return;
    initRef.current = token;
    setSelectedKey(setlistSong.key);
    setReferenceTracks(referenceTracksToDrafts(setlistSong));
    prevKeyRef.current = setlistSong.key;
    const sheets = chordSheetsForKey(libSong, setlistSong.key);
    if (setlistSong.chordSheetIds?.length) {
      const valid = setlistSong.chordSheetIds.filter((id) => sheets.some((s) => s.id === id));
      setSelectedSheetIds(valid.length > 0 ? valid : sheets.map((s) => s.id));
    } else {
      setSelectedSheetIds(sheets.map((s) => s.id));
    }
  }, [open, setlistSong, libSong]);

  const handleKeyChange = (key: ChordKey) => {
    setSelectedKey(key);
    if (!libSong) return;
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key;
      const sheets = chordSheetsForKey(libSong, key);
      setSelectedSheetIds(sheets.map((s) => s.id));
    }
  };

  const tracksInvalid = referenceTrackDraftsInvalid(referenceTracks);

  const handleSave = async () => {
    if (!setlistSong || !libSong || tracksInvalid) return;
    setSaving(true);
    try {
      const normalizedTracks = normalizeReferenceTrackDrafts(referenceTracks);
      const chordSheetIds = buildChordSheetIdsOption(libSong, selectedKey, selectedSheetIds);

      await updateSetlistSong(playlist, setlistSong.songId, {
        key: selectedKey,
        referenceTracks: normalizedTracks ?? [],
        chordSheetIds: chordSheetIds ?? [],
      });
      toast({ title: 'Song updated' });
      onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (!setlistSong || !libSong) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={v => !v && onClose()}>
        <DialogContent className="rounded-xl p-5 sm:p-8 border-border/50 bg-card/95 backdrop-blur-3xl max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-semibold normal-case not-italic tracking-tight">Edit Song</DialogTitle>
            <DialogDescription>{setlistSong.title} — key, charts, and reference track for this setlist.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <SetlistSongConfigPanel
              song={libSong}
              selectedKey={selectedKey}
              onKeyChange={handleKeyChange}
              selectedSheetIds={selectedSheetIds}
              onSheetIdsChange={setSelectedSheetIds}
              referenceTracks={referenceTracks}
              onReferenceTracksChange={setReferenceTracks}
              onRequestUpload={() => setUploadOpen(true)}
              idPrefix="edit-song"
            />

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancel</Button>
              <Button className="flex-1 rounded-xl" onClick={handleSave} disabled={saving || tracksInvalid}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddChordSheetDialog
        open={uploadOpen}
        song={libSong}
        defaultKey={selectedKey}
        lockKey
        onUploaded={(ids) => setSelectedSheetIds((prev) => [...new Set([...prev, ...ids])])}
        onClose={() => setUploadOpen(false)}
      />
    </>
  );
}

// ── SetlistDetailView ────────────────────────────────────────────────────────
function SetlistDetailView({
  playlist, onBack, initialSongId
}: { playlist: WorshipSetlist; onBack: () => void; initialSongId?: string | null }) {
  const { removeSongFromSetlist, reorderSetlistSongs } = useWorshipSetlists();
  const { songs } = useWorshipSongs();
  const { toast } = useToast();
  const [addSongOpen, setAddSongOpen] = useState(false);
  const [editSong, setEditSong] = useState<SetlistSong | null>(null);
  // Full-screen viewer: flat slide index across ALL songs, or null if closed
  const [viewerStart, setViewerStart] = useState<number | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  // Chord sheet from playlist
  const [addSheetFor, setAddSheetFor] = useState<{ song: WorshipSong; key: ChordKey } | null>(null);
  const [orderedSongs, setOrderedSongs] = useState(() => [...playlist.songs].sort((a, b) => a.order - b.order));
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderDirty, setReorderDirty] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const dragIdx = useRef<number | null>(null);
  const dragOverIdx = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);

  // Keep orderedSongs in sync when playlist updates from Firestore (only if not in reorder mode)
  const prevPlaylistRef = useRef(playlist);
  if (prevPlaylistRef.current !== playlist && !reorderDirty) {
    prevPlaylistRef.current = playlist;
    setOrderedSongs([...playlist.songs].sort((a, b) => a.order - b.order));
  }

  const handleDragStart = (i: number) => { dragIdx.current = i; setDragging(true); };
  const handleDragEnter = (i: number) => { dragOverIdx.current = i; };
  const handleDragEnd = () => {
    setDragging(false);
    const from = dragIdx.current;
    const to = dragOverIdx.current;
    dragIdx.current = null; dragOverIdx.current = null;
    if (from === null || to === null || from === to) return;
    const reordered = [...orderedSongs];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setOrderedSongs(reordered.map((s, i) => ({ ...s, order: i })));
    setReorderDirty(true);
  };

  const handleSaveOrder = async () => {
    setSavingOrder(true);
    try {
      await reorderSetlistSongs(playlist.id, orderedSongs);
      toast({ title: 'Order saved' });
      setReorderDirty(false);
      setReorderMode(false);
    } catch (e: any) {
      toast({ title: 'Reorder failed', description: e.message, variant: 'destructive' });
    } finally { setSavingOrder(false); }
  };

  const handleCancelReorder = () => {
    setOrderedSongs([...playlist.songs].sort((a, b) => a.order - b.order));
    setReorderDirty(false);
    setReorderMode(false);
  };

  const handleMove = (idx: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= orderedSongs.length) return;
    
    const reordered = [...orderedSongs];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(newIdx, 0, moved);
    
    setOrderedSongs(reordered.map((s, i) => ({ ...s, order: i })));
    setReorderDirty(true);
  };

  const handleRemove = async (songId: string) => {
    setRemoving(songId);
    try {
      await removeSongFromSetlist(playlist, songId);
      toast({ title: 'Song removed from setlist' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setRemoving(null); }
  };

  // Build flat slide array across all ordered songs
  const allSlides = useMemo<ViewerSlide[]>(() => {
    const slides: ViewerSlide[] = [];
    for (const ps of orderedSongs) {
      const libSong = songs.find(s => s.id === ps.songId);
      const sheets = resolveChordSheetsForSetlistSong(libSong, ps);
      const tracks = getReferenceTracks(ps);
      if (sheets.length > 0 || tracks.length > 0) {
        slides.push({
          songTitle: ps.title,
          key: ps.key,
          imageUrls: sheets.map(s => s.imageUrl),
          referenceTracks: tracks.length > 0 ? tracks : undefined,
        });
      }
    }
    return slides;
  }, [orderedSongs, songs]);

  // Auto-open song if initialSongId is provided
  const didInitSong = useRef(false);
  useEffect(() => {
    if (!didInitSong.current && initialSongId && songs.length > 0 && allSlides.length > 0) {
      const ps = playlist.songs.find(s => s.songId === initialSongId);
      if (ps) {
        const firstSheetIdx = allSlides.findIndex(sl => sl.songTitle === ps.title && sl.key === ps.key);
        if (firstSheetIdx !== -1) {
          setViewerStart(firstSheetIdx);
        }
      }
      didInitSong.current = true;
    }
  }, [initialSongId, songs, playlist.songs, allSlides]);

  const openSheets = (ps: SetlistSong) => {
    const libSong = songs.find(s => s.id === ps.songId);
    const sheets = resolveChordSheetsForSetlistSong(libSong, ps);
    const tracks = getReferenceTracks(ps);
    if (sheets.length === 0 && tracks.length === 0) {
      toast({ title: 'No chord sheets', description: `No sheets saved for key ${ps.key}.` });
      return;
    }
    const startIdx = allSlides.findIndex(sl => sl.songTitle === ps.title && sl.key === ps.key);
    setViewerStart(Math.max(0, startIdx));
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl h-9 w-9">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-lg normal-case not-italic leading-tight truncate">{playlist.name}</h2>
          <p className="text-xs text-muted-foreground/60 font-medium flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(parseISO(playlist.date), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {orderedSongs.length > 1 && (
            <Button size="sm" variant="outline"
              className={cn('rounded-xl h-9 gap-1.5 transition-all', reorderMode && 'border-amber-500/50 text-amber-600 bg-amber-500/10')}
              onClick={() => reorderMode ? handleCancelReorder() : setReorderMode(true)}>
              <GripVertical className="h-3.5 w-3.5" />
              {reorderMode ? 'Cancel' : 'Reorder'}
            </Button>
          )}
          {reorderMode && reorderDirty && (
            <Button size="sm" className="rounded-xl h-9 gap-1.5" onClick={handleSaveOrder} disabled={savingOrder}>
              {savingOrder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
            </Button>
          )}
          {!reorderMode && (
            <Button size="sm" className="rounded-xl h-9 gap-1.5"
              onClick={() => setAddSongOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Add Song
            </Button>
          )}
        </div>
      </div>

      {orderedSongs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl border-2 border-dashed border-border/40 text-center">
          <ListMusic className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="font-semibold text-muted-foreground">No songs yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Add songs from the library to build this setlist.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reorderMode && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-600">
              <GripVertical className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Drag songs to reorder, then click Save.</span>
              <span className="sm:hidden">Use arrows to reorder, then click Save.</span>
            </div>
          )}
        <div className="ui-card !p-0">
          <div className="ui-list px-2">
          {orderedSongs.map((ps, i) => {
            const libSong = songs.find(s => s.id === ps.songId);
            const sheetsForKey = resolveChordSheetsForSetlistSong(libSong, ps);
            const refTracks = getReferenceTracks(ps);
            const canOpenViewer = sheetsForKey.length > 0 || refTracks.length > 0;
            return (
              <div
                key={ps.songId}
                draggable={reorderMode}
                onDragStart={reorderMode ? () => handleDragStart(i) : undefined}
                onDragEnter={reorderMode ? () => handleDragEnter(i) : undefined}
                onDragOver={reorderMode ? e => e.preventDefault() : undefined}
                onDragEnd={reorderMode ? handleDragEnd : undefined}
                className={cn(
                  'event-row group',
                  reorderMode ? 'cursor-grab active:cursor-grabbing' : '',
                  dragging && dragIdx.current === i ? 'opacity-40' : ''
                )}>
                {reorderMode ? (
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0 hidden sm:block" />
                ) : (
                  <div className="w-4 shrink-0 hidden sm:block" />
                )}
                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-primary">{i + 1}</span>
                </div>
                <div
                  className={cn(
                    'event-row-body',
                    !reorderMode && canOpenViewer && 'cursor-pointer'
                  )}
                  onClick={!reorderMode && canOpenViewer ? () => openSheets(ps) : undefined}
                >
                  <p className={cn(
                    'event-row-title',
                    !reorderMode && canOpenViewer && 'group-hover:text-primary'
                  )}>{ps.title}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <KeyBadge keyName={ps.key} accent />
                    {sheetsForKey.length > 0 ? (
                      <span className="text-[10px] font-bold text-green-600 dark:text-green-600 flex items-center gap-0.5">
                        <Check className="h-2.5 w-2.5" /> {sheetsForKey.length} {sheetsForKey.length > 1 ? 'pages' : 'page'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-muted-foreground/40">no sheet</span>
                    )}
                    {hasReferenceTracks(ps) && (
                      <span className="text-[10px] font-bold text-red-500 flex items-center gap-0.5">
                        <Youtube className="h-2.5 w-2.5" />
                        {refTracks.length > 1 ? `${refTracks.length} ref tracks` : 'ref track'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!reorderMode && (
                    <>
                      {hasReferenceTracks(ps) && (
                        <ReferenceTracksListen tracks={ps} theme="light" compact />
                      )}
                      {sheetsForKey.length > 0 && (
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl text-muted-foreground hover:text-primary hover:bg-muted"
                          title="Download sheet(s)"
                          onClick={(e) => {
                            e.stopPropagation();
                            sheetsForKey.forEach((sheet, idx) => {
                              setTimeout(() => {
                                downloadImage(sheet.imageUrl, `${ps.title} - Key ${ps.key}${sheetsForKey.length > 1 ? ` (Pg ${idx + 1})` : ''}.png`);
                              }, idx * 300);
                            });
                          }}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {libSong && (
                        <>
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl text-muted-foreground hover:text-primary hover:bg-muted"
                            title="Edit song settings"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditSong(ps);
                            }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl text-muted-foreground hover:text-primary hover:bg-muted"
                            title="Add chord sheet"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAddSheetFor({ song: libSong, key: ps.key });
                            }}>
                            <Upload className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </>
                  )}
                  {reorderMode && (
                    <div className="flex items-center gap-1">
                      <div className="flex flex-col gap-1 mr-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 rounded-lg hover:bg-muted hover:text-primary disabled:opacity-20"
                          onClick={() => handleMove(i, 'up')}
                          disabled={i === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 rounded-lg hover:bg-muted hover:text-primary disabled:opacity-20"
                          onClick={() => handleMove(i, 'down')}
                          disabled={i === orderedSongs.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive pointer-events-auto"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleRemove(ps.songId);
                        }} 
                        disabled={removing === ps.songId}>
                        {removing === ps.songId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
        </div>
      )}

      <AddSongToSetlistDialog open={addSongOpen} playlist={playlist} onClose={() => setAddSongOpen(false)} />
      <EditSetlistSongDialog
        open={!!editSong}
        playlist={playlist}
        setlistSong={editSong}
        onClose={() => setEditSong(null)}
      />
      <AddChordSheetDialog
        open={!!addSheetFor}
        song={addSheetFor?.song ?? null}
        defaultKey={addSheetFor?.key}
        onClose={() => setAddSheetFor(null)}
      />

      {/* Full-screen viewer — slides across ALL songs in the setlist */}
      {viewerStart !== null && allSlides.length > 0 && (
        <FullScreenViewer
          slides={allSlides}
          startIndex={viewerStart}
          mode="continuous"
          title={playlist.name}
          onClose={() => setViewerStart(null)}
        />
      )}
    </motion.div>
  );
}

// ── SetlistsTab ──────────────────────────────────────────────────────────────
function SetlistsTab({ initialSetlistId, openNewSignal }: { initialSetlistId?: string | null; openNewSignal?: number }) {
  const { setlists: playlists, loading, deleteSetlist: deletePlaylist } = useWorshipSetlists();
  const [newOpen, setNewOpen] = useState(false);
  const [detail, setDetail] = useState<WorshipSetlist | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<WorshipSetlist | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  // Auto-open a setlist when navigated from a roster
  const didInit = useRef(false);
  useEffect(() => {
    if (!didInit.current && initialSetlistId && playlists.length > 0) {
      const sl = playlists.find(p => p.id === initialSetlistId);
      if (sl) setDetail(sl);
      didInit.current = true;
    }
  }, [initialSetlistId, playlists]);

  useEffect(() => {
    if (openNewSignal && openNewSignal > 0) setNewOpen(true);
  }, [openNewSignal]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await deletePlaylist(deleteConfirm.id);
      toast({ title: 'Setlist deleted' });
      setDeleteConfirm(null);
      if (detail?.id === deleteConfirm.id) setDetail(null);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setDeleting(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <AnimatePresence mode="wait">
      {detail ? (
        <SetlistDetailView
          key="detail"
          playlist={playlists.find(p => p.id === detail.id) || detail}
          onBack={() => setDetail(null)}
          initialSongId={typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('songId')) : undefined}
        />
      ) : (
        <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
          {playlists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-xl border-2 border-dashed border-border/40 text-center">
              <ListMusic className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="font-semibold text-muted-foreground">No setlists yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Create a setlist for an upcoming worship service.</p>
            </div>
          ) : (
            <div className="ui-card !p-0">
              <div className="ui-list px-2">
              {playlists.map((pl, i) => (
                <motion.button
                  type="button"
                  key={pl.id}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  className="event-row group"
                  onClick={() => setDetail(pl)}
                >
                  <div className="flex w-10 shrink-0 flex-col items-center leading-none">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {format(parseISO(pl.date), 'MMM')}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {format(parseISO(pl.date), 'd')}
                    </span>
                  </div>
                  <div className="event-row-body">
                    <p className="event-row-title">{pl.name}</p>
                    <p className="event-row-meta">
                      {pl.songs.length} song{pl.songs.length !== 1 ? 's' : ''} · {format(parseISO(pl.date), 'EEEE')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100" onClick={e => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteConfirm(pl)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" />
                </motion.button>
              ))}
              </div>
            </div>
          )}

          <NewSetlistDialog open={newOpen} onClose={() => setNewOpen(false)} onCreated={id => {
            const p = playlists.find(x => x.id === id);
            if (p) setDetail(p);
          }} />

          <Dialog open={!!deleteConfirm} onOpenChange={v => !v && setDeleteConfirm(null)}>
            <DialogContent className="rounded-xl p-8 border-border/50 bg-card/95 backdrop-blur-3xl max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold normal-case not-italic">Delete &ldquo;{deleteConfirm?.name}&rdquo;?</DialogTitle>
                <DialogDescription>This will permanently remove the setlist.</DialogDescription>
              </DialogHeader>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                <Button variant="destructive" className="flex-1 rounded-xl" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Delete
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Worship Roster Components ─────────────────────────────────────────────────

function roleBadgeClass(role: WorshipRole) {
  if (role === 'Lead') return 'bg-muted border-border text-primary';
  if (role === 'Drums') return 'bg-muted border-border text-primary';
  if (role.startsWith('Keys')) return 'bg-amber-500/15 border-amber-500/30 text-amber-500';
  if (role === 'Bass') return 'bg-muted border-border text-primary';
  if (role.startsWith('Vox')) return 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-600';
  if (role.startsWith('E/G')) return 'bg-muted border-border text-primary';
  if (role === 'A/G') return 'bg-muted border-border text-primary';
  if (role === 'PPT') return 'bg-muted border-border text-primary';
  if (role === 'Sound') return 'bg-muted border-border text-primary';
  if (role === 'Lighting') return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-500';
  return 'bg-muted border-border/40 text-muted-foreground';
}

// ── RosterDetailView ────────────────────────────────────────────────────────────
function RosterDetailView({
  roster, playlists, onBack, onOpenPlaylist,
}: {
  roster: WorshipRoster;
  playlists: WorshipSetlist[];
  onBack: () => void;
  onOpenPlaylist: (setlistId: string) => void;
}) {
  const { updateRosterSlots, updateRosterMeta } = useWorshipRosters();
  const { allUsers } = useAllUsers();
  const { toast } = useToast();

  // Local editable slots state
  const [slots, setSlots] = useState<WorshipRosterSlot[]>(() =>
    mergeWorshipRosterSlots(roster.slots),
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Member picker state
  const [pickerSlotIdx, setPickerSlotIdx] = useState<number | null>(null);
  const [guestName, setGuestName] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [linkSetlistOpen, setLinkSetlistOpen] = useState(false);

  // Keep in sync when roster refreshes from Firestore (only if not dirty)
  const prevRosterRef = useRef(roster);
  if (prevRosterRef.current !== roster && !dirty) {
    prevRosterRef.current = roster;
    setSlots(mergeWorshipRosterSlots(roster.slots));
  }

  // Worship-team users: all users who are members with roleIds (we show all site users)
  const siteUserOptions = useMemo(() =>
    allUsers
      .filter(u => u.firstName)
      .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)),
    [allUsers]
  );

  const filteredUsers = useMemo(() =>
    siteUserOptions.filter(u =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(memberSearch.toLowerCase())
    ),
    [siteUserOptions, memberSearch]
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateRosterSlots(roster.id, slots);
      toast({ title: 'Roster saved' });
      setDirty(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const removeMember = (slotIdx: number, memberIdx: number) => {
    setSlots(prev => {
      const next = prev.map((s, i) => i === slotIdx
        ? { ...s, members: s.members.filter((_, mi) => mi !== memberIdx) }
        : s
      );
      return next;
    });
    setDirty(true);
  };

  const addMemberToSlot = (slotIdx: number, member: WorshipRosterMember) => {
    setSlots(prev => {
      const next = prev.map((s, i) => i === slotIdx
        ? { ...s, members: [...s.members, member] }
        : s
      );
      return next;
    });
    setDirty(true);
    setPickerSlotIdx(null);
    setGuestName('');
    setMemberSearch('');
  };

  const handleLinkSetlist = async (setlistId: string | null) => {
    try {
      await updateRosterMeta(roster.id, { setlistId });
      toast({ title: setlistId ? 'Setlist linked' : 'Setlist unlinked' });
      setLinkSetlistOpen(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };


  const linkedPlaylist = playlists.find(p => p.id === roster.setlistId);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl h-9 w-9 mt-0.5">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-lg normal-case not-italic leading-tight truncate">{roster.name}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-muted-foreground/60 font-medium flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(parseISO(roster.date), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          {linkedPlaylist ? (
            <>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl h-9 gap-1.5 border-border/70 bg-background"
                onClick={() => onOpenPlaylist(linkedPlaylist.id)}
                title="Open linked setlist"
              >
                <Link2 className="h-3.5 w-3.5" />
                {linkedPlaylist.name}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl h-9 gap-1.5 border-border/70 bg-background"
                onClick={() => setLinkSetlistOpen(true)}
                title="Change linked setlist"
              >
                <Pencil className="h-3.5 w-3.5" />
                Change
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl h-9 gap-1.5 border-border/70 bg-background"
              onClick={() => setLinkSetlistOpen(true)}
              title="Link a setlist"
            >
              <Plus className="h-3.5 w-3.5" />
              Link Setlist
            </Button>
          )}
          {dirty && (
            <Button size="sm" className="rounded-xl h-9 gap-1.5" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
            </Button>
          )}
        </div>
      </div>


      {/* Slots */}
      <div className="space-y-2">
        {slots.map((slot, slotIdx) => (
          <div
            key={slot.role}
            className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm transition-all hover:border-border"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <span className={cn(
                'text-[11px] font-semibold px-2.5 py-1 rounded-lg border shrink-0',
                roleBadgeClass(slot.role)
              )}>
                {slot.role}
              </span>
              <div className="flex-1 flex flex-wrap items-center gap-2 min-w-0">
                {slot.members.length === 0 ? (
                  <span className="text-xs text-muted-foreground/40 font-medium italic">Unassigned</span>
                ) : (
                  slot.members.map((m, mi) => (
                    <span key={mi} className={cn(
                      'flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border',
                      m.userId ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-600' : 'bg-muted border-border/50 text-muted-foreground'
                    )}>
                      {m.userId ? <UserCheck className="h-2.5 w-2.5" /> : <UserX className="h-2.5 w-2.5" />}
                      {formatNameString(m.displayName, 'Guest')}
                      <button onClick={() => removeMember(slotIdx, mi)}
                        className="ml-0.5 hover:text-destructive transition-colors">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))
                )}
              </div>
              <button
                onClick={() => { setPickerSlotIdx(slotIdx); setMemberSearch(''); setGuestName(''); }}
                className="shrink-0 p-1.5 rounded-lg hover:bg-muted text-muted-foreground/40 hover:text-primary transition-colors"
                title="Add member">
                <UserPlus className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Member picker dialog */}
      <Dialog open={pickerSlotIdx !== null} onOpenChange={v => !v && setPickerSlotIdx(null)}>
        <DialogContent className="rounded-xl p-8 border-border/50 bg-card/95 backdrop-blur-3xl max-w-sm">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-semibold normal-case not-italic tracking-tight">
              Add to {pickerSlotIdx !== null ? slots[pickerSlotIdx]?.role : ''}
            </DialogTitle>
            <DialogDescription>Pick a site member or enter a guest name.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Site user search */}
            <div className="space-y-2">
              <Label className="text-micro-label text-muted-foreground">Members</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                <Input placeholder="Search members…" value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  className="pl-8 rounded-xl h-9 text-sm" />
              </div>
              <div className="space-y-1 max-h-44 overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-4">No matching members</p>
                ) : filteredUsers.map(u => {
                  const already = pickerSlotIdx !== null &&
                    slots[pickerSlotIdx].members.some(m => m.userId === u.uid);
                  return (
                    <button key={u.uid} disabled={already}
                      onClick={() => pickerSlotIdx !== null && addMemberToSlot(pickerSlotIdx, { userId: u.uid, displayName: `${u.firstName} ${u.lastName}` })}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-sm transition-all',
                        already
                          ? 'opacity-40 cursor-not-allowed bg-muted'
                          : 'hover:bg-muted hover:border-border border border-transparent'
                      )}>
                      <UserCheck className="h-3.5 w-3.5 text-green-600 shrink-0" />
                      <span className="font-semibold">{u.firstName} {u.lastName}</span>
                      {already && <span className="ml-auto text-[10px] text-muted-foreground/40">added</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Guest */}
            <div className="space-y-2 border-t border-border/30 pt-3">
              <Label className="text-micro-label text-muted-foreground">Guests</Label>
              <div className="flex gap-2">
                <Input placeholder="Guest name…" value={guestName} onChange={e => setGuestName(e.target.value)}
                  className="flex-1 rounded-xl h-9 text-sm"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && guestName.trim() && pickerSlotIdx !== null) {
                      addMemberToSlot(pickerSlotIdx, { userId: null, displayName: guestName.trim() });
                    }
                  }} />
                <Button size="sm" className="rounded-xl h-9 shrink-0"
                  disabled={!guestName.trim() || pickerSlotIdx === null}
                  onClick={() => pickerSlotIdx !== null && guestName.trim() &&
                    addMemberToSlot(pickerSlotIdx, { userId: null, displayName: guestName.trim() })
                  }>
                  <UserPlus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Setlist Dialog */}
      <Dialog open={linkSetlistOpen} onOpenChange={setLinkSetlistOpen}>
        <DialogContent className="rounded-xl p-8 border-border/50 bg-card/95 backdrop-blur-3xl max-w-sm">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-semibold normal-case not-italic tracking-tight">Link Setlist</DialogTitle>
            <DialogDescription>Link this roster to a setlist to see song lists and chord sheets.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              <button
                onClick={() => handleLinkSetlist(null)}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-xl border border-transparent transition-all text-sm font-bold",
                  !roster.setlistId ? "bg-muted border-border text-primary" : "hover:bg-muted text-muted-foreground"
                )}>
                None / Unlink
                {!roster.setlistId && <Check className="h-4 w-4" />}
              </button>
              {playlists
                .sort((a,b) => b.date.localeCompare(a.date))
                .map(sl => (
                <button
                  key={sl.id}
                  onClick={() => handleLinkSetlist(sl.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border border-transparent transition-all text-left group",
                    roster.setlistId === sl.id ? "bg-muted border-border" : "hover:bg-muted hover:border-border"
                  )}>
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors",
                    roster.setlistId === sl.id ? "bg-muted border-border text-primary" : "bg-muted border-border/40 text-muted-foreground group-hover:border-border group-hover:text-primary"
                  )}>
                    <ListMusic className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-bold truncate", roster.setlistId === sl.id ? "text-primary" : "text-foreground")}>{sl.name}</p>
                    <p className="text-[10px] text-muted-foreground font-semibold">{format(parseISO(sl.date), 'MMM d, yyyy')}</p>
                  </div>
                  {roster.setlistId === sl.id && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>
            <Button variant="outline" className="w-full rounded-xl" onClick={() => setLinkSetlistOpen(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// ── RostersTab ────────────────────────────────────────────────────────────────
function RostersTab({ onOpenPlaylist, initialRosterId, openNewSignal }: { onOpenPlaylist: (setlistId: string) => void; initialRosterId?: string | null; openNewSignal?: number }) {
  const { rosters, loading, deleteRoster } = useWorshipRosters();
  const { setlists: playlists } = useWorshipSetlists();
  const [newOpen, setNewOpen] = useState(false);
  const [detail, setDetail] = useState<WorshipRoster | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<WorshipRoster | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  // Auto-open a roster when navigated from chat
  const didInit = useRef(false);
  useEffect(() => {
    if (!didInit.current && initialRosterId && rosters.length > 0) {
      const r = rosters.find(x => x.id === initialRosterId);
      if (r) setDetail(r);
      didInit.current = true;
    }
  }, [initialRosterId, rosters]);

  useEffect(() => {
    if (openNewSignal && openNewSignal > 0) setNewOpen(true);
  }, [openNewSignal]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await deleteRoster(deleteConfirm.id);
      toast({ title: 'Roster deleted' });
      setDeleteConfirm(null);
      if (detail?.id === deleteConfirm.id) setDetail(null);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setDeleting(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <AnimatePresence mode="wait">
      {detail ? (
        <RosterDetailView
          key="detail"
          roster={rosters.find(r => r.id === detail.id) || detail}
          playlists={playlists}
          onBack={() => setDetail(null)}
          onOpenPlaylist={onOpenPlaylist}
        />
      ) : (
        <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
          {rosters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-xl border-2 border-dashed border-border/40 text-center">
              <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="font-semibold text-muted-foreground">No rosters yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Create a team roster for an upcoming service.</p>
            </div>
          ) : (
            <div className="ui-card !p-0">
              <div className="ui-list px-2">
              {rosters.map((r, i) => {
                const linked = playlists.find(p => p.id === r.setlistId);
                const filled = r.slots.filter(s => s.members.length > 0).length;
                return (
                  <motion.button
                    type="button"
                    key={r.id}
                    custom={i}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    className="event-row group"
                    onClick={() => setDetail(r)}
                  >
                    <div className="flex w-10 shrink-0 flex-col items-center leading-none">
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {format(parseISO(r.date), 'MMM')}
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {format(parseISO(r.date), 'd')}
                      </span>
                    </div>
                    <div className="event-row-body">
                      <p className="event-row-title">{r.name}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <span className="event-row-meta">
                          {filled}/{r.slots.length} roles filled
                        </span>
                        {linked && (
                          <span className="flex items-center gap-1 rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            <Link2 className="h-2 w-2" /> {linked.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100" onClick={e => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteConfirm(r)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" />
                  </motion.button>
                );
              })}
              </div>
            </div>
          )}

          <NewRosterDialog open={newOpen} onClose={() => setNewOpen(false)}
            onCreated={id => { const r = rosters.find(x => x.id === id); if (r) setDetail(r); }} />

          <Dialog open={!!deleteConfirm} onOpenChange={v => !v && setDeleteConfirm(null)}>
            <DialogContent className="rounded-xl p-8 border-border/50 bg-card/95 backdrop-blur-3xl max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold normal-case not-italic">Delete &ldquo;{deleteConfirm?.name}&rdquo;?</DialogTitle>
                <DialogDescription>This will permanently remove the roster.</DialogDescription>
              </DialogHeader>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                <Button variant="destructive" className="flex-1 rounded-xl" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Delete
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WorshipPortalPage() {
  const { isAdmin, isWorshipTeam, loadingAuth, currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const router = useRouter();
  const searchParams = useClientSearchParams();
  const initialTab = searchParams.get('tab') as 'playlists' | 'songs' | 'rosters' | null;
  const initialId = searchParams.get('id');
  const { toast } = useToast();

  const [tab, setTab] = useState<'playlists' | 'songs' | 'rosters'>(initialTab || 'rosters');
  const [pendingSetlistId, setPendingSetlistId] = useState<string | null>(tab === 'playlists' ? (initialId || null) : null);
  const [pendingRosterId, setPendingRosterId] = useState<string | null>(tab === 'rosters' ? (initialId || null) : null);
  const [openNewRosterSignal, setOpenNewRosterSignal] = useState(0);
  const [openNewSetlistSignal, setOpenNewSetlistSignal] = useState(0);
  const [openNewSongSignal, setOpenNewSongSignal] = useState(0);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as 'playlists' | 'songs' | 'rosters' | null;
    const idParam = searchParams.get('id');
    if (tabParam === 'playlists' || tabParam === 'songs' || tabParam === 'rosters') {
      setTab(tabParam);
      if (idParam) {
        if (tabParam === 'playlists') setPendingSetlistId(idParam);
        if (tabParam === 'rosters') setPendingRosterId(idParam);
      }
    }
  }, [searchParams]);

  const selectTab = (next: 'playlists' | 'songs' | 'rosters', id?: string | null) => {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', next);
    if (id) params.set('id', id);
    else params.delete('id');
    router.replace(`/worship?${params.toString()}`, { scroll: false });
  };

  const handleOpenPlaylist = (setlistId: string) => {
    setPendingSetlistId(setlistId);
    selectTab('playlists', setlistId);
  };

  if (loadingAuth) return null;

  // Access check: Admin or Worship role
  if (!isAdmin && !isWorshipTeam) {
    return (
      <div className="empty-inline min-h-[calc(100vh-16rem)] px-6">
        <div className="w-14 h-14 rounded-xl bg-muted border border-border flex items-center justify-center mb-2">
          <Shield className="h-7 w-7 text-primary" />
        </div>
        <div className="stack-gap-sm max-w-sm">
          <h1 className="text-page-title">{t.accessRestricted}</h1>
          <p className="text-sm text-muted-foreground">
            {t.worshipAccessDesc}
          </p>
        </div>
        <Button asChild className="rounded-lg mt-2">
          <Link href="/">{t.returnHome}</Link>
        </Button>
      </div>
    );
  }

  return (
    <WorshipDataProvider enabled>
    <div className="page-container">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <NavPageHeader
          action={
            <Button
              size="sm"
              className="h-8 rounded-lg gap-1.5 px-3 text-sm"
              onClick={() => {
                if (tab === 'rosters') setOpenNewRosterSignal((n) => n + 1);
                if (tab === 'playlists') setOpenNewSetlistSignal((n) => n + 1);
                if (tab === 'songs') setOpenNewSongSignal((n) => n + 1);
              }}
            >
              <Plus className="h-4 w-4" />
              {tab === 'rosters' ? t.newRoster : tab === 'playlists' ? t.newSetlist : t.newSong}
            </Button>
          }
        />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <AnimatePresence mode="wait">
          {tab === 'playlists' && (
            <SetlistsTab
              key="playlists"
              initialSetlistId={pendingSetlistId}
              openNewSignal={openNewSetlistSignal}
            />
          )}
          {tab === 'songs' && <SongsLibraryTab key="songs" openNewSignal={openNewSongSignal} />}
          {tab === 'rosters' && (
            <RostersTab
              key="rosters"
              onOpenPlaylist={handleOpenPlaylist}
              initialRosterId={pendingRosterId}
              openNewSignal={openNewRosterSignal}
            />
          )}
        </AnimatePresence>
      </motion.div>

      <div className="h-16 md:h-0" />
      <div className="fixed bottom-3 left-1/2 z-40 w-[min(680px,calc(100vw-16px))] -translate-x-1/2 md:bottom-4 md:left-[calc(50%+8rem)] md:w-[min(720px,calc(100vw-16rem-32px))]">
        <div className="glass-elevated rounded-xl border-transparent px-2 py-1.5">
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => selectTab('rosters')}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 transition-colors text-xs",
                tab === 'rosters' ? "bg-background/40 text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className={cn("h-4 w-4", tab === 'rosters' ? "text-primary" : "text-muted-foreground")} />
              <span>{t.rostersTab}</span>
            </button>
            <button
              type="button"
              onClick={() => selectTab('playlists')}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 transition-colors text-xs",
                tab === 'playlists' ? "bg-background/40 text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ListMusic className={cn("h-4 w-4", tab === 'playlists' ? "text-primary" : "text-muted-foreground")} />
              <span>{t.setlistsTab}</span>
            </button>
            <button
              type="button"
              onClick={() => selectTab('songs')}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 transition-colors text-xs",
                tab === 'songs' ? "bg-background/40 text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Music2 className={cn("h-4 w-4", tab === 'songs' ? "text-primary" : "text-muted-foreground")} />
              <span>{t.songsTab}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    </WorshipDataProvider>
  );
}
