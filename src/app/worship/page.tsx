"use client";

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import {
  Music, Plus, ListMusic, BookOpen, ChevronRight, ChevronLeft,
  Trash2, X, Upload, Image as ImageIcon, Calendar, Loader2,
  Eye, ArrowLeft, GripVertical, Check, Search, Music2, Pencil, Save,
  Users, UserPlus, Link2, UserCheck, UserX, Shield
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

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

// ── KeyBadge ─────────────────────────────────────────────────────────────────
function KeyBadge({ keyName, accent = false }: { keyName: ChordKey; accent?: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center justify-center min-w-[2rem] h-6 px-1.5 rounded-lg text-[11px] font-black tracking-tight border',
      accent
        ? 'bg-rose-500/15 border-rose-500/30 text-rose-500'
        : 'bg-muted/40 border-border/40 text-muted-foreground'
    )}>
      {keyName === 'numbers' ? '#' : keyName}
    </span>
  );
}

// ── NewSongDialog ─────────────────────────────────────────────────────────────
function NewSongDialog({
  open, onClose, onCreated,
}: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const { addSong } = useWorshipSongs();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const id = await addSong(title, artist || undefined);
      toast({ title: 'Song created', description: `"${title}" has been added to the library.` });
      setTitle(''); setArtist('');
      onCreated(id);
      onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="rounded-3xl p-8 border-border/50 bg-card/95 backdrop-blur-3xl max-w-sm">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl font-black normal-case not-italic tracking-tight">New Song</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Add a song to the worship library. You can add chord sheets after.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label htmlFor="song-title">Song Title <span className="text-rose-500">*</span></Label>
            <Input id="song-title" placeholder="e.g. Way Maker" value={title} onChange={e => setTitle(e.target.value)}
              className="rounded-xl" onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="song-artist">Artist / Original Artist</Label>
            <Input id="song-artist" placeholder="e.g. Sinach" value={artist} onChange={e => setArtist(e.target.value)}
              className="rounded-xl" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 rounded-xl bg-rose-500 hover:bg-rose-600" onClick={handleSubmit}
              disabled={!title.trim() || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Create Song
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── AddChordSheetDialog ───────────────────────────────────────────────────────
function AddChordSheetDialog({
  open, song, onClose,
}: { open: boolean; song: WorshipSong | null; onClose: () => void }) {
  const { addChordSheet } = useWorshipSongs();
  const { toast } = useToast();
  const [selectedKey, setSelectedKey] = useState<ChordKey>('numbers');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = (f: File) => {
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) handleFile(f);
  };

  const handleUpload = async () => {
    if (!song || !file) return;
    setUploading(true);
    try {
      await addChordSheet(song.id, file, selectedKey);
      toast({ title: 'Chord sheet added', description: `Added in key ${selectedKey === 'numbers' ? 'Numbers' : selectedKey}.` });
      setFile(null); setPreview(null); setSelectedKey('numbers');
      onClose();
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    } finally { setUploading(false); }
  };

  const reset = () => { setFile(null); setPreview(null); setSelectedKey('numbers'); };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="rounded-3xl p-8 border-border/50 bg-card/95 backdrop-blur-3xl max-w-md">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl font-black normal-case not-italic tracking-tight">
            Add Chord Sheet
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {song?.title} — Upload an image of the chord chart for a specific key.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          {/* Key selector */}
          <div className="space-y-2">
            <Label>Key / Notation</Label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_KEYS.map(k => (
                <button key={k} onClick={() => setSelectedKey(k)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-bold border transition-all',
                    selectedKey === k
                      ? 'bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-500/20'
                      : 'bg-muted/30 border-border/40 text-muted-foreground hover:border-rose-500/40'
                  )}>
                  {k === 'numbers' ? 'Numbers (#)' : k}
                </button>
              ))}
            </div>
          </div>

          {/* Image drop zone */}
          <div className="space-y-2">
            <Label>Chord Sheet Image</Label>
            {preview ? (
              <div className="relative rounded-2xl overflow-hidden border border-border/50">
                <img src={preview} alt="preview" className="w-full max-h-64 object-contain bg-muted/20" />
                <button onClick={() => { setFile(null); setPreview(null); }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 border border-border/50 hover:bg-destructive hover:text-white transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                className="flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed border-border/50 hover:border-rose-500/50 transition-colors cursor-pointer bg-muted/10 hover:bg-rose-500/5">
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500">
                  <Upload className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold">Drop image here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG supported</p>
                </div>
              </label>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { reset(); onClose(); }}>Cancel</Button>
            <Button className="flex-1 rounded-xl bg-rose-500 hover:bg-rose-600"
              onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── FullScreenViewer ─────────────────────────────────────────────────────────
interface ViewerSlide {
  imageUrl: string;
  songTitle: string;
  key: ChordKey;
  page: number;   // 1-based within this song+key group
  totalPages: number;
}

function FullScreenViewer({
  slides, startIndex = 0, onClose,
}: { slides: ViewerSlide[]; startIndex?: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex);
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd   = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) setIdx(i => Math.min(i + 1, slides.length - 1));
    else         setIdx(i => Math.max(i - 1, 0));
  };

  // Keyboard listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setIdx(i => Math.min(i + 1, slides.length - 1));
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   setIdx(i => Math.max(i - 1, 0));
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [slides.length, onClose]);

  const slide = slides[idx];
  if (!slide) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black flex flex-col"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0">
              <X className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm truncate">{slide.songTitle}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <KeyBadge keyName={slide.key} accent />
                {slide.totalPages > 1 && (
                  <span className="text-white/40 text-[11px] font-bold">
                    pg {slide.page}/{slide.totalPages}
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className="text-white/40 text-xs font-bold shrink-0">
            {idx + 1} / {slides.length}
          </span>
        </div>

        {/* Image — fills remaining space */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden px-2 pb-2">
          <motion.img
            key={slide.imageUrl}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.18 }}
            src={slide.imageUrl}
            alt="chord sheet"
            className="max-w-full max-h-full object-contain rounded-2xl select-none"
            draggable={false}
          />

          {/* Side nav arrows */}
          {idx > 0 && (
            <button
              onClick={() => setIdx(i => i - 1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm">
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {idx < slides.length - 1 && (
            <button
              onClick={() => setIdx(i => i + 1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm">
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Dot indicators */}
        {slides.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 pb-6 pt-2 shrink-0 flex-wrap px-8">
            {slides.map((s, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={cn(
                  'rounded-full transition-all',
                  i === idx ? 'w-4 h-2 bg-rose-500' : 'w-2 h-2 bg-white/25 hover:bg-white/50'
                )}
              />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}



// ── SongDetailView ────────────────────────────────────────────────────────────
function SongDetailView({
  song, onBack,
}: { song: WorshipSong; onBack: () => void }) {
  const { removeChordSheet, updateSong } = useWorshipSongs();
  const { toast } = useToast();
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [viewSheet, setViewSheet] = useState<SongChordSheet | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(song.title);
  const [editArtist, setEditArtist] = useState(song.artist || '');
  const [saving, setSaving] = useState(false);

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    setSaving(true);
    try {
      await updateSong(song.id, { title: editTitle.trim(), artist: editArtist.trim() || undefined });
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
              <Button size="sm" className="rounded-xl bg-rose-500 hover:bg-rose-600 h-9 gap-1.5"
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
              <Button size="sm" className="rounded-xl bg-rose-500 hover:bg-rose-600 h-9 gap-1.5"
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
                  <div key={sheet.id} className="relative group rounded-2xl overflow-hidden border border-border/40 bg-muted/10 aspect-[3/4]">
                    <img src={sheet.imageUrl} alt={`${key} pg ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                      <button onClick={() => setViewSheet(sheet)}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(sheet)}
                        disabled={deleting === sheet.id}
                        className="p-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white transition-colors">
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
        ).flatMap(([key, sheets]) =>
          sheets.map((s, i) => ({
            imageUrl: s.imageUrl,
            songTitle: song.title,
            key,
            page: i + 1,
            totalPages: sheets.length,
          } as ViewerSlide))
        );
        const start = slides.findIndex(sl => sl.imageUrl === viewSheet.imageUrl);
        return <FullScreenViewer slides={slides} startIndex={Math.max(0, start)} onClose={() => setViewSheet(null)} />;
      })()}
    </motion.div>
  );
}

// ── SongsLibraryTab ───────────────────────────────────────────────────────────
function SongsLibraryTab() {
  const { songs, loading, deleteSong } = useWorshipSongs();
  const [newSongOpen, setNewSongOpen] = useState(false);
  const [addSheetSong, setAddSheetSong] = useState<WorshipSong | null>(null);
  const [detailSong, setDetailSong] = useState<WorshipSong | null>(null);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<WorshipSong | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

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

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-rose-500" /></div>;

  return (
    <AnimatePresence mode="wait">
      {detailSong ? (
        <SongDetailView key="detail" song={songs.find(s => s.id === detailSong.id) || detailSong}
          onBack={() => setDetailSong(null)} />
      ) : (
        <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
          {/* Header actions */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
              <Input placeholder="Search songs…" value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 rounded-xl h-10" />
            </div>
            <Button size="sm" className="rounded-xl bg-rose-500 hover:bg-rose-600 h-10 gap-1.5 shrink-0"
              onClick={() => setNewSongOpen(true)}>
              <Plus className="h-4 w-4" /> New Song
            </Button>
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
                  className="flex items-center gap-4 p-4 rounded-2xl bg-card/50 border border-border/40 backdrop-blur-sm hover:border-rose-500/30 group transition-all cursor-pointer"
                  onClick={() => setDetailSong(song)}>
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                    <Music2 className="h-5 w-5 text-rose-500" />
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
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl hover:text-rose-500 hover:bg-rose-500/10"
                      onClick={() => { setAddSheetSong(song); }}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl hover:text-red-500 hover:bg-red-500/10"
                      onClick={() => setDeleteConfirm(song)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/20 group-hover:text-rose-500 transition-colors shrink-0" />
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

// ── NewSetlistDialog ─────────────────────────────────────────────────────────
function NewSetlistDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const { createSetlist } = useWorshipSetlists();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !date) return;
    setSaving(true);
    try {
      const id = await createSetlist(name, date);
      toast({ title: 'Setlist created', description: `"${name}" is ready.` });
      setName(''); setDate(format(new Date(), 'yyyy-MM-dd'));
      onCreated(id);
      onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="rounded-3xl p-8 border-border/50 bg-card/95 backdrop-blur-3xl max-w-sm">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl font-black normal-case not-italic tracking-tight">New Setlist</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Create a setlist for a worship service.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label htmlFor="pl-name">Service Name <span className="text-rose-500">*</span></Label>
            <Input id="pl-name" placeholder="e.g. Sunday Morning Service" value={name} onChange={e => setName(e.target.value)}
              className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pl-date">Date <span className="text-rose-500">*</span></Label>
            <Input id="pl-date" type="date" value={date} onChange={e => setDate(e.target.value)} className="rounded-xl" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 rounded-xl bg-rose-500 hover:bg-rose-600" onClick={handleSubmit}
              disabled={!name.trim() || !date || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Create
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
      <DialogContent className="rounded-3xl p-8 border-border/50 bg-card/95 backdrop-blur-3xl max-w-md">
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
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-rose-500/10 hover:border-rose-500/30 border border-transparent transition-all text-left">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                      <Music2 className="h-4 w-4 text-rose-500" />
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
              <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center shrink-0">
                  <Music2 className="h-4 w-4 text-rose-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{selectedSong.title}</p>
                  {selectedSong.artist && <p className="text-xs text-muted-foreground/60">{selectedSong.artist}</p>}
                </div>
                <button onClick={() => { setSelectedSong(null); setSelectedKey('numbers'); }}
                  className="p-1 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors">
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
                            ? 'bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-500/20'
                            : hasSheet
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:border-rose-500/40'
                            : 'bg-muted/30 border-border/40 text-muted-foreground hover:border-rose-500/40'
                        )}>
                        {k === 'numbers' ? '#' : k}
                        {hasSheet && selectedKey !== k && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {availableKeys.includes(selectedKey) && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
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
            <Button className="flex-1 rounded-xl bg-rose-500 hover:bg-rose-600"
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
  playlist, onBack,
}: { playlist: WorshipSetlist; onBack: () => void }) {
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
      forKey.forEach((sheet, i) => {
        slides.push({
          imageUrl: sheet.imageUrl,
          songTitle: ps.title,
          key: ps.key,
          page: i + 1,
          totalPages: forKey.length,
        });
      });
    }
    return slides;
  }, [orderedSongs, songs]);

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
            <Button size="sm" className="rounded-xl bg-rose-500 hover:bg-rose-600 h-9 gap-1.5" onClick={handleSaveOrder} disabled={savingOrder}>
              {savingOrder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
            </Button>
          )}
          {!reorderMode && (
            <Button size="sm" className="rounded-xl bg-rose-500 hover:bg-rose-600 h-9 gap-1.5"
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
              <GripVertical className="h-3.5 w-3.5" /> Drag songs to reorder, then click Save.
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
                  'flex items-center gap-3 p-4 rounded-2xl bg-card/50 border border-border/40 backdrop-blur-sm group transition-all',
                  reorderMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-default hover:border-rose-500/20',
                  dragging && dragIdx.current === i ? 'opacity-40 scale-[0.98]' : ''
                )}>
                {reorderMode ? (
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                ) : (
                  <div className="w-4 shrink-0" />
                )}
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-black text-rose-500">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{ps.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <KeyBadge keyName={ps.key} accent />
                    {sheetsForKey.length > 0 ? (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                        <Check className="h-2.5 w-2.5" /> {sheetsForKey.length} sheet{sheetsForKey.length > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-muted-foreground/40">no sheet</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!reorderMode && sheetsForKey.length > 0 && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl hover:text-rose-500 hover:bg-rose-500/10"
                      onClick={() => openSheets(ps)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {!reorderMode && libSong && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl hover:text-rose-500 hover:bg-rose-500/10"
                      title="Add chord sheet"
                      onClick={() => setAddSheetFor(libSong)}>
                      <Upload className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {!reorderMode && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl hover:text-red-500 hover:bg-red-500/10"
                      onClick={() => handleRemove(ps.songId)} disabled={removing === ps.songId}>
                      {removing === ps.songId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                    </Button>
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
function SetlistsTab({ initialSetlistId }: { initialSetlistId?: string | null }) {
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

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-rose-500" /></div>;

  return (
    <AnimatePresence mode="wait">
      {detail ? (
        <SetlistDetailView
          key="detail"
          playlist={playlists.find(p => p.id === detail.id) || detail}
          onBack={() => setDetail(null)} />
      ) : (
        <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
          <div className="flex justify-end">
            <Button size="sm" className="rounded-xl bg-rose-500 hover:bg-rose-600 h-10 gap-1.5"
              onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4" /> New Setlist
            </Button>
          </div>

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
                  className="flex items-center gap-4 p-4 rounded-2xl bg-card/50 border border-border/40 backdrop-blur-sm hover:border-rose-500/30 group transition-all cursor-pointer"
                  onClick={() => setDetail(pl)}>
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] font-black text-rose-500/70 uppercase tracking-wider leading-none">
                      {format(parseISO(pl.date), 'MMM')}
                    </span>
                    <span className="text-lg font-black text-rose-500 leading-tight">
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
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl hover:text-red-500 hover:bg-red-500/10"
                      onClick={() => setDeleteConfirm(pl)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/20 group-hover:text-rose-500 transition-colors shrink-0" />
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

// Colour per role category
function roleBadgeClass(role: WorshipRole) {
  if (role === 'Lead') return 'bg-rose-500/15 border-rose-500/30 text-rose-500';
  if (role === 'Drums') return 'bg-orange-500/15 border-orange-500/30 text-orange-500';
  if (role.startsWith('Keys')) return 'bg-amber-500/15 border-amber-500/30 text-amber-500';
  if (role === 'Bass') return 'bg-yellow-500/15 border-yellow-500/30 text-yellow-500';
  if (role.startsWith('Vox')) return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500';
  if (role.startsWith('E/G')) return 'bg-sky-500/15 border-sky-500/30 text-sky-500';
  if (role === 'A/G') return 'bg-blue-500/15 border-blue-500/30 text-blue-500';
  if (role === 'PPT') return 'bg-violet-500/15 border-violet-500/30 text-violet-500';
  if (role === 'Sound') return 'bg-pink-500/15 border-pink-500/30 text-pink-500';
  return 'bg-muted/40 border-border/40 text-muted-foreground';
}

// ── NewRosterDialog ────────────────────────────────────────────────────────────
function NewRosterDialog({
  open, onClose, onCreated, playlists,
}: {
  open: boolean; onClose: () => void;
  onCreated: (id: string) => void;
  playlists: WorshipSetlist[];
}) {
  const { createRoster } = useWorshipRosters();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [setlistId, setSetlistId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Auto-fill name from setlist
  const selectedSetlist = playlists.find(p => p.id === setlistId);
  useEffect(() => {
    if (selectedSetlist && !name) setName(selectedSetlist.name);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSetlist]);

  const handleSubmit = async () => {
    if (!name.trim() || !date) return;
    setSaving(true);
    try {
      const id = await createRoster(name, date, setlistId || null);
      toast({ title: 'Roster created' });
      setName(''); setDate(format(new Date(), 'yyyy-MM-dd')); setSetlistId('');
      onCreated(id);
      onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="rounded-3xl p-8 border-border/50 bg-card/95 backdrop-blur-3xl max-w-sm">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl font-black normal-case not-italic tracking-tight">New Roster</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Create a worship team roster for a service.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label htmlFor="r-name">Roster Name <span className="text-rose-500">*</span></Label>
            <Input id="r-name" placeholder="e.g. Sunday Morning" value={name} onChange={e => setName(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-date">Date <span className="text-rose-500">*</span></Label>
            <Input id="r-date" type="date" value={date} onChange={e => setDate(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-playlist">Link to Setlist <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
            <select
              id="r-playlist"
              value={setlistId}
              onChange={e => {
                setSetlistId(e.target.value);
                const sl = playlists.find(p => p.id === e.target.value);
                if (sl) { setName(sl.name); setDate(sl.date); }
              }}
              className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            >
              <option value="">None</option>
              {playlists.map(pl => (
                <option key={pl.id} value={pl.id}>
                  {format(parseISO(pl.date), 'MMM d')} — {pl.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 rounded-xl bg-rose-500 hover:bg-rose-600" onClick={handleSubmit}
              disabled={!name.trim() || !date || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Create
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
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
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-xs text-muted-foreground/60 font-medium flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(parseISO(roster.date), 'EEEE, MMMM d, yyyy')}
            </p>
            {linkedPlaylist ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onOpenPlaylist(linkedPlaylist.id)}
                  className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
                  title="Open linked setlist">
                  <Link2 className="h-2.5 w-2.5" /> {linkedPlaylist.name} ↗
                </button>
                <button
                  onClick={() => setLinkSetlistOpen(true)}
                  className="p-1 rounded-lg hover:bg-rose-500/10 text-muted-foreground/40 hover:text-rose-500 transition-colors"
                  title="Change linked setlist">
                  <Pencil className="h-2.5 w-2.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setLinkSetlistOpen(true)}
                className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground border border-border/40 hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/20 transition-all font-bold"
                title="Link a setlist">
                <Plus className="h-2.5 w-2.5" /> Link Setlist
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {dirty && (
            <Button size="sm" className="rounded-xl bg-rose-500 hover:bg-rose-600 h-9 gap-1.5" onClick={handleSave} disabled={saving}>
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
            className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm transition-all hover:border-rose-500/20"
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
                      m.userId ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-muted/50 border-border/50 text-muted-foreground'
                    )}>
                      {m.userId ? <UserCheck className="h-2.5 w-2.5" /> : <UserX className="h-2.5 w-2.5" />}
                      {m.displayName}
                      <button onClick={() => removeMember(slotIdx, mi)}
                        className="ml-0.5 hover:text-red-500 transition-colors">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))
                )}
              </div>
              <button
                onClick={() => { setPickerSlotIdx(slotIdx); setMemberSearch(''); setGuestName(''); }}
                className="shrink-0 p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground/40 hover:text-rose-500 transition-colors"
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
                          ? 'opacity-40 cursor-not-allowed bg-muted/20'
                          : 'hover:bg-rose-500/10 hover:border-rose-500/20 border border-transparent'
                      )}>
                      <UserCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
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
                <Button size="sm" className="rounded-xl bg-rose-500 hover:bg-rose-600 h-9 shrink-0"
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
                  !roster.setlistId ? "bg-rose-500/10 border-rose-500/20 text-rose-500" : "hover:bg-muted/50 text-muted-foreground"
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
                    roster.setlistId === sl.id ? "bg-rose-500/10 border-rose-500/20" : "hover:bg-rose-500/5 hover:border-rose-500/10"
                  )}>
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors",
                    roster.setlistId === sl.id ? "bg-rose-500/20 border-rose-500/30 text-rose-500" : "bg-muted/30 border-border/40 text-muted-foreground group-hover:border-rose-500/20 group-hover:text-rose-500"
                  )}>
                    <ListMusic className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-bold truncate", roster.setlistId === sl.id ? "text-rose-500" : "text-foreground")}>{sl.name}</p>
                    <p className="text-[10px] text-muted-foreground font-semibold">{format(parseISO(sl.date), 'MMM d, yyyy')}</p>
                  </div>
                  {roster.setlistId === sl.id && <Check className="h-4 w-4 text-rose-500" />}
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
function RostersTab({ onOpenPlaylist }: { onOpenPlaylist: (setlistId: string) => void }) {
  const { rosters, loading, deleteRoster } = useWorshipRosters();
  const { setlists: playlists } = useWorshipSetlists();
  const [newOpen, setNewOpen] = useState(false);
  const [detail, setDetail] = useState<WorshipRoster | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<WorshipRoster | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

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

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-rose-500" /></div>;

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
          <div className="flex justify-end">
            <Button size="sm" className="rounded-xl bg-rose-500 hover:bg-rose-600 h-10 gap-1.5"
              onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4" /> New Roster
            </Button>
          </div>

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
                    className="flex items-center gap-4 p-4 rounded-2xl bg-card/50 border border-border/40 backdrop-blur-sm hover:border-rose-500/30 group transition-all cursor-pointer"
                    onClick={() => setDetail(r)}>
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] font-black text-rose-500/70 uppercase tracking-wider leading-none">
                        {format(parseISO(r.date), 'MMM')}
                      </span>
                      <span className="text-lg font-black text-rose-500 leading-tight">
                        {format(parseISO(r.date), 'd')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{r.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground/60 font-medium">
                          {filled}/{r.slots.length} roles filled
                        </span>
                        {linked && (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                            <Link2 className="h-2 w-2" /> {linked.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl hover:text-red-500 hover:bg-red-500/10"
                        onClick={() => setDeleteConfirm(r)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/20 group-hover:text-rose-500 transition-colors shrink-0" />
                  </motion.div>
                );
              })}
            </div>
          )}

          <NewRosterDialog open={newOpen} onClose={() => setNewOpen(false)}
            onCreated={id => { const r = rosters.find(x => x.id === id); if (r) setDetail(r); }}
            playlists={playlists} />

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
  const { isAdmin, isWorshipTeam, loadingAuth } = useAuth();
  const [tab, setTab] = useState<'playlists' | 'songs' | 'rosters'>('rosters');
  const [pendingSetlistId, setPendingSetlistId] = useState<string | null>(null);

  const handleOpenPlaylist = (setlistId: string) => {
    setPendingSetlistId(setlistId);
    setTab('playlists');
  };

  if (loadingAuth) return null;

  // Access check: Admin or Worship role
  if (!isAdmin && !isWorshipTeam) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)] p-8 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
          <Shield className="h-8 w-8 text-rose-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight">Access Restricted</h1>
          <p className="text-muted-foreground max-w-xs mx-auto">
            The Worship Portal is only accessible to members of the Worship Team.
          </p>
        </div>
        <Button asChild className="rounded-2xl bg-rose-500 hover:bg-rose-600 px-8">
          <Link href="/">Return Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="relative space-y-8 pb-32 max-w-5xl mx-auto px-4 md:px-8 mt-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <PageHeader
          title="Worship Portal"
          description="Build setlists, manage your song library, and access chord sheets for any key."
          icon={Music}
          accentColor="text-rose-500"
          iconBgColor="bg-rose-500/20"
        />
      </motion.div>

      {/* Tab switcher */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="flex p-1 rounded-2xl bg-muted/30 border border-border/30 w-fit gap-1 flex-wrap">
          {([
            { key: 'rosters', label: 'Rosters', icon: Users },
            { key: 'playlists', label: 'Setlists', icon: ListMusic },
            { key: 'songs', label: 'Song Library', icon: BookOpen },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all',
                tab === t.key
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                  : 'text-muted-foreground hover:text-foreground'
              )}>
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <AnimatePresence mode="wait">
          {tab === 'playlists' && <SetlistsTab key="playlists" initialSetlistId={pendingSetlistId} />}
          {tab === 'songs' && <SongsLibraryTab key="songs" />}
          {tab === 'rosters' && <RostersTab key="rosters" onOpenPlaylist={handleOpenPlaylist} />}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
