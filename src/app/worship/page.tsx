"use client";

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import {
  Music, Plus, ListMusic, BookOpen, ChevronRight, ChevronLeft,
  Trash2, X, Upload, Image as ImageIcon, Calendar, Loader2,
  Eye, ArrowLeft, GripVertical, Check, Search, Music2, Pencil, Save,
  Users, UserPlus, Link2, UserCheck, UserX, Shield, Download,
  ChevronUp, ChevronDown, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-layout';
import { cn } from '@/lib/utils';
import { useWorshipSongs } from '@/hooks/useWorshipSongs';
import { useWorshipSetlists } from '@/hooks/useWorshipSetlists';
import { useWorshipRosters } from '@/hooks/useWorshipRosters';
import { useAllUsers } from '@/hooks/use-all-users';
import { useAuth } from '@/contexts/auth-context';
import type {
  WorshipSong, WorshipSetlist, ChordKey, SongChordSheet,
  WorshipRoster, WorshipRosterSlot, WorshipRosterMember, WorshipRole
} from '@/types';
import { FullScreenViewer, ViewerSlide } from '@/components/worship/FullScreenViewer';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  NewSongDialog, NewSetlistDialog, NewRosterDialog, AddChordSheetDialog 
} from '@/components/worship/WorshipDialogs';

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
      'inline-flex items-center justify-center min-w-[2rem] h-6 px-1.5 rounded-lg text-[11px] font-black tracking-tight border',
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
              <h2 className="font-black text-lg normal-case not-italic leading-tight truncate">{song.title}</h2>
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
        <div className="flex flex-col items-center justify-center py-16 rounded-3xl border-2 border-dashed border-border/40 text-center">
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
                        <span className="text-[10px] font-black text-primary mt-2">PDF DOCUMENT</span>
                      </div>
                    ) : (
                      <img src={sheet.imageUrl} alt={`${key} pg ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105" />
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
                    <span className="absolute top-1.5 left-1.5 text-[10px] font-black bg-black/40 text-white px-1.5 py-0.5 rounded-md backdrop-blur-sm">
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
            <div className="flex flex-col items-center justify-center py-20 rounded-3xl border-2 border-dashed border-border/40 text-center">
              <Music className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="font-semibold text-muted-foreground">{songs.length === 0 ? 'No songs yet' : 'No results'}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {songs.length === 0 ? 'Add songs to build your worship library.' : 'Try a different search.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((song, i) => (
                <motion.div key={song.id} custom={i} variants={fadeUp} initial="hidden" animate="visible"
                  className="flex items-center gap-4 p-4 rounded-2xl bg-card/50 border border-border/40 backdrop-blur-sm hover:border-border group transition-all cursor-pointer"
                  onClick={() => setDetailSong(song)}>
                  <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0">
                    <Music2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{song.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {song.artist && <span className="text-xs text-muted-foreground/60 font-medium truncate">{song.artist}</span>}
                      {song.chordSheets.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {Array.from(new Set(song.chordSheets.map(s => s.key))).slice(0, 4).map(k => (
                            <KeyBadge key={k} keyName={k} />
                          ))}
                          {new Set(song.chordSheets.map(s => s.key)).size > 4 && (
                            <span className="text-[10px] text-muted-foreground/40 font-bold">+{new Set(song.chordSheets.map(s => s.key)).size - 4}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl hover:text-primary hover:bg-muted"
                      onClick={() => { setAddSheetSong(song); }}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl hover:text-destructive hover:bg-destructive"
                      onClick={() => setDeleteConfirm(song)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/20 group-hover:text-primary transition-colors shrink-0" />
                </motion.div>
              ))}
            </div>
          )}

          <NewSongDialog open={newSongOpen} onClose={() => setNewSongOpen(false)}
            onCreated={(id) => { const s = songs.find(x => x.id === id); if (s) setDetailSong(s); }} />
          <AddChordSheetDialog open={!!addSheetSong} song={addSheetSong} onClose={() => setAddSheetSong(null)} />

          {/* Delete confirm dialog */}
          <Dialog open={!!deleteConfirm} onOpenChange={v => !v && setDeleteConfirm(null)}>
            <DialogContent className="rounded-3xl p-8 border-border/50 bg-card/95 backdrop-blur-3xl max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-lg font-black normal-case not-italic">Delete "{deleteConfirm?.title}"?</DialogTitle>
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
  const [adding, setAdding] = useState(false);

  const alreadyAdded = new Set(playlist.songs.map(s => s.songId));
  const filtered = useMemo(() =>
    songs.filter(s =>
      !alreadyAdded.has(s.id) &&
      (s.title.toLowerCase().includes(search.toLowerCase()) || s.artist?.toLowerCase().includes(search.toLowerCase()))
    ), [songs, search, alreadyAdded]);

  // Auto-detect available keys when song is selected
  const availableKeys = useMemo(() => {
    if (!selectedSong) return [] as ChordKey[];
    return Array.from(new Set(selectedSong.chordSheets.map(s => s.key)));
  }, [selectedSong]);

  const handleAdd = async () => {
    if (!selectedSong) return;
    setAdding(true);
    try {
      await addSongToSetlist(playlist, selectedSong.id, selectedSong.title, selectedKey);
      toast({ title: 'Song added', description: `${selectedSong.title} (${selectedKey === 'numbers' ? '#' : selectedKey}) added to setlist.` });
      setSelectedSong(null); setSelectedKey('numbers'); setSearch('');
      onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setAdding(false); }
  };

  const reset = () => { setSelectedSong(null); setSelectedKey('numbers'); setSearch(''); };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="rounded-3xl p-5 sm:p-8 border-border/50 bg-card/95 backdrop-blur-3xl max-w-md w-[95vw] sm:w-full">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl font-black normal-case not-italic tracking-tight">Add Song</DialogTitle>
          <DialogDescription>Choose a song from the library and select the key for this service.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {!selectedSong ? (
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
                  <button key={song.id} onClick={() => {
                    setSelectedSong(song);
                    // Auto-select first available key if any
                    const keys = Array.from(new Set(song.chordSheets.map(s => s.key)));
                    if (keys.length > 0) setSelectedKey(keys[0]);
                    else setSelectedKey('numbers');
                  }}
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
              {/* Selected song confirmation + key picker */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted border border-border">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Music2 className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{selectedSong.title}</p>
                  {selectedSong.artist && <p className="text-xs text-muted-foreground/60">{selectedSong.artist}</p>}
                </div>
                <button onClick={() => { setSelectedSong(null); setSelectedKey('numbers'); }}
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                <Label>Select Key</Label>
                {availableKeys.length > 0 && (
                  <p className="text-[11px] text-muted-foreground/60 font-medium">
                    ✓ Chord sheets available for highlighted keys
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {ALL_KEYS.map(k => {
                    const hasSheet = availableKeys.includes(k);
                    return (
                      <button key={k} onClick={() => setSelectedKey(k)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-bold border transition-all relative',
                          selectedKey === k
                            ? 'bg-muted border-border text-white shadow-md shadow-rose-500/20'
                            : hasSheet
                            ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-600 hover:border-border'
                            : 'bg-muted border-border/40 text-muted-foreground hover:border-border'
                        )}>
                        {k === 'numbers' ? '#' : k}
                        {hasSheet && selectedKey !== k && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500/10 rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {availableKeys.includes(selectedKey) && (
                  <p className="text-xs text-green-600 dark:text-green-600 font-semibold flex items-center gap-1">
                    <Check className="h-3 w-3" /> Chord sheet available for this key
                  </p>
                )}
                {!availableKeys.includes(selectedKey) && availableKeys.length > 0 && (
                  <p className="text-xs text-muted-foreground/60 font-medium">
                    No chord sheet for this key — it can still be added.
                  </p>
                )}
              </div>
            </>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { reset(); onClose(); }}>Cancel</Button>
            <Button className="flex-1 rounded-xl"
              onClick={handleAdd} disabled={!selectedSong || adding}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Add to Setlist
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
  // Full-screen viewer: flat slide index across ALL songs, or null if closed
  const [viewerStart, setViewerStart] = useState<number | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  // Chord sheet from playlist
  const [addSheetFor, setAddSheetFor] = useState<WorshipSong | null>(null);
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
      if (!libSong) continue;
      const forKey = libSong.chordSheets.filter(s => s.key === ps.key);
      if (forKey.length > 0) {
        slides.push({
          songTitle: ps.title,
          key: ps.key,
          imageUrls: forKey.map(s => s.imageUrl),
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

  const openSheets = (ps: (typeof playlist.songs)[0]) => {
    const libSong = songs.find(s => s.id === ps.songId);
    if (!libSong) return;
    const forKey = libSong.chordSheets.filter(s => s.key === ps.key);
    if (forKey.length === 0) { toast({ title: 'No chord sheets', description: `No sheets saved for key ${ps.key}.` }); return; }
    // Find the index of the first sheet belonging to this song in the flat allSlides array
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
          <h2 className="font-black text-lg normal-case not-italic leading-tight truncate">{playlist.name}</h2>
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
        <div className="flex flex-col items-center justify-center py-16 rounded-3xl border-2 border-dashed border-border/40 text-center">
          <ListMusic className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="font-semibold text-muted-foreground">No songs yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Add songs from the library to build this setlist.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reorderMode && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs font-semibold">
              <GripVertical className="h-3.5 w-3.5" /> 
              <span className="hidden sm:inline">Drag songs to reorder, then click Save.</span>
              <span className="sm:hidden">Use arrows to reorder, then click Save.</span>
            </div>
          )}
          {orderedSongs.map((ps, i) => {
            const libSong = songs.find(s => s.id === ps.songId);
            const sheetsForKey = libSong?.chordSheets.filter(s => s.key === ps.key) || [];
            return (
              <div
                key={ps.songId}
                draggable={reorderMode}
                onDragStart={reorderMode ? () => handleDragStart(i) : undefined}
                onDragEnter={reorderMode ? () => handleDragEnter(i) : undefined}
                onDragOver={reorderMode ? e => e.preventDefault() : undefined}
                onDragEnd={reorderMode ? handleDragEnd : undefined}
                className={cn(
                  'flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-2xl bg-card/50 border border-border/40 backdrop-blur-sm group transition-all',
                  reorderMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-default hover:border-border',
                  dragging && dragIdx.current === i ? 'opacity-40 scale-[0.98]' : ''
                )}>
                {reorderMode ? (
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0 hidden sm:block" />
                ) : (
                  <div className="w-4 shrink-0 hidden sm:block" />
                )}
                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <span className="text-xs font-black text-primary">{i + 1}</span>
                </div>
                <div
                  className={cn(
                    'flex-1 min-w-0',
                    !reorderMode && sheetsForKey.length > 0 && 'cursor-pointer'
                  )}
                  onClick={!reorderMode && sheetsForKey.length > 0 ? () => openSheets(ps) : undefined}
                >
                  <p className={cn(
                    'font-bold text-sm truncate transition-colors',
                    !reorderMode && sheetsForKey.length > 0 && 'group-hover:text-primary'
                  )}>{ps.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <KeyBadge keyName={ps.key} accent />
                    {sheetsForKey.length > 0 ? (
                      <span className="text-[10px] font-bold text-green-600 dark:text-green-600 flex items-center gap-0.5">
                        <Check className="h-2.5 w-2.5" /> {sheetsForKey.length} {sheetsForKey.length > 1 ? 'pages' : 'page'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-muted-foreground/40">no sheet</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!reorderMode && (
                    <>
                      {sheetsForKey.length > 0 && (
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl text-muted-foreground hover:text-primary hover:bg-muted"
                          title="Download sheet(s)"
                          onClick={(e) => {
                            e.stopPropagation();
                            sheetsForKey.forEach((sheet, i) => {
                              setTimeout(() => {
                                downloadImage(sheet.imageUrl, `${ps.title} - Key ${ps.key}${sheetsForKey.length > 1 ? ` (Pg ${i + 1})` : ''}.png`);
                              }, i * 300);
                            });
                          }}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {libSong && (
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl text-muted-foreground hover:text-primary hover:bg-muted"
                          title="Add chord sheet"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAddSheetFor(libSong);
                          }}>
                          <Upload className="h-3.5 w-3.5" />
                        </Button>
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
      )}

      <AddSongToSetlistDialog open={addSongOpen} playlist={playlist} onClose={() => setAddSongOpen(false)} />
      <AddChordSheetDialog open={!!addSheetFor} song={addSheetFor} onClose={() => setAddSheetFor(null)} />

      {/* Full-screen viewer — slides across ALL songs in the setlist */}
      {viewerStart !== null && allSlides.length > 0 && (
        <FullScreenViewer slides={allSlides} startIndex={viewerStart} onClose={() => setViewerStart(null)} />
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
            <div className="flex flex-col items-center justify-center py-20 rounded-3xl border-2 border-dashed border-border/40 text-center">
              <ListMusic className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="font-semibold text-muted-foreground">No setlists yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Create a setlist for an upcoming worship service.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {playlists.map((pl, i) => (
                <motion.div key={pl.id} custom={i} variants={fadeUp} initial="hidden" animate="visible"
                  className="flex items-center gap-4 p-4 rounded-2xl bg-card/50 border border-border/40 backdrop-blur-sm hover:border-border group transition-all cursor-pointer"
                  onClick={() => setDetail(pl)}>
                  <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] font-black text-primary uppercase tracking-wider leading-none">
                      {format(parseISO(pl.date), 'MMM')}
                    </span>
                    <span className="text-lg font-black text-primary leading-tight">
                      {format(parseISO(pl.date), 'd')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{pl.name}</p>
                    <p className="text-xs text-muted-foreground/60 font-medium mt-0.5">
                      {pl.songs.length} song{pl.songs.length !== 1 ? 's' : ''} · {format(parseISO(pl.date), 'EEEE')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl hover:text-destructive hover:bg-destructive"
                      onClick={() => setDeleteConfirm(pl)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/20 group-hover:text-primary transition-colors shrink-0" />
                </motion.div>
              ))}
            </div>
          )}

          <NewSetlistDialog open={newOpen} onClose={() => setNewOpen(false)} onCreated={id => {
            const p = playlists.find(x => x.id === id);
            if (p) setDetail(p);
          }} />

          <Dialog open={!!deleteConfirm} onOpenChange={v => !v && setDeleteConfirm(null)}>
            <DialogContent className="rounded-3xl p-8 border-border/50 bg-card/95 backdrop-blur-3xl max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-lg font-black normal-case not-italic">Delete "{deleteConfirm?.name}"?</DialogTitle>
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
    [...roster.slots].sort((a, b) => a.order - b.order)
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
    setSlots([...roster.slots].sort((a, b) => a.order - b.order));
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
          <h2 className="font-black text-lg normal-case not-italic leading-tight truncate">{roster.name}</h2>
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
                'text-[11px] font-black px-2.5 py-1 rounded-lg border shrink-0',
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
                      {m.displayName}
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
        <DialogContent className="rounded-3xl p-8 border-border/50 bg-card/95 backdrop-blur-3xl max-w-sm">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-black normal-case not-italic tracking-tight">
              Add to {pickerSlotIdx !== null ? slots[pickerSlotIdx]?.role : ''}
            </DialogTitle>
            <DialogDescription>Pick a site member or enter a guest name.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Site user search */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Site Members</Label>
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
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Guest / External</Label>
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
        <DialogContent className="rounded-3xl p-8 border-border/50 bg-card/95 backdrop-blur-3xl max-w-sm">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-black normal-case not-italic tracking-tight">Link Setlist</DialogTitle>
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
            <div className="flex flex-col items-center justify-center py-20 rounded-3xl border-2 border-dashed border-border/40 text-center">
              <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="font-semibold text-muted-foreground">No rosters yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Create a team roster for an upcoming service.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rosters.map((r, i) => {
                const linked = playlists.find(p => p.id === r.setlistId);
                const filled = r.slots.filter(s => s.members.length > 0).length;
                return (
                  <motion.div key={r.id} custom={i} variants={fadeUp} initial="hidden" animate="visible"
                    className="flex items-center gap-4 p-4 rounded-2xl bg-card/50 border border-border/40 backdrop-blur-sm hover:border-border group transition-all cursor-pointer"
                    onClick={() => setDetail(r)}>
                    <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] font-black text-primary uppercase tracking-wider leading-none">
                        {format(parseISO(r.date), 'MMM')}
                      </span>
                      <span className="text-lg font-black text-primary leading-tight">
                        {format(parseISO(r.date), 'd')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate text-zinc-900 dark:text-zinc-100">{r.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-zinc-800 dark:text-zinc-200 font-semibold">
                          {filled}/{r.slots.length} roles filled
                        </span>
                        {linked && (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-primary border border-border">
                            <Link2 className="h-2 w-2" /> {linked.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl hover:text-destructive hover:bg-destructive"
                        onClick={() => setDeleteConfirm(r)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/20 group-hover:text-primary transition-colors shrink-0" />
                  </motion.div>
                );
              })}
            </div>
          )}

          <NewRosterDialog open={newOpen} onClose={() => setNewOpen(false)}
            onCreated={id => { const r = rosters.find(x => x.id === id); if (r) setDetail(r); }} />

          <Dialog open={!!deleteConfirm} onOpenChange={v => !v && setDeleteConfirm(null)}>
            <DialogContent className="rounded-3xl p-8 border-border/50 bg-card/95 backdrop-blur-3xl max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-lg font-black normal-case not-italic">Delete "{deleteConfirm?.name}"?</DialogTitle>
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
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialTab = searchParams?.get('tab') as 'playlists' | 'songs' | 'rosters' | null;
  const initialId = searchParams?.get('id');
  const { toast } = useToast();

  const [tab, setTab] = useState<'playlists' | 'songs' | 'rosters'>(initialTab || 'rosters');
  const [pendingSetlistId, setPendingSetlistId] = useState<string | null>(tab === 'playlists' ? (initialId || null) : null);
  const [pendingRosterId, setPendingRosterId] = useState<string | null>(tab === 'rosters' ? (initialId || null) : null);
  const [openNewRosterSignal, setOpenNewRosterSignal] = useState(0);
  const [openNewSetlistSignal, setOpenNewSetlistSignal] = useState(0);
  const [openNewSongSignal, setOpenNewSongSignal] = useState(0);

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
      if (initialId) {
        if (initialTab === 'playlists') setPendingSetlistId(initialId);
        if (initialTab === 'rosters') setPendingRosterId(initialId);
      }
    }
  }, [initialTab, initialId]);

  const handleOpenPlaylist = (setlistId: string) => {
    setPendingSetlistId(setlistId);
    setTab('playlists');
  };

  if (loadingAuth) return null;

  // Access check: Admin or Worship role
  if (!isAdmin && !isWorshipTeam) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)] p-8 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-muted border border-border flex items-center justify-center">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight">Access Restricted</h1>
          <p className="text-muted-foreground max-w-xs mx-auto">
            The Worship Portal is only accessible to members of the Worship Team.
          </p>
        </div>
        <Button asChild className="rounded-2xl px-8">
          <Link href="/">Return Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="page-container space-y-8 pb-32">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <PageHeader
          title="Worship Portal"
          action={
            <Button
              size="sm"
              className="h-9 rounded-xl gap-1.5 px-4 text-[10px] font-semibold uppercase tracking-[0.16em]"
              onClick={() => {
                if (tab === 'rosters') setOpenNewRosterSignal((n) => n + 1);
                if (tab === 'playlists') setOpenNewSetlistSignal((n) => n + 1);
                if (tab === 'songs') setOpenNewSongSignal((n) => n + 1);
              }}
            >
              <Plus className="h-4 w-4" />
              {tab === 'rosters' ? 'New Roster' : tab === 'playlists' ? 'New Setlist' : 'New Song'}
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
        <div className="glass-elevated rounded-[1.75rem] border-transparent px-2 py-2">
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => setTab('rosters')}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 transition-colors",
                tab === 'rosters' ? "bg-background/40 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background/25"
              )}
            >
              <Users className={cn("h-5 w-5", tab === 'rosters' ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-[10px] leading-none", tab === 'rosters' ? "font-semibold" : "font-medium")}>Rosters</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('playlists')}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 transition-colors",
                tab === 'playlists' ? "bg-background/40 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background/25"
              )}
            >
              <ListMusic className={cn("h-5 w-5", tab === 'playlists' ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-[10px] leading-none", tab === 'playlists' ? "font-semibold" : "font-medium")}>Setlists</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('songs')}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 transition-colors",
                tab === 'songs' ? "bg-background/40 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background/25"
              )}
            >
              <Music2 className={cn("h-5 w-5", tab === 'songs' ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-[10px] leading-none", tab === 'songs' ? "font-semibold" : "font-medium")}>Songs</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
