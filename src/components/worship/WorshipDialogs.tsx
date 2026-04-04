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
  ChevronRight, Trash2, Key as KeyIcon, Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { useWorshipSongs } from '@/hooks/useWorshipSongs';
import { useWorshipSetlists } from '@/hooks/useWorshipSetlists';
import { useWorshipRosters } from '@/hooks/useWorshipRosters';
import { useAllUsers } from '@/hooks/use-all-users';
import type { WorshipSong, WorshipSetlist, ChordKey, SongChordSheet } from '@/types';
import { cn } from '@/lib/utils';

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

// ── AddChordSheetDialog ───────────────────────────────────────────────────────
export function AddChordSheetDialog({
  open, song, onClose,
}: { open: boolean; song: WorshipSong | null; onClose: () => void }) {
  const { addChordSheet } = useWorshipSongs();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [key, setKey] = useState<ChordKey>('numbers');
  const [saving, setSaving] = useState(false);

  const ALL_KEYS: ChordKey[] = [
    'numbers',
    'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F',
    'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
  ];

  const handleUpload = async () => {
    if (!song || !file) return;
    setSaving(true);
    try {
      await addChordSheet(song.id, file, key);
      toast({ title: 'Chord sheet uploaded', description: `Added ${key === 'numbers' ? '#' : key} chart to ${song.title}.` });
      setFile(null); setKey('numbers');
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
              onChange={e => setKey(e.target.value as ChordKey)}
              className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            >
              {ALL_KEYS.map(k => (
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
