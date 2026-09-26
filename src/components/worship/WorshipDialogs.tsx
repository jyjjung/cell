"use client";

import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { ButtonSpinner } from '@/components/ui/loading-spinner';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RemoteImage } from '@/components/ui/remote-image';
import { useToast } from '@/hooks/use-toast';
import { useWorshipRosters } from '@/hooks/useWorshipRosters';
import { useWorshipSetlists } from '@/hooks/useWorshipSetlists';
import { useWorshipSongs } from '@/hooks/useWorshipSongs';
import { cn } from '@/lib/utils';
import {
    chordSheetsForKey, parseYoutubeVideoId, type ReferenceTrackDraft
} from '@/lib/worship-utils';
import { chartHtmlToMarkdown, detectKeyFromText, extractChordChartMetadata, isTextChordSheet, parseChordChart, prepareChordChartPaste, savePastedChartText } from '@/lib/chord-chart';
import type { ChordKey, SongChordSheet, WorshipSong } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { useWorshipData } from '@/contexts/worship-data-context';
import { emptyChordAnnotation } from '@/components/worship/text-chord-chart-viewer';
import { CHART_LOGICAL_WIDTH, ChordChartBody } from '@/components/worship/text-chord-chart';
import { format, parseISO } from 'date-fns';
import { Check, Pencil, PlaySquare, Plus, Trash2 } from 'lucide-react';import { useEffect, useMemo, useRef, useState } from 'react';

const WORSHIP_ALL_KEYS: ChordKey[] = [
  'numbers',
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F',
  'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
];

