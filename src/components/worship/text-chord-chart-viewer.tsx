'use client';

import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { ButtonSpinner } from '@/components/ui/loading-spinner';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TextChordChartCanvas, TEXT_CHART_SURFACE } from '@/components/worship/text-chord-chart';
import {
  useViewerTheme,
  viewerControlBtn,
  viewerShell,
  viewerTitlePrimary,
} from '@/components/worship/viewer-theme';
import { useAuth } from '@/contexts/auth-context';
import { useWorshipSongs } from '@/hooks/useWorshipSongs';
import { LETTER_KEYS } from '@/lib/chord-chart';
import { cn } from '@/lib/utils';
import type { ChordChartAnnotation, ChordChartStroke, ChordKey, SongChordSheet } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { Check, Eraser, Highlighter, Pencil, Plus, Trash2, Undo2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const INK_COLORS_DARK = ['#f43f5e', '#4ade80', '#facc15', '#38bdf8', '#f8fafc'];
const PEN_WIDTH = 3.2;
const HIGHLIGHT_WIDTH = 16;

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

function withAlpha(hex: string, alpha: string): string {
  if (/^#[0-9a-f]{6}$/i.test(hex)) return `${hex}${alpha}`;
  return hex;
}

function ViewerSelect({
  id,
  label,
  value,
  onChange,
  isDark,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  isDark: boolean;
  children: ReactNode;
}) {
  return (
    <label htmlFor={id} className={cn('flex items-center gap-2 text-xs font-medium', isDark ? 'text-white/70' : 'text-muted-foreground')}>
      {label}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-11 min-w-[4.5rem] max-w-[10rem] rounded-xl border px-2.5 text-sm',
          isDark
            ? 'border-white/15 bg-white/10 text-white'
            : 'border-border/60 bg-muted/50 text-foreground',
        )}
      >
        {children}
      </select>
    </label>
  );
}

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
  const viewerTheme = useViewerTheme();
  const isDark = viewerTheme === 'dark';
  const [displayKey, setDisplayKey] = useState<ChordKey>(sheet.key);
  const [annotationId, setAnnotationId] = useState<string | 'none'>(initialAnnotationId ?? 'none');
  const [editing, setEditing] = useState(Boolean(startDrawing && initialAnnotationId));
  const [tool, setTool] = useState<'pen' | 'highlight'>('pen');
  const [inkColor, setInkColor] = useState(INK_COLORS_DARK[0]);
  const [draftName, setDraftName] = useState('');
  const [strokes, setStrokes] = useState<ChordChartStroke[]>([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [annotations, setAnnotations] = useState<ChordChartAnnotation[]>(sheet.annotations ?? []);
  const active = annotations.find((a) => a.id === annotationId) ?? null;
  const inkColors = INK_COLORS_DARK;
  const strokeColor = tool === 'highlight' ? withAlpha(inkColor, '59') : inkColor;
  const strokeWidth = tool === 'highlight' ? HIGHLIGHT_WIDTH : PEN_WIDTH;

  useEffect(() => {
    if (!inkColors.includes(inkColor)) setInkColor(inkColors[0]);
  }, [inkColor, inkColors]);

  useEffect(() => {
    setDisplayKey(sheet.key);
    setAnnotations(sheet.annotations ?? []);
  }, [sheet.id, sheet.key, sheet.annotations]);

  useEffect(() => {
    setStrokes(active?.strokes ?? []);
    setDirty(false);
    setDraftName(active?.name ?? '');
  }, [active?.id, sheet.id]);

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

  const requestClose = useCallback(() => {
    if (dirty) setLeaveOpen(true);
    else onClose();
  }, [dirty, onClose]);

  const handleStrokesChange = (next: ChordChartStroke[]) => {
    setStrokes(next);
    setDirty(true);
  };

  const saveActiveRef = useRef(saveActive);
  saveActiveRef.current = saveActive;
  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;
  const editingRef = useRef(editing);
  editingRef.current = editing;
  const annotationIdRef = useRef(annotationId);
  annotationIdRef.current = annotationId;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const strokesLenRef = useRef(strokes.length);
  strokesLenRef.current = strokes.length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        requestCloseRef.current();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (!editingRef.current || strokesLenRef.current === 0) return;
        setStrokes((prev) => prev.slice(0, -1));
        setDirty(true);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (dirtyRef.current && annotationIdRef.current !== 'none') void saveActiveRef.current();
        return;
      }
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
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const dir = e.deltaY > 0 ? 1 / 1.12 : 1.12;
      setZoom((z) => Math.min(3, Math.max(0.5, +(z * dir).toFixed(2))));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const createAnnotation = async () => {
    if (!currentUser) return;
    if (dirty && annotationId !== 'none') await saveActive();
    const created = emptyAnnotation(currentUser.uid, `Notes ${annotations.length + 1}`);
    setAnnotationId(created.id);
    setEditing(true);
    await persist([...annotations, created]);
  };

  const confirmDeleteAnnotation = async () => {
    if (!currentUser || annotationId === 'none') return;
    const list = annotations.filter((a) => a.id !== annotationId);
    setAnnotationId('none');
    setEditing(false);
    setStrokes([]);
    setDeleteOpen(false);
    await persist(list);
  };

  const switchAnnotation = (nextId: string) => {
    void (dirty && annotationId !== 'none' ? saveActive() : Promise.resolve());
    setAnnotationId(nextId as string | 'none');
    setEditing(false);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
    <div
      className={cn('fixed inset-0 z-[400] flex flex-col', viewerShell(isDark))}
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-3 pt-3 pb-2">
        <div className="flex min-w-0 items-center gap-2">
          <IconButton
            aria-label="Close"
            icon={X}
            className={cn(viewerControlBtn(isDark), 'shrink-0')}
            onClick={requestClose}
          />
          <p className={cn('min-w-0 truncate text-sm font-semibold', viewerTitlePrimary(isDark))}>{songTitle}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <ViewerSelect
            id="chart-key"
            label="Key"
            value={displayKey}
            onChange={(v) => setDisplayKey(v as ChordKey)}
            isDark={isDark}
          >
            {(['numbers', ...LETTER_KEYS] as ChordKey[]).map((k) => (
              <option key={k} value={k} className="text-foreground">
                {k === 'numbers' ? '#' : k}
              </option>
            ))}
          </ViewerSelect>
          <ViewerSelect
            id="chart-notes"
            label="Notes"
            value={annotationId}
            onChange={switchAnnotation}
            isDark={isDark}
          >
            <option value="none" className="text-foreground">None</option>
            {annotations.map((a) => (
              <option key={a.id} value={a.id} className="text-foreground">{a.name}</option>
            ))}
          </ViewerSelect>
          <IconButton
            aria-label="New notes"
            icon={Plus}
            className={viewerControlBtn(isDark)}
            onClick={() => void createAnnotation()}
          />
          {annotationId !== 'none' && (
            <IconButton
              aria-label="Delete notes"
              icon={Trash2}
              className={cn(
                viewerControlBtn(isDark),
                isDark ? 'text-rose-300 hover:bg-rose-500/15' : 'text-destructive',
              )}
              onClick={() => setDeleteOpen(true)}
            />
          )}
          {annotationId !== 'none' && (
            <Button
              size="sm"
              variant={editing ? 'default' : 'outline'}
              className={cn(
                'h-11 rounded-xl',
                !editing && (isDark ? 'border-white/20 bg-transparent text-white hover:bg-white/10' : ''),
              )}
              onClick={() => {
                if (editing) void saveActive();
                setEditing((v) => !v);
              }}
            >
              {editing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              {editing ? 'Done' : 'Draw'}
            </Button>
          )}
          <IconButton
            aria-label="Zoom out"
            icon={ZoomOut}
            className={viewerControlBtn(isDark)}
            onClick={() => setZoom((z) => Math.max(0.5, +(z / 1.25).toFixed(2)))}
          />
          <Button
            type="button"
            variant="ghost"
            className={cn(
              'min-h-11 min-w-[3.25rem] rounded-xl px-1.5 text-xs font-semibold',
              isDark ? 'text-white/80 hover:bg-white/10' : 'text-muted-foreground hover:bg-muted',
            )}
            aria-label="Reset zoom"
            onClick={() => setZoom(1)}
          >
            {Math.round(zoom * 100)}%
          </Button>
          <IconButton
            aria-label="Zoom in"
            icon={ZoomIn}
            className={viewerControlBtn(isDark)}
            onClick={() => setZoom((z) => Math.min(3, +(z * 1.25).toFixed(2)))}
          />
        </div>
      </div>

      {editing && annotationId !== 'none' && (
        <div className={cn(
          'flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2',
          isDark ? 'border-white/10 bg-black/40' : 'border-border/60 bg-muted/30',
        )}>
          <Input
            value={draftName}
            onChange={(e) => { setDraftName(e.target.value); setDirty(true); }}
            className={cn(
              'h-11 max-w-[12rem] rounded-xl text-sm',
              isDark ? 'border-white/15 bg-white/10 text-white' : '',
            )}
            placeholder="Note name"
            aria-label="Note name"
          />
          <div className="flex items-center gap-1">
            <IconButton
              aria-label="Pen"
              aria-pressed={tool === 'pen'}
              icon={Pencil}
              className={cn(viewerControlBtn(isDark), tool === 'pen' && (isDark ? 'bg-white/25' : 'bg-muted'))}
              onClick={() => setTool('pen')}
            />
            <IconButton
              aria-label="Highlighter"
              aria-pressed={tool === 'highlight'}
              icon={Highlighter}
              className={cn(viewerControlBtn(isDark), tool === 'highlight' && (isDark ? 'bg-white/25' : 'bg-muted'))}
              onClick={() => setTool('highlight')}
            />
          </div>
          <div className="flex items-center gap-1.5">
            {inkColors.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Ink color ${color}`}
                aria-pressed={inkColor === color}
                onClick={() => setInkColor(color)}
                className={cn(
                  'hit-min flex items-center justify-center rounded-full',
                  inkColor === color ? (isDark ? 'ring-2 ring-white' : 'ring-2 ring-foreground') : '',
                )}
              >
                <span className="h-7 w-7 rounded-full border-2 border-transparent" style={{ background: color }} />
              </button>
            ))}
          </div>
          <IconButton
            aria-label="Undo last stroke"
            icon={Undo2}
            className={viewerControlBtn(isDark)}
            disabled={strokes.length === 0}
            onClick={() => handleStrokesChange(strokes.slice(0, -1))}
          />
          <IconButton
            aria-label="Clear all marks"
            icon={Eraser}
            className={viewerControlBtn(isDark)}
            disabled={strokes.length === 0}
            onClick={() => handleStrokesChange([])}
          />
          <Button
            className="h-11 rounded-xl"
            disabled={!dirty || saving}
            onClick={() => void saveActive()}
          >
            {saving ? <ButtonSpinner size="sm" /> : null} Save
          </Button>
        </div>
      )}

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto p-3 sm:p-5">
        <div className={cn(
          'mx-auto w-full max-w-6xl overflow-hidden rounded-xl border',
          isDark ? 'border-white/10' : 'border-border/60',
        )}>
          <TextChordChartCanvas
            sheet={sheet}
            originalKey={sheet.key}
            displayKey={displayKey}
            strokes={annotationId === 'none' ? [] : strokes}
            drawing={editing && annotationId !== 'none'}
            inkColor={strokeColor}
            inkWidth={strokeWidth}
            onStrokesChange={handleStrokesChange}
            zoom={zoom}
            theme={TEXT_CHART_SURFACE}
          />
        </div>
      </div>
    </div>
    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete {active?.name?.trim() || 'these notes'}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This removes them for everyone and cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => void confirmDeleteAnnotation()}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
          <AlertDialogDescription>
            Your marks on this chart have not been saved.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              setLeaveOpen(false);
              onClose();
            }}
          >
            Leave
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>,
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
  className,
}: {
  sheet: SongChordSheet;
  songId?: string;
  songTitle: string;
  displayKey: ChordKey;
  zoom?: number;
  annotationId?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const strokes = annotationId
    ? (sheet.annotations?.find((a) => a.id === annotationId)?.strokes ?? [])
    : [];
  return (
    <>
      <div className={cn(
        'w-full max-w-6xl overflow-hidden rounded-xl border border-white/10',
        className,
      )}>
        <TextChordChartCanvas
          sheet={sheet}
          originalKey={sheet.key}
          displayKey={displayKey === 'numbers' ? sheet.key : displayKey}
          strokes={strokes}
          zoom={zoom}
          theme={TEXT_CHART_SURFACE}
        />
        {songId && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(true)}
            className="h-auto w-full justify-center gap-1.5 rounded-none bg-black/40 px-3 py-2 text-xs font-medium text-white/80 hover:bg-black/55"
          >
            <Pencil className="h-3.5 w-3.5" /> Transpose and notes
          </Button>
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
