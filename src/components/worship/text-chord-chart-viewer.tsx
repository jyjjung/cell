'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TextChordChartCanvas } from '@/components/worship/text-chord-chart';
import { useAuth } from '@/contexts/auth-context';
import { useWorshipSongs } from '@/hooks/useWorshipSongs';
import { LETTER_KEYS } from '@/lib/chord-chart';
import { cn } from '@/lib/utils';
import type { ChordChartAnnotation, ChordChartStroke, ChordKey, SongChordSheet } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { Check, Eraser, Loader2, Pencil, Plus, Trash2, Undo2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const INK_COLORS = ['#f43f5e', '#4ade80', '#facc15', '#38bdf8', '#f8fafc'];

function emptyAnnotation(uid: string, name: string): ChordChartAnnotation {
  return {
    id: crypto.randomUUID(),
    name,
    createdBy: uid,
    createdAt: Timestamp.now(),
    strokes: [],
  };
}

export const emptyChordAnnotation = emptyAnnotation;

export function TextChordChartViewer({
  songId,
  songTitle,
  sheet,
  onClose,
  initialAnnotationId,
  startDrawing,
}: {
  songId: string;
  songTitle: string;
  sheet: SongChordSheet;
  onClose: () => void;
  initialAnnotationId?: string;
  startDrawing?: boolean;
}) {
  const { currentUser } = useAuth();
  const { updateChordSheet } = useWorshipSongs();
  const [displayKey, setDisplayKey] = useState<ChordKey>(sheet.key);
  const [annotationId, setAnnotationId] = useState<string | 'none'>(initialAnnotationId ?? 'none');
  const [editing, setEditing] = useState(Boolean(startDrawing && initialAnnotationId));
  const [inkColor, setInkColor] = useState(INK_COLORS[0]);
  const [draftName, setDraftName] = useState('');
  const [strokes, setStrokes] = useState<ChordChartStroke[]>([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [zoom, setZoom] = useState(1);

  const [annotations, setAnnotations] = useState<ChordChartAnnotation[]>(sheet.annotations ?? []);
  const active = annotations.find((a) => a.id === annotationId) ?? null;

  useEffect(() => {
    setDisplayKey(sheet.key);
    setAnnotations(sheet.annotations ?? []);
  }, [sheet.id, sheet.key, sheet.annotations]);

  useEffect(() => {
    setStrokes(active?.strokes ?? []);
    setDirty(false);
    setDraftName(active?.name ?? '');
  }, [active?.id, sheet.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape') onClose();
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        setZoom((z) => Math.min(3, +(z * 1.25).toFixed(2)));
      }
      if (e.key === '-') {
        e.preventDefault();
        setZoom((z) => Math.max(0.5, +(z / 1.25).toFixed(2)));
      }
      if (e.key === '0') setZoom(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleStrokesChange = (next: ChordChartStroke[]) => {
    setStrokes(next);
    setDirty(true);
  };

  const persist = async (nextAnnotations: ChordChartAnnotation[]) => {
    if (!currentUser) return;
    setSaving(true);
    setAnnotations(nextAnnotations);
    try {
      await updateChordSheet(songId, sheet.id, { annotations: nextAnnotations });
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const saveActive = async () => {
    if (!currentUser || annotationId === 'none') return;
    const name = draftName.trim() || 'Notes';
    const next: ChordChartAnnotation = active
      ? { ...active, name, strokes, updatedAt: Timestamp.now() }
      : { ...emptyAnnotation(currentUser.uid, name), id: annotationId, strokes };
    const exists = annotations.some((a) => a.id === next.id);
    const list = exists
      ? annotations.map((a) => (a.id === next.id ? next : a))
      : [...annotations, next];
    await persist(list);
  };

  const createAnnotation = async () => {
    if (!currentUser) return;
    const created = emptyAnnotation(currentUser.uid, `Notes ${annotations.length + 1}`);
    setAnnotationId(created.id);
    setEditing(true);
    await persist([...annotations, created]);
  };

  const deleteAnnotation = async () => {
    if (!currentUser || annotationId === 'none') return;
    const label = active?.name?.trim() || 'these notes';
    if (!window.confirm(`Delete ${label}? This removes them for everyone.`)) return;
    const list = annotations.filter((a) => a.id !== annotationId);
    setAnnotationId('none');
    setEditing(false);
    setStrokes([]);
    await persist(list);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[400] flex flex-col bg-black/90">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 bg-zinc-950 px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{songTitle}</p>
          <p className="text-[11px] text-white/50">Text chart · transpose and notes are saved for everyone</p>
        </div>
        <label className="flex items-center gap-1.5 text-[11px] text-white/70">
          Key
          <select
            value={displayKey}
            onChange={(e) => setDisplayKey(e.target.value as ChordKey)}
            className="h-8 rounded-lg border border-white/15 bg-white/10 px-2 text-sm text-white"
          >
            {(['numbers', ...LETTER_KEYS] as ChordKey[]).map((k) => (
              <option key={k} value={k} className="text-black">
                {k === 'numbers' ? '#' : k}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-white/70">
          Notes
          <select
            value={annotationId}
            onChange={(e) => {
              void (dirty && annotationId !== 'none' ? saveActive() : Promise.resolve());
              setAnnotationId(e.target.value as string | 'none');
              setEditing(false);
            }}
            className="h-8 max-w-[10rem] rounded-lg border border-white/15 bg-white/10 px-2 text-sm text-white"
          >
            <option value="none" className="text-black">None</option>
            {annotations.map((a) => (
              <option key={a.id} value={a.id} className="text-black">{a.name}</option>
            ))}
          </select>
        </label>
        <Button size="sm" variant="outline" className="h-8 rounded-lg border-white/20 bg-transparent text-white hover:bg-white/10" onClick={() => void createAnnotation()}>
          <Plus className="h-3.5 w-3.5" /> New
        </Button>
        {annotationId !== 'none' && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 rounded-lg text-rose-300 hover:bg-rose-500/15 hover:text-rose-200"
            onClick={() => void deleteAnnotation()}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        )}
        {annotationId !== 'none' && (
          <Button
            size="sm"
            variant={editing ? 'default' : 'outline'}
            className={cn('h-8 rounded-lg', !editing && 'border-white/20 bg-transparent text-white hover:bg-white/10')}
            onClick={() => {
              if (editing) void saveActive();
              setEditing((v) => !v);
            }}
          >
            {editing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
            {editing ? 'Done' : 'Draw'}
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-white hover:bg-white/10"
          title="Zoom out"
          onClick={() => setZoom((z) => Math.max(0.5, +(z / 1.25).toFixed(2)))}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <button
          type="button"
          className="min-w-[3.25rem] rounded-lg px-1.5 text-xs font-semibold text-white/80 hover:bg-white/10"
          title="Reset zoom"
          onClick={() => setZoom(1)}
        >
          {Math.round(zoom * 100)}%
        </button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-white hover:bg-white/10"
          title="Zoom in"
          onClick={() => setZoom((z) => Math.min(3, +(z * 1.25).toFixed(2)))}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/10" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {editing && annotationId !== 'none' && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 bg-zinc-950/90 px-3 py-2">
          <Input
            value={draftName}
            onChange={(e) => { setDraftName(e.target.value); setDirty(true); }}
            className="h-8 max-w-[12rem] rounded-lg border-white/15 bg-white/10 text-sm text-white"
            placeholder="Note name"
          />
          <div className="flex items-center gap-1.5">
            {INK_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                title="Ink color"
                onClick={() => setInkColor(color)}
                className={cn(
                  'h-7 w-7 rounded-full border-2',
                  inkColor === color ? 'border-white' : 'border-transparent',
                )}
                style={{ background: color }}
              />
            ))}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-white hover:bg-white/10"
            disabled={strokes.length === 0}
            onClick={() => handleStrokesChange(strokes.slice(0, -1))}
          >
            <Undo2 className="h-3.5 w-3.5" /> Undo
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-white hover:bg-white/10"
            disabled={strokes.length === 0}
            onClick={() => handleStrokesChange([])}
          >
            <Eraser className="h-3.5 w-3.5" /> Clear
          </Button>
          <Button size="sm" className="h-8 rounded-lg" disabled={!dirty || saving} onClick={() => void saveActive()}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save for everyone
          </Button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-5">
        <div className="mx-auto w-full max-w-6xl rounded-xl border border-white/10">
          <TextChordChartCanvas
            sheet={sheet}
            originalKey={sheet.key}
            displayKey={displayKey}
            strokes={annotationId === 'none' ? [] : strokes}
            drawing={editing && annotationId !== 'none'}
            inkColor={inkColor}
            onStrokesChange={handleStrokesChange}
            zoom={zoom}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function EmbeddedTextChart({
  sheet,
  songId,
  songTitle,
  displayKey,
  zoom = 1,
  annotationId,
}: {
  sheet: SongChordSheet;
  songId?: string;
  songTitle: string;
  displayKey: ChordKey;
  zoom?: number;
  annotationId?: string;
}) {
  const [open, setOpen] = useState(false);
  const strokes = annotationId
    ? (sheet.annotations?.find((a) => a.id === annotationId)?.strokes ?? [])
    : [];
  return (
    <>
      <div className="w-full max-w-6xl rounded-xl border border-white/10">
        <TextChordChartCanvas
          sheet={sheet}
          originalKey={sheet.key}
          displayKey={displayKey === 'numbers' ? sheet.key : displayKey}
          strokes={strokes}
          zoom={zoom}
        />
        {songId && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex w-full items-center justify-center gap-1.5 bg-black/40 px-3 py-2 text-xs font-medium text-white/80 hover:bg-black/55"
          >
            <Pencil className="h-3.5 w-3.5" /> Transpose & notes
          </button>
        )}
      </div>
      {open && songId && (
        <TextChordChartViewer
          songId={songId}
          songTitle={songTitle}
          sheet={sheet}
          onClose={() => setOpen(false)}
          initialAnnotationId={annotationId}
        />
      )}
    </>
  );
}