// ── NewSongDialog ─────────────────────────────────────────────────────────────
export function NewSongDialog({
  open, onClose, onCreated,
}: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const { addSong, addTextChordSheet, addChordSheet } = useWorshipSongs();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageKey, setImageKey] = useState<ChordKey>('E');
  const [saving, setSaving] = useState(false);
  const extracted = pasteText ? extractChordChartMetadata(pasteText) : null;

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const id = await addSong(title, artist || undefined, extracted?.metadata);
      if (pasteText.trim()) {
        await addTextChordSheet(id, savePastedChartText(pasteText.trim()), extracted?.metadata.key ?? 'E');
      } else if (imageFile) {
        if (imageFile.type === 'application/pdf') {
          const { convertPdfToImages } = await import('@/lib/pdfUtils');
          const pages = await convertPdfToImages(imageFile, 2);
          for (let index = 0; index < pages.length; index++) {
            const pageFile = new File([pages[index]], `${imageFile.name.replace(/\.pdf$/i, '')}_pg${index + 1}.jpg`, { type: 'image/jpeg' });
            await addChordSheet(id, pageFile, imageKey);
          }
        } else {
          await addChordSheet(id, imageFile, imageKey);
        }
      }
      toast({ title: 'Song created', description: `"${title}" has been added to the library.` });
      setTitle(''); setArtist(''); setPasteText(''); setImageFile(null);
      onCreated(id);
      onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-section-title">New song</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Add a new song to the worship music library.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label htmlFor="s-title">Song Title <span className="text-destructive">*</span></Label>
            <Input id="s-title" placeholder="e.g. Way Maker" value={title} onChange={e => setTitle(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-paste">Paste chord sheet</Label>
            <textarea
              id="s-paste"
              value={pasteText}
              aria-label="Chord sheet text"
              placeholder="Paste from SongSelect or Apple Notes to fill the song details automatically…"
              className="min-h-32 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              onPaste={(e) => {
                const plain = e.clipboardData.getData('text/plain');
                const html = e.clipboardData.getData('text/html');
                if (!html) return;
                e.preventDefault();
                const next = /(?:\*\*|__|^##?\s)/m.test(plain)
                  ? plain.replace(/\r\n?/g, '\n')
                  : prepareChordChartPaste(plain, html);
                setPasteText(next);
                setImageFile(null);
                const details = extractChordChartMetadata(next);
                if (details.title) setTitle(details.title);
                if (details.artist) setArtist(details.artist);
              }}
              onChange={(e) => {
                const next = e.target.value;
                setPasteText(next);
                const details = next.trim() ? extractChordChartMetadata(next) : null;
                if (details?.title) setTitle(details.title);
                if (details?.artist) setArtist(details.artist);
              }}
            />
            {extracted?.metadata && Object.keys(extracted.metadata).length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Detected: {extracted.metadata.key ? `Key ${extracted.metadata.key}` : null}
                {extracted.metadata.tempo ? ` · ${extracted.metadata.tempo} BPM` : null}
                {extracted.metadata.timeSignature ? ` · ${extracted.metadata.timeSignature}` : null}
              </p>
            ) : null}
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-3">
            <div>
              <Label htmlFor="s-image">Image / PDF fallback</Label>
              <p className="text-xs text-muted-foreground">Use this only when a text chord sheet is unavailable.</p>
            </div>
            <Input
              id="s-image"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => {
                setImageFile(e.target.files?.[0] ?? null);
                setPasteText('');
              }}
              className="rounded-xl"
            />
            {imageFile ? (
              <div className="space-y-1.5">
                <Label htmlFor="s-image-key">Sheet key</Label>
                <select
                  id="s-image-key"
                  value={imageKey}
                  onChange={(e) => setImageKey(e.target.value as ChordKey)}
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  {WORSHIP_ALL_KEYS.map((keyOption) => (
                    <option key={keyOption} value={keyOption}>{keyOption === 'numbers' ? '#' : keyOption}</option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-artist">Artist / Writer</Label>
            <Input id="s-artist" placeholder="e.g. Sinach" value={artist} onChange={e => setArtist(e.target.value)} className="rounded-xl" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 rounded-xl bg-primary hover:bg-primary/90" onClick={handleSubmit}
              disabled={!title.trim() || saving}>
              {saving ? <ButtonSpinner className="mr-2" /> : null} Create
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
      <DialogContent className="max-w-sm">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-section-title">New setlist</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Create a setlist for a worship service.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label htmlFor="pl-name">Service Name <span className="text-destructive">*</span></Label>
            <Input id="pl-name" placeholder="e.g. Sunday Morning Service" value={name} onChange={e => setName(e.target.value)}
              className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pl-date">Date <span className="text-destructive">*</span></Label>
            <Input id="pl-date" type="date" value={date} onChange={e => setDate(e.target.value)} className="rounded-xl" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 rounded-xl bg-primary hover:bg-primary/90" onClick={handleSubmit}
              disabled={!name.trim() || !date || saving}>
              {saving ? <ButtonSpinner className="mr-2" /> : null} Create
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
  const worshipData = useWorshipData();
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
      const id = await createRoster(name, date, setlistId || null, worshipData?.rosterRoles);
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
      <DialogContent className="max-w-sm">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-section-title">New roster</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Create a worship team roster for a service.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label htmlFor="r-name">Roster Name <span className="text-destructive">*</span></Label>
            <Input id="r-name" placeholder="e.g. Sunday Morning" value={name} onChange={e => setName(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-date">Date <span className="text-destructive">*</span></Label>
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
              className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring/40"
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
            <Button className="flex-1 rounded-xl bg-primary hover:bg-primary/90" onClick={handleSubmit}
              disabled={!name.trim() || !date || saving}>
              {saving ? <ButtonSpinner className="mr-2" /> : null} Create
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
  selectedAnnotationId,
  onAnnotationIdChange,
  referenceTracks,
  onReferenceTracksChange,
  onRequestUpload,
  onOpenNotesEditor,
  idPrefix = 'ssc',
}: {
  song: WorshipSong;
  selectedKey: ChordKey;
  onKeyChange: (key: ChordKey) => void;
  selectedSheetIds: string[];
  onSheetIdsChange: (ids: string[]) => void;
  selectedAnnotationId: string | 'none';
  onAnnotationIdChange: (id: string | 'none') => void;
  referenceTracks: ReferenceTrackDraft[];
  onReferenceTracksChange: (tracks: ReferenceTrackDraft[]) => void;
  onRequestUpload: () => void;
  /** Open the notes editor outside the parent dialog (avoids focus-trap / inert blocking). */
  onOpenNotesEditor?: (sheet: SongChordSheet, annotationId: string) => void;
  idPrefix?: string;
}) {
  const { currentUser } = useAuth();
  const { updateChordSheet } = useWorshipSongs();
  const [newNoteName, setNewNoteName] = useState('');
  const [namingNote, setNamingNote] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const availableKeys = useMemo(
    () => Array.from(new Set(song.chordSheets.map((s) => s.key))),
    [song.chordSheets],
  );
  const hasTextChart = useMemo(
    () => song.chordSheets.some(isTextChordSheet),
    [song.chordSheets],
  );
  const sheetsForKey = useMemo(
    () => chordSheetsForKey(song, selectedKey),
    [song, selectedKey],
  );
  const textSheets = useMemo(
    () => sheetsForKey.filter(isTextChordSheet),
    [sheetsForKey],
  );
  const noteTarget = textSheets.find((s) => selectedSheetIds.includes(s.id)) ?? textSheets[0] ?? null;
  const annotations = noteTarget?.annotations ?? [];

  const createNote = async () => {
    if (!currentUser || !noteTarget) return;
    const name = newNoteName.trim() || `Notes ${annotations.length + 1}`;
    setSavingNote(true);
    try {
      const created = emptyChordAnnotation(currentUser.uid, name);
      const nextSheet = { ...noteTarget, annotations: [...annotations, created] };
      await updateChordSheet(song.id, noteTarget.id, {
        annotations: nextSheet.annotations,
      });
      onAnnotationIdChange(created.id);
      setNewNoteName('');
      setNamingNote(false);
      onOpenNotesEditor?.(nextSheet, created.id);
    } finally {
      setSavingNote(false);
    }
  };

  const updateTrack = (index: number, patch: Partial<ReferenceTrackDraft>) => {
    onReferenceTracksChange(
      referenceTracks.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const addTrack = () => {
    onReferenceTracksChange([...referenceTracks, { url: '', note: '' }]);
  };

  const removeTrack = (index: number) => {
    const next = referenceTracks.filter((_, i) => i !== index);
    onReferenceTracksChange(next.length > 0 ? next : [{ url: '', note: '' }]);
  };

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
        {(hasTextChart || availableKeys.length > 0) && (
          <p className="text-[11px] text-muted-foreground/60 font-medium">
            {hasTextChart
              ? 'Pasted charts transpose to any key'
              : 'Chord sheets available for highlighted keys'}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {WORSHIP_ALL_KEYS.map((k) => {
            const hasSheet = hasTextChart || availableKeys.includes(k);
            return (
              <Button
                key={k}
                type="button"
                variant="ghost"
                onClick={() => onKeyChange(k)}
                className={cn(
                  'hit-min h-auto px-2.5 py-1 rounded-lg text-xs font-bold border relative',
                  selectedKey === k
                    ? 'bg-muted border-border text-white shadow-md shadow-primary/20'
                    : hasSheet
                    ? 'bg-success/10 border-success/30 text-success hover:border-border'
                    : 'bg-muted border-border/40 text-muted-foreground hover:border-border',
                )}
              >
                {k === 'numbers' ? '#' : k}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Chord Sheets</Label>
          <Button type="button" size="sm" variant="outline" className="h-7 rounded-lg text-xs gap-1"
            onClick={onRequestUpload}>
            <Plus className="h-3 w-3" /> Paste chart
          </Button>
        </div>
        {sheetsForKey.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 font-medium">
            No chart for this key — paste one or pick a different key.
          </p>
        ) : sheetsForKey.length === 1 ? (
          <p className="text-xs text-success font-semibold flex items-center gap-1">
            <Check className="h-3 w-3" /> 1 page selected
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {sheetsForKey.map((sheet, i) => {
              const selected = selectedSheetIds.includes(sheet.id);
              return (
                <Button
                  key={sheet.id}
                  type="button"
                  variant="ghost"
                  onClick={() => toggleSheet(sheet.id)}
                  className={cn(
                    'relative h-20 w-16 overflow-hidden rounded-lg border-2 p-0',
                    selected ? 'border-primary ring-2 ring-primary/30' : 'border-border/40 opacity-50',
                  )}
                >
                  {isTextChordSheet(sheet) ? (
                    <div className="h-full w-full overflow-hidden bg-[#1f1f1f]">
                      <div
                        className="origin-top-left"
                        style={{
                          width: CHART_LOGICAL_WIDTH,
                          transform: 'scale(0.055)',
                        }}
                      >
                        <ChordChartBody blocks={parseChordChart(sheet.sourceText ?? '')} />
                      </div>
                    </div>
                  ) : (
                    <RemoteImage src={sheet.imageUrl} alt={`Page ${i + 1}`} fill className="object-cover" sizes="64px" />
                  )}
                  <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white font-bold text-center py-0.5">
                    Pg {i + 1}
                  </span>
                  {selected && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-white" />
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {textSheets.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Notes</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 rounded-lg text-xs gap-1"
              onClick={() => setNamingNote(true)}
            >
              <Plus className="h-3 w-3" /> New
            </Button>
          </div>
          <select
            value={selectedAnnotationId}
            onChange={(e) => onAnnotationIdChange(e.target.value as string | 'none')}
            className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm"
          >
            <option value="none">None</option>
            {annotations.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          {namingNote && (
            <div className="flex gap-1.5">
              <Input
                value={newNoteName}
                onChange={(e) => setNewNoteName(e.target.value)}
                placeholder="Note name"
                className="h-9 rounded-xl"
                autoFocus
              />
              <Button type="button" size="sm" className="h-9 rounded-xl" disabled={savingNote} onClick={() => void createNote()}>
                {savingNote ? <ButtonSpinner size="sm" /> : 'Add'}
              </Button>
            </div>
          )}
          {selectedAnnotationId !== 'none' && noteTarget && onOpenNotesEditor && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-xl text-xs gap-1"
              onClick={() => {
                const sheet = song.chordSheets.find((s) => s.id === noteTarget.id) ?? noteTarget;
                onOpenNotesEditor(sheet, selectedAnnotationId);
              }}
            >
              <Pencil className="h-3 w-3" /> Draw on chart
            </Button>
          )}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="flex items-center gap-1.5">
            <PlaySquare className="h-4 w-4" /> Reference Tracks <span className="text-muted-foreground text-xs font-normal">(optional)</span>
          </Label>
          <Button type="button" size="sm" variant="outline" className="h-7 rounded-lg text-xs gap-1"
            onClick={addTrack}>
            <Plus className="h-3 w-3" /> Add link
          </Button>
        </div>
        <div className="space-y-2">
          {referenceTracks.map((row, index) => {
            const urlInvalid = row.url.trim().length > 0 && !parseYoutubeVideoId(row.url);
            return (
              <div key={`${idPrefix}-ref-${index}`} className="rounded-xl border border-border/50 p-2.5 space-y-2 bg-muted/20">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0 space-y-2">
                    <Input
                      id={`${idPrefix}-youtube-${index}`}
                      placeholder="https://youtube.com/watch?v=…"
                      value={row.url}
                      onChange={(e) => updateTrack(index, { url: e.target.value })}
                      className={cn('rounded-xl', urlInvalid && 'border-destructive')}
                    />
                    <Input
                      placeholder="Note (e.g. For intro only)"
                      value={row.note}
                      onChange={(e) => updateTrack(index, { note: e.target.value })}
                      className="rounded-xl text-sm"
                    />
                  </div>
                  {referenceTracks.length > 1 && (
                    <IconButton
                      type="button"
                      onClick={() => removeTrack(index)}
                      className="shrink-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      aria-label="Remove link"
                      icon={Trash2}
                      iconClassName="h-3.5 w-3.5"
                    />
                  )}
                </div>
                {urlInvalid && (
                  <p className="text-xs text-destructive">Enter a valid YouTube link</p>
                )}
              </div>
            );
          })}
        </div>
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
  const { addChordSheet, addTextChordSheet, updateSong } = useWorshipSongs();
  const { toast } = useToast();
  const [mode, setMode] = useState<'upload' | 'paste'>('paste');
  const [file, setFile] = useState<File | null>(null);
  const [pasteText, setPasteText] = useState('');
  const keyOverrideRef = useRef(false);
  const [key, setKey] = useState<ChordKey>(defaultKey ?? 'E');
  const [keyConfirmationOpen, setKeyConfirmationOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode('paste');
    setFile(null);
    setPasteText('');
    keyOverrideRef.current = false;
  }, [open]);

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
      if (!defaultKey) setKey('E');
      onUploaded?.(uploadedIds);
      onClose();
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const getSaveKey = () => keyOverrideRef.current ? key : (detectKeyFromText(pasteText) ?? key);

  const requestPasteSave = () => {
    if (!song || !pasteText.trim()) return;
    setKeyConfirmationOpen(true);
  };

  const handlePaste = async () => {
    if (!song || !pasteText.trim()) return;
    setSaving(true);
    try {
      // innerText flattens rich chord spans and loses the ChordPro markers
      // extracted from the clipboard. Keep the normalized text as the
      // editable/parser fallback and preserve the rich HTML separately.
      const sourceText = pasteText;
      const savedKey = getSaveKey();
      const extracted = extractChordChartMetadata(sourceText);
      const metadata = {
        ...song.metadata,
        ...extracted.metadata,
        key: savedKey,
      };
      await updateSong(song.id, {
        ...(extracted.artist && !song.artist?.trim() ? { artist: extracted.artist } : {}),
        metadata,
      });
      const sheet = await addTextChordSheet(
        song.id,
        savePastedChartText(sourceText.trim()),
        savedKey,
      );
      toast({ title: 'Chart saved', description: `Pasted ${sheet.key === 'numbers' ? '#' : sheet.key} chart for ${song.title}.` });
      setPasteText('');
      setKeyConfirmationOpen(false);
      onUploaded?.([sheet.id]);
      onClose();
    } catch (e: any) {
      toast({ title: 'Could not save chart', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const detected = pasteText ? detectKeyFromText(pasteText) : null;
  const saveKey = pasteText ? getSaveKey() : key;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className={cn('max-h-[90vh] overflow-y-auto', mode === 'paste' ? 'max-w-2xl' : 'max-w-sm')}>
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-section-title">Add chart</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Paste from SongSelect for {song?.title}. Upload an image only if you don’t have the text.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-3 flex gap-1 rounded-xl bg-muted p-1">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setMode('paste')}
            className={cn('h-auto flex-1 rounded-lg px-3 py-1.5 text-sm font-medium', mode === 'paste' ? 'bg-background shadow-sm' : 'text-muted-foreground')}
          >
            Paste
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setMode('upload')}
            className={cn('h-auto flex-1 rounded-lg px-3 py-1.5 text-sm font-medium', mode === 'upload' ? 'bg-background shadow-sm' : 'text-muted-foreground')}
          >
            Image / PDF
          </Button>
        </div>
        <div className="space-y-4 mt-4">
          {mode === 'paste' ? (
            <div className="space-y-1.5">
              <Label htmlFor="cs-paste">Paste chart text <span className="text-destructive">*</span></Label>
              <textarea
                id="cs-paste"
                value={pasteText}
                aria-label="Chord sheet text"
                placeholder="Paste from Apple Notes or SongSelect…"
                onPaste={(e) => {
                  const html = e.clipboardData.getData('text/html');
                  const plain = e.clipboardData.getData('text/plain');
                  const markdown = html ? chartHtmlToMarkdown(html) : plain.replace(/\r\n?/g, '\n');
                  e.preventDefault();
                  const target = e.currentTarget;
                  const start = target.selectionStart;
                  const end = target.selectionEnd;
                  const next = `${target.value.slice(0, start)}${markdown}${target.value.slice(end)}`;
                  setPasteText(next);
                  requestAnimationFrame(() => {
                    target.selectionStart = target.selectionEnd = start + markdown.length;
                  });
                  const found = detectKeyFromText(next);
                  if (found) {
                    keyOverrideRef.current = false;
                    setKey(found);
                  }
                }}
                onInput={(e) => {
                  const next = e.currentTarget.value;
                  setPasteText(next);
                  const found = detectKeyFromText(next);
                  if (found) {
                    keyOverrideRef.current = false;
                    setKey(found);
                  }
                }}
                className="min-h-[240px] w-full resize-y overflow-auto rounded-xl border border-border/50 bg-background px-3 py-2 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
              {pasteText.trim() && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Preview — chords sit above the matching words.</p>
                  <div className="max-h-56 overflow-auto rounded-xl bg-[#1f1f1f] px-4 py-3">
                    <ChordChartBody blocks={parseChordChart(pasteText)} />
                  </div>
                </div>
              )}
              {detected && (
                <p className="text-xs text-muted-foreground">Detected original key: {detected}</p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="cs-file">Chart File (Image or PDF) <span className="text-destructive">*</span></Label>
              <Input id="cs-file" type="file" accept="image/*,application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} className="rounded-xl" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="cs-key">{mode === 'paste' ? 'Original key' : 'Musical Key'}</Label>
            <select
              id="cs-key"
              value={key}
              disabled={lockKey && mode === 'upload'}
              onChange={e => {
                keyOverrideRef.current = true;
                setKey(e.target.value as ChordKey);
              }}
              className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-60"
            >
              {WORSHIP_ALL_KEYS.map(k => (
                <option key={k} value={k}>{k === 'numbers' ? '#' : k}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancel</Button>
            {mode === 'paste' ? (
              <Button className="flex-1 rounded-xl bg-primary hover:bg-primary/90" onClick={requestPasteSave}
                disabled={!pasteText.trim() || saving}>
                Save chart
              </Button>
            ) : (
              <Button className="flex-1 rounded-xl bg-primary hover:bg-primary/90" onClick={handleUpload}
                disabled={!file || saving}>
                {saving ? <ButtonSpinner className="mr-2" /> : null} Upload
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
      <AlertDialog open={keyConfirmationOpen} onOpenChange={setKeyConfirmationOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm original key</AlertDialogTitle>
            <AlertDialogDescription>
              This chart will be saved as being in the key of{' '}
              <strong className="text-foreground">{saveKey === 'numbers' ? '#' : saveKey}</strong>.
              Is this correct?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Go back</AlertDialogCancel>
            <AlertDialogAction onClick={handlePaste} disabled={saving}>
              {saving ? <ButtonSpinner className="mr-2" /> : null}
              Confirm and save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
