"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  Plus, Loader2, Music, ListMusic, Calendar, Search, 
  ChevronRight, Trash2, Key as KeyIcon, Check, Upload, Youtube
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { useWorshipSongs } from '@/hooks/useWorshipSongs';
import { useWorshipSetlists } from '@/hooks/useWorshipSetlists';
import { useWorshipRosters } from '@/hooks/useWorshipRosters';
import type { WorshipSong, WorshipSetlist, ChordKey, SongChordSheet } from '@/types';
import { cn } from '@/lib/utils';
import { chordSheetsForKey, parseYoutubeVideoId } from '@/lib/worship-utils';

export const WORSHIP_ALL_KEYS: ChordKey[] = [
  'numbers',
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F',
  'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
];

// ── NewSongDialog ─────────────────────────────────────────────────────────────
export function NewSongDialog({
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
            Add a new song to the worship music library.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label htmlFor="s-title">Song Title <span className="text-rose-500">*</span></Label>
            <Input id="s-title" placeholder="e.g. Way Maker" value={title} onChange={e => setTitle(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-artist">Artist / Writer</Label>
            <Input id="s-artist" placeholder="e.g. Sinach" value={artist} onChange={e => setArtist(e.target.value)} className="rounded-xl" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 rounded-xl bg-rose-500 hover:bg-rose-600" onClick={handleSubmit}
              disabled={!title.trim() || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Create
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── NewSetlistDialog ─────────────────────────────────────────────────────────
export function NewSetlistDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
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

// ── NewRosterDialog ────────────────────────────────────────────────────────────
export function NewRosterDialog({
  open, onClose, onCreated,
}: {
  open: boolean; onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { createRoster } = useWorshipRosters();
  const { setlists: playlists } = useWorshipSetlists();
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
              className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-rose-500/40"
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

// ── SetlistSongConfigPanel ────────────────────────────────────────────────────
export function SetlistSongConfigPanel({
  song,
  selectedKey,
  onKeyChange,
  selectedSheetIds,
  onSheetIdsChange,
  youtubeUrl,
  onYoutubeUrlChange,
  onRequestUpload,
  idPrefix = 'ssc',
}: {
  song: WorshipSong;
  selectedKey: ChordKey;
  onKeyChange: (key: ChordKey) => void;
  selectedSheetIds: string[];
  onSheetIdsChange: (ids: string[]) => void;
  youtubeUrl: string;
  onYoutubeUrlChange: (url: string) => void;
  onRequestUpload: () => void;
  idPrefix?: string;
}) {
  const availableKeys = useMemo(
    () => Array.from(new Set(song.chordSheets.map((s) => s.key))),
    [song.chordSheets],
  );
  const sheetsForKey = useMemo(
    () => chordSheetsForKey(song, selectedKey),
    [song, selectedKey],
  );

  const youtubeId = youtubeUrl.trim() ? parseYoutubeVideoId(youtubeUrl) : null;
  const youtubeInvalid = youtubeUrl.trim().length > 0 && !youtubeId;

  const toggleSheet = (sheetId: string) => {
    if (selectedSheetIds.includes(sheetId)) {
      const next = selectedSheetIds.filter((id) => id !== sheetId);
      if (next.length > 0) onSheetIdsChange(next);
    } else {
      onSheetIdsChange([...selectedSheetIds, sheetId]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Select Key</Label>
        {availableKeys.length > 0 && (
          <p className="text-[11px] text-muted-foreground/60 font-medium">
            Chord sheets available for highlighted keys
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {WORSHIP_ALL_KEYS.map((k) => {
            const hasSheet = availableKeys.includes(k);
            return (
              <button
                key={k}
                type="button"
                onClick={() => onKeyChange(k)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold border transition-all relative',
                  selectedKey === k
                    ? 'bg-muted border-border text-white shadow-md shadow-rose-500/20'
                    : hasSheet
                    ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-600 hover:border-border'
                    : 'bg-muted border-border/40 text-muted-foreground hover:border-border',
                )}
              >
                {k === 'numbers' ? '#' : k}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Chord Sheets</Label>
          <Button type="button" size="sm" variant="outline" className="h-7 rounded-lg text-xs gap-1"
            onClick={onRequestUpload}>
            <Upload className="h-3 w-3" /> Upload
          </Button>
        </div>
        {sheetsForKey.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 font-medium">
            No chart for this key — upload one or pick a different key.
          </p>
        ) : sheetsForKey.length === 1 ? (
          <p className="text-xs text-green-600 dark:text-green-600 font-semibold flex items-center gap-1">
            <Check className="h-3 w-3" /> 1 page selected
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {sheetsForKey.map((sheet, i) => {
              const selected = selectedSheetIds.includes(sheet.id);
              return (
                <button
                  key={sheet.id}
                  type="button"
                  onClick={() => toggleSheet(sheet.id)}
                  className={cn(
                    'relative w-16 h-20 rounded-lg border-2 overflow-hidden transition-all',
                    selected ? 'border-primary ring-2 ring-primary/30' : 'border-border/40 opacity-50',
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sheet.imageUrl} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white font-bold text-center py-0.5">
                    Pg {i + 1}
                  </span>
                  {selected && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-white" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-youtube`} className="flex items-center gap-1.5">
          <Youtube className="h-3.5 w-3.5" /> Reference Track <span className="text-muted-foreground text-xs font-normal">(optional)</span>
        </Label>
        <Input
          id={`${idPrefix}-youtube`}
          placeholder="https://youtube.com/watch?v=…"
          value={youtubeUrl}
          onChange={(e) => onYoutubeUrlChange(e.target.value)}
          className={cn('rounded-xl', youtubeInvalid && 'border-destructive')}
        />
        {youtubeInvalid && (
          <p className="text-xs text-destructive">Enter a valid YouTube link</p>
        )}
      </div>
    </div>
  );
}

// ── AddChordSheetDialog ───────────────────────────────────────────────────────
export function AddChordSheetDialog({
  open, song, onClose, defaultKey, lockKey, onUploaded,
}: {
  open: boolean;
  song: WorshipSong | null;
  onClose: () => void;
  defaultKey?: ChordKey;
  lockKey?: boolean;
  onUploaded?: (sheetIds: string[]) => void;
}) {
  const { addChordSheet } = useWorshipSongs();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [key, setKey] = useState<ChordKey>(defaultKey ?? 'numbers');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && defaultKey) setKey(defaultKey);
  }, [open, defaultKey]);

  const handleUpload = async () => {
    if (!song || !file) return;
    setSaving(true);
    const uploadedIds: string[] = [];
    try {
      if (file.type === 'application/pdf') {
        toast({ title: 'Processing PDF', description: 'Converting pages to images...' });
        const { convertPdfToImages } = await import('@/lib/pdfUtils');
        const blobs = await convertPdfToImages(file, 2);

        toast({ title: 'Uploading', description: `Uploading ${blobs.length} page(s)...` });
        for (let i = 0; i < blobs.length; i++) {
          const pageFile = new File([blobs[i]], `${file.name.replace('.pdf', '')}_pg${i + 1}.jpg`, { type: 'image/jpeg' });
          const sheet = await addChordSheet(song.id, pageFile, key);
          uploadedIds.push(sheet.id);
        }
        toast({ title: 'Chord sheet uploaded', description: `Added ${blobs.length} pages for ${key === 'numbers' ? '#' : key} chart to ${song.title}.` });
      } else {
        const sheet = await addChordSheet(song.id, file, key);
        uploadedIds.push(sheet.id);
        toast({ title: 'Chord sheet uploaded', description: `Added ${key === 'numbers' ? '#' : key} chart to ${song.title}.` });
      }

      setFile(null);
      if (!defaultKey) setKey('numbers');
      onUploaded?.(uploadedIds);
      onClose();
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="rounded-3xl p-8 border-border/50 bg-card/95 backdrop-blur-3xl max-w-sm">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl font-black normal-case not-italic tracking-tight">Upload Chart</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Add a chord sheet image or PDF for {song?.title}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label htmlFor="cs-file">Chart File (Image or PDF) <span className="text-rose-500">*</span></Label>
            <Input id="cs-file" type="file" accept="image/*,application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cs-key">Musical Key</Label>
            <select
              id="cs-key"
              value={key}
              disabled={lockKey}
              onChange={e => setKey(e.target.value as ChordKey)}
              className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-rose-500/40 disabled:opacity-60"
            >
              {WORSHIP_ALL_KEYS.map(k => (
                <option key={k} value={k}>{k === 'numbers' ? '#' : k}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 rounded-xl bg-rose-500 hover:bg-rose-600" onClick={handleUpload}
              disabled={!file || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Upload
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
