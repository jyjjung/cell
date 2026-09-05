"use client";

import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { NavPageHeader, EmptyState } from '@/components/ui/page-layout';
import { PageLoading, ButtonSpinner } from '@/components/ui/loading-spinner';;
import { ScheduleRowDate, DrillDownListRow, ScheduleListCard, drillDownRowButtonClass } from '@/components/schedule/schedule-occurrence-row';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { RemoteImage } from '@/components/ui/remote-image';
import { FullScreenViewer, ViewerSlide } from '@/components/worship/FullScreenViewer';
import { TextChordChartViewer } from '@/components/worship/text-chord-chart-viewer';
import { MemberGuestPickerDialog, RosterRoleSlotRow } from '@/components/worship/roster-people-picker';
import { AddWorshipRoleDialog, WorshipRosterRolesPanel } from '@/components/worship/worship-roster-roles-panel';
import { AddChordSheetDialog, NewRosterDialog, NewSetlistDialog, NewSongDialog, SetlistSongConfigPanel } from '@/components/worship/WorshipDialogs';
import { ReferenceTracksListen } from '@/components/worship/YoutubeReferenceEmbed';
import { useAuth } from '@/contexts/auth-context';
import { WorshipDataProvider, useWorshipData } from '@/contexts/worship-data-context';
import { useAllUsers } from '@/hooks/use-all-users';
import { useClientSearchParams } from '@/hooks/use-client-search-params';
import { useToast } from '@/hooks/use-toast';
import { useWorshipRosters } from '@/hooks/useWorshipRosters';
import { useWorshipSetlists } from '@/hooks/useWorshipSetlists';
import { useWorshipSongs } from '@/hooks/useWorshipSongs';
import { isTextChordSheet, splitSheetsForViewer } from '@/lib/chord-chart';
import {
  filesFromSetlistSlides,
  hasDownloadableSheets,
  sheetDownloadFilename,
  sheetDownloadSourceFromSetlistSong,
  sheetDownloadSourceFromSongSheets,
  sheetExtension,
} from '@/lib/setlist-download';
import { downloadNamedFiles } from '@/lib/setlist-download-client';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';
import {
    chordSheetsForKey, getReferenceTracks, hasReferenceTracks, normalizeReferenceTrackDrafts,
    referenceTrackDraftsInvalid, referenceTracksToDrafts, resolveChordSheetsForSetlistSong,
    setlistSongEntryKey, type ReferenceTrackDraft
} from '@/lib/worship-utils';
import type { ChordKey, SetlistSong, SongChordSheet, WorshipRoster, WorshipRosterMember, WorshipRosterSlot, WorshipSetlist, WorshipSong } from '@/types';
import { mergeWorshipRosterSlots } from '@/types';
import { roleBadgeClass } from '@/lib/worship-roster-roles';
import { format, parseISO } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Calendar, Check, ChevronDown, ChevronUp, Download, Eye, GripVertical, Image as ImageIcon, Link2, ListMusic, Music, Music2, Pencil, Plus, RefreshCw, Save, Search, Settings2, Shield, Trash2, Upload, Users, X, Youtube } from 'lucide-react';import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

// ── Constants ────────────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] } }),
};

function useCanManageWorship() {
  const { isAdmin, isWorshipTeam } = useAuth();
  return isAdmin || isWorshipTeam;
}

async function downloadImage(url: string, filename: string) {
  await downloadNamedFiles([{ url, filename }]);
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
        <IconButton variant="ghost" onClick={onBack} className="rounded-xl mt-0.5" aria-label="Back" icon={ArrowLeft} />
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
                {saving ? <ButtonSpinner size="sm" /> : <Save className="h-3.5 w-3.5" />} Save
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
                <Plus className="h-3.5 w-3.5" /> Paste chart
              </Button>
            </>
          )}
        </div>
      </div>

      {song.chordSheets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl border-2 border-dashed border-border/40 text-center">
          <ImageIcon className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="font-semibold text-muted-foreground">No chord sheets yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Paste a chart from SongSelect, or upload an image if you only have a scan.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Array.from(groupedByKey.entries()).map(([key, sheets]) => (
            <div key={key} className="space-y-3">
              <div className="flex items-center gap-2">
                <KeyBadge keyName={key} accent />
                <span className="text-xs text-muted-foreground font-semibold">{sheets.length} chart{sheets.length > 1 ? 's' : ''}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {sheets.map((sheet, idx) => (
                  <div key={sheet.id} className="relative group rounded-2xl overflow-hidden border border-border/40 bg-muted aspect-[3/4]">
                    {isTextChordSheet(sheet) ? (
                      <div className="pointer-events-none flex h-full w-full flex-col items-start justify-end bg-[#2b2b2b] p-3 text-left">
                        <BookOpen className="mb-auto h-8 w-8 text-white/70" />
                        <span className="text-[11px] font-semibold text-white">Text chart</span>
                        <span className="text-[10px] text-white/60">{sheet.annotations?.length || 0} note set{(sheet.annotations?.length || 0) === 1 ? '' : 's'}</span>
                      </div>
                    ) : sheet.imageUrl.toLowerCase().includes('.pdf') ? (
                      <div className="pointer-events-none w-full h-full flex flex-col items-center justify-center bg-muted">
                        <BookOpen className="h-10 w-10 text-primary" />
                        <span className="text-[10px] font-semibold text-primary mt-2">PDF DOCUMENT</span>
                      </div>
                    ) : (
                      <RemoteImage src={sheet.imageUrl} alt={`${key} pg ${idx + 1}`}
                        fill
                        className="pointer-events-none object-cover transition-transform group-hover:scale-105"
                        sizes="200px" />
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setViewSheet(sheet)}
                      className="absolute inset-0 z-[1] h-auto w-full cursor-pointer rounded-none p-0"
                      aria-label={`View ${song.title} chart`}
                    />
                    <div className="pointer-events-none absolute inset-0 z-[2] bg-black/50 opacity-0 transition-opacity [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100" />
                    <div className="hover-reveal absolute inset-x-0 bottom-0 z-[3] flex items-end justify-center gap-2 p-2 transition-opacity">
                      <IconButton type="button" onClick={() => setViewSheet(sheet)}
                        aria-label="View sheet"
                        className="rounded-lg bg-black/50 text-white hover:bg-black/70"
                        icon={Eye}
                        iconClassName="h-3.5 w-3.5"
                      />
                      {!isTextChordSheet(sheet) ? (
                        <IconButton
                          type="button"
                          aria-label="Download sheet"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadImage(
                              sheet.imageUrl,
                              sheetDownloadFilename({
                                songTitle: song.title,
                                pageIndex: idx + 1,
                                pageCount: sheets.filter((s) => !isTextChordSheet(s)).length,
                                ext: sheetExtension(sheet.imageUrl),
                              }),
                            );
                          }}
                          className="rounded-lg bg-black/50 text-white hover:bg-black/70"
                          icon={Download}
                          iconClassName="h-3.5 w-3.5"
                        />
                      ) : (
                        <IconButton
                          type="button"
                          aria-label="Download chart"
                          onClick={(e) => {
                            e.stopPropagation();
                            void downloadNamedFiles(
                              filesFromSetlistSlides([
                                sheetDownloadSourceFromSongSheets(song.title, [sheet], key),
                              ]),
                            );
                          }}
                          className="rounded-lg bg-black/50 text-white hover:bg-black/70"
                          icon={Download}
                          iconClassName="h-3.5 w-3.5"
                        />
                      )}
                      {!isTextChordSheet(sheet) && sheet.imageUrl.toLowerCase().includes('.pdf') && (
                        <IconButton
                          type="button"
                          aria-label="Convert PDF to Images"
                          onClick={(e) => { e.stopPropagation(); handleConvertPdf(sheet); }}
                          disabled={convertingId === sheet.id}
                          className="rounded-lg bg-success/15 text-success-foreground hover:bg-success/20"
                          icon={convertingId === sheet.id ? ButtonSpinner : RefreshCw}
                        />
                      )}
                      <IconButton type="button" onClick={() => handleDelete(sheet)}
                        aria-label="Delete sheet"
                        disabled={deleting === sheet.id}
                        className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive"
                        icon={deleting === sheet.id ? ButtonSpinner : Trash2}
                      />
                    </div>
                    <span className="pointer-events-none absolute top-1.5 left-1.5 z-[4] text-[10px] font-semibold bg-black/40 text-white px-1.5 py-0.5 rounded-md backdrop-blur-sm">
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

      {viewSheet && isTextChordSheet(viewSheet) && (
        <TextChordChartViewer
          songId={song.id}
          songTitle={song.title}
          sheet={song.chordSheets.find((s) => s.id === viewSheet.id) ?? viewSheet}
          onClose={() => setViewSheet(null)}
        />
      )}

      {/* Full-screen image viewer — slides through all sheets for this song */}
      {viewSheet && !isTextChordSheet(viewSheet) && (() => {
        const allSheets = song.chordSheets.filter((s) => !isTextChordSheet(s));
        const slides: ViewerSlide[] = Array.from(
          allSheets.reduce((map, s) => {
            if (!map.has(s.key)) map.set(s.key, []);
            map.get(s.key)!.push(s);
            return map;
          }, new Map<ChordKey, SongChordSheet[]>())
        ).map(([key, sheets]) => ({
            ...splitSheetsForViewer(sheets),
            songTitle: song.title,
            key,
            songId: song.id,
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
  const { songs, loading, deleteSong } = useWorshipSongs();
  const canManageWorship = useCanManageWorship();
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

  if (loading) return <PageLoading />;

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
            <ScheduleListCard>
              {filtered.map((song, i) => (
                <motion.div
                  key={song.id}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                >
                  <DrillDownListRow
                    leading={
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                        <Music2 className="h-4 w-4 text-primary" />
                      </div>
                    }
                    title={song.title}
                    subtitle={
                      <>
                        {song.artist ? <span className="event-row-meta">{song.artist}</span> : null}
                        {song.chordSheets.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1">
                            {Array.from(new Set(song.chordSheets.map(s => s.key))).slice(0, 4).map(k => (
                              <KeyBadge key={k} keyName={k} />
                            ))}
                            {new Set(song.chordSheets.map(s => s.key)).size > 4 && (
                              <span className="text-[10px] text-muted-foreground">+{new Set(song.chordSheets.map(s => s.key)).size - 4}</span>
                            )}
                          </div>
                        ) : null}
                      </>
                    }
                    onClick={() => setDetailSong(song)}
                    trailing={
                      <>
                        <IconButton
                          variant="ghost"
                          className="rounded-lg hover:text-primary hover:bg-muted"
                          aria-label="Add chord sheet"
                          onClick={() => { setAddSheetSong(song); }}
                          icon={Plus}
                          iconClassName="h-3.5 w-3.5"
                        />
                        {canManageWorship ? (
                          <IconButton
                            variant="ghost"
                            className="rounded-lg hover:text-destructive hover:bg-destructive/10"
                            aria-label="Delete song"
                            onClick={() => setDeleteConfirm(song)}
                            icon={Trash2}
                            iconClassName="h-3.5 w-3.5"
                          />
                        ) : null}
                      </>
                    }
                  />
                </motion.div>
              ))}
            </ScheduleListCard>
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
                  {deleting ? <ButtonSpinner className="mr-2" /> : <Trash2 className="h-4 w-4" />} Delete
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
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | 'none'>('none');
  const [referenceTracks, setReferenceTracks] = useState<ReferenceTrackDraft[]>([{ url: '', note: '' }]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [notesEditor, setNotesEditor] = useState<{ sheet: SongChordSheet; annotationId: string } | null>(null);
  const openingNotesRef = useRef(false);

  const liveSong = selectedSong ? (songs.find((s) => s.id === selectedSong.id) ?? selectedSong) : null;
  const { selectedSheetIds, setSelectedSheetIds } = useSetlistSongSheetSelection(liveSong, selectedKey);

  const filtered = useMemo(() => {
    return songs.filter(s =>
      s.title.toLowerCase().includes(search.toLowerCase()) || s.artist?.toLowerCase().includes(search.toLowerCase())
    );
  }, [songs, search]);

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
        annotationId: selectedAnnotationId === 'none' ? undefined : selectedAnnotationId,
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
    setSelectedAnnotationId('none');
    setReferenceTracks([{ url: '', note: '' }]);
    setSearch('');
  };

  const selectSong = (song: WorshipSong) => {
    setSelectedSong(song);
    const keys = Array.from(new Set(song.chordSheets.map(s => s.key)));
    setSelectedKey(keys.length > 0 ? keys[0] : 'numbers');
    setSelectedAnnotationId('none');
    setReferenceTracks([{ url: '', note: '' }]);
  };

  return (
    <>
      <Dialog
        open={open && !notesEditor}
        onOpenChange={(v) => {
          if (!v) {
            if (openingNotesRef.current || notesEditor) {
              openingNotesRef.current = false;
              return;
            }
            reset();
            onClose();
          }
        }}
      >
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
                    <Button key={song.id} type="button" variant="ghost" onClick={() => selectSong(song)}
                      className="h-auto w-full items-center gap-3 p-3 rounded-xl justify-start text-left hover:bg-muted hover:border-border border border-transparent">
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
                    </Button>
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
                  <IconButton type="button" onClick={() => { setSelectedSong(null); setSelectedKey('numbers'); setSelectedAnnotationId('none'); setReferenceTracks([{ url: '', note: '' }]); }}
                    className="rounded-lg text-muted-foreground hover:bg-muted hover:text-primary"
                    aria-label="Clear selected song"
                    icon={X}
                    iconClassName="h-3.5 w-3.5"
                  />
                </div>

                <SetlistSongConfigPanel
                  song={liveSong}
                  selectedKey={selectedKey}
                  onKeyChange={handleKeyChange}
                  selectedSheetIds={selectedSheetIds}
                  onSheetIdsChange={setSelectedSheetIds}
                  selectedAnnotationId={selectedAnnotationId}
                  onAnnotationIdChange={setSelectedAnnotationId}
                  referenceTracks={referenceTracks}
                  onReferenceTracksChange={setReferenceTracks}
                  onRequestUpload={() => setUploadOpen(true)}
                  onOpenNotesEditor={(sheet, annotationId) => {
                    openingNotesRef.current = true;
                    setNotesEditor({ sheet, annotationId });
                  }}
                  idPrefix="add-song"
                />
              </>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { reset(); onClose(); }}>Cancel</Button>
              <Button className="flex-1 rounded-xl"
                onClick={handleAdd} disabled={!liveSong || adding || tracksInvalid}>
                {adding ? <ButtonSpinner className="mr-2" /> : null} Add to Setlist
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {notesEditor && liveSong && (
        <TextChordChartViewer
          songId={liveSong.id}
          songTitle={liveSong.title}
          sheet={
            (songs.find((s) => s.id === liveSong.id) ?? liveSong).chordSheets.find((s) => s.id === notesEditor.sheet.id)
            ?? notesEditor.sheet
          }
          initialAnnotationId={notesEditor.annotationId}
          startDrawing
          onClose={() => setNotesEditor(null)}
        />
      )}

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
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | 'none'>('none');
  const [referenceTracks, setReferenceTracks] = useState<ReferenceTrackDraft[]>([{ url: '', note: '' }]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notesEditor, setNotesEditor] = useState<{ sheet: SongChordSheet; annotationId: string } | null>(null);
  const openingNotesRef = useRef(false);
  const prevKeyRef = useRef<ChordKey | null>(null);
  const initRef = useRef<string | null>(null);

  const libSong = setlistSong ? songs.find((s) => s.id === setlistSong.songId) : null;

  useEffect(() => {
    if (!open) {
      initRef.current = null;
      return;
    }
    if (!setlistSong || !libSong) return;
    const token = setlistSong.entryId || setlistSong.songId;
    if (initRef.current === token) return;
    initRef.current = token;
    setSelectedKey(setlistSong.key);
    setSelectedAnnotationId(setlistSong.annotationId ?? 'none');
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

      await updateSetlistSong(playlist, setlistSong, {
        key: selectedKey,
        referenceTracks: normalizedTracks ?? [],
        chordSheetIds: chordSheetIds ?? [],
        annotationId: selectedAnnotationId === 'none' ? undefined : selectedAnnotationId,
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
      <Dialog
        open={open && !notesEditor}
        onOpenChange={(v) => {
          if (!v) {
            if (openingNotesRef.current || notesEditor) {
              openingNotesRef.current = false;
              return;
            }
            onClose();
          }
        }}
      >
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
              selectedAnnotationId={selectedAnnotationId}
              onAnnotationIdChange={setSelectedAnnotationId}
              referenceTracks={referenceTracks}
              onReferenceTracksChange={setReferenceTracks}
              onRequestUpload={() => setUploadOpen(true)}
              onOpenNotesEditor={(sheet, annotationId) => {
                openingNotesRef.current = true;
                setNotesEditor({ sheet, annotationId });
              }}
              idPrefix="edit-song"
            />

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancel</Button>
              <Button className="flex-1 rounded-xl" onClick={handleSave} disabled={saving || tracksInvalid}>
                {saving ? <ButtonSpinner className="mr-2" /> : null} Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {notesEditor && (
        <TextChordChartViewer
          songId={libSong.id}
          songTitle={libSong.title}
          sheet={
            (songs.find((s) => s.id === libSong.id) ?? libSong).chordSheets.find((s) => s.id === notesEditor.sheet.id)
            ?? notesEditor.sheet
          }
          initialAnnotationId={notesEditor.annotationId}
          startDrawing
          onClose={() => setNotesEditor(null)}
        />
      )}

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
  const canManageWorship = useCanManageWorship();
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

  const handleRemove = async (song: SetlistSong, index: number) => {
    const removingKey = setlistSongEntryKey(song, index);
    setRemoving(removingKey);
    try {
      await removeSongFromSetlist(playlist, song);
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
          ...splitSheetsForViewer(sheets),
          songId: libSong?.id,
          annotationId: ps.annotationId,
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
        <IconButton variant="ghost" onClick={onBack} className="rounded-xl" aria-label="Back" icon={ArrowLeft} />
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-lg normal-case not-italic leading-tight truncate">{playlist.name}</h2>
          <p className="text-xs text-muted-foreground/60 font-medium flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(parseISO(playlist.date), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {canManageWorship && orderedSongs.length > 1 && (
            <Button size="sm" variant="outline"
              className={cn('rounded-xl h-9 gap-1.5 transition-all', reorderMode && 'border-chart-4/50 text-chart-4 bg-chart-4/10')}
              onClick={() => reorderMode ? handleCancelReorder() : setReorderMode(true)}>
              <GripVertical className="h-3.5 w-3.5" />
              {reorderMode ? 'Cancel' : 'Reorder'}
            </Button>
          )}
          {canManageWorship && reorderMode && reorderDirty && (
            <Button size="sm" className="rounded-xl h-9 gap-1.5" onClick={handleSaveOrder} disabled={savingOrder}>
              {savingOrder ? <ButtonSpinner size="sm" /> : <Save className="h-3.5 w-3.5" />} Save
            </Button>
          )}
          {canManageWorship && !reorderMode && (
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
            <div className="flex items-center gap-2 rounded-lg border border-chart-4/25 bg-chart-4/10 px-3 py-2 text-xs font-medium text-chart-4">
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
                key={setlistSongEntryKey(ps, i)}
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
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(
                    drillDownRowButtonClass,
                    !reorderMode && canOpenViewer && 'cursor-pointer'
                  )}
                  onClick={!reorderMode && canOpenViewer ? () => openSheets(ps) : undefined}
                >
                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-primary">{i + 1}</span>
                </div>
                <div className="event-row-body">
                  <p className={cn(
                    'event-row-title',
                    !reorderMode && canOpenViewer && 'group-hover:text-primary'
                  )}>{ps.title}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <KeyBadge keyName={ps.key} accent />
                    {sheetsForKey.length > 0 ? (
                      <span className="text-[10px] font-bold text-success flex items-center gap-0.5">
                        <Check className="h-2.5 w-2.5" /> {sheetsForKey.length} {sheetsForKey.length > 1 ? 'pages' : 'page'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-muted-foreground/40">no sheet</span>
                    )}
                    {hasReferenceTracks(ps) && (
                      <span className="text-[10px] font-bold text-destructive flex items-center gap-0.5">
                        <Youtube className="h-2.5 w-2.5" />
                        {refTracks.length > 1 ? `${refTracks.length} ref tracks` : 'ref track'}
                      </span>
                    )}
                  </div>
                </div>
                </Button>
                <div className="flex items-center gap-1">
                  {!reorderMode && (
                    <>
                      {hasReferenceTracks(ps) && (
                        <ReferenceTracksListen tracks={ps} theme="light" compact />
                      )}
                      {hasDownloadableSheets(sheetsForKey) && (
                        <IconButton variant="ghost" className="rounded-xl text-muted-foreground hover:text-primary hover:bg-muted"
                          aria-label="Download sheet(s)"
                          onClick={(e) => {
                            e.stopPropagation();
                            void downloadNamedFiles(filesFromSetlistSlides([
                              sheetDownloadSourceFromSetlistSong(ps, sheetsForKey, i + 1),
                            ]));
                          }}
                          icon={Download}
                          iconClassName="h-3.5 w-3.5"
                        />
                      )}
                      {libSong && (
                        <>
                          {canManageWorship && (
                            <IconButton variant="ghost" className="rounded-xl text-muted-foreground hover:text-primary hover:bg-muted"
                              aria-label="Edit song settings"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditSong(ps);
                              }}
                              icon={Pencil}
                              iconClassName="h-3.5 w-3.5"
                            />
                          )}
                          <IconButton variant="ghost" className="rounded-xl text-muted-foreground hover:text-primary hover:bg-muted"
                            aria-label="Add chord sheet"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAddSheetFor({ song: libSong, key: ps.key });
                            }}
                            icon={Upload}
                            iconClassName="h-3.5 w-3.5"
                          />
                        </>
                      )}
                    </>
                  )}
                  {reorderMode && (
                    <div className="flex items-center gap-1">
                      <div className="flex flex-col gap-1 mr-2">
                        <IconButton
                          variant="ghost"
                          className="rounded-lg hover:bg-muted hover:text-primary disabled:opacity-20"
                          onClick={() => handleMove(i, 'up')}
                          disabled={i === 0}
                          aria-label="Move song up"
                          icon={ChevronUp}
                        />
                        <IconButton
                          variant="ghost"
                          className="rounded-lg hover:bg-muted hover:text-primary disabled:opacity-20"
                          onClick={() => handleMove(i, 'down')}
                          disabled={i === orderedSongs.length - 1}
                          aria-label="Move song down"
                          icon={ChevronDown}
                        />
                      </div>
                      <IconButton variant="ghost" className="rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive pointer-events-auto"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleRemove(ps, i);
                        }}
                        disabled={removing === setlistSongEntryKey(ps, i)}
                        aria-label="Remove song"
                        icon={removing === setlistSongEntryKey(ps, i) ? ButtonSpinner : X}
                        iconClassName="h-3.5 w-3.5"
                      />
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
  const canManageWorship = useCanManageWorship();
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

  if (loading) return <PageLoading />;

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
            <ScheduleListCard>
              {playlists.map((pl, i) => (
                <motion.div
                  key={pl.id}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                >
                  <DrillDownListRow
                    leading={<ScheduleRowDate date={parseISO(pl.date)} />}
                    title={pl.name}
                    subtitle={`${pl.songs.length} song${pl.songs.length !== 1 ? 's' : ''}`}
                    onClick={() => setDetail(pl)}
                    trailing={
                      canManageWorship ? (
                        <IconButton
                          variant="ghost"
                          className="rounded-lg hover:text-destructive hover:bg-destructive/10"
                          aria-label="Delete setlist"
                          onClick={() => setDeleteConfirm(pl)}
                          icon={Trash2}
                          iconClassName="h-3.5 w-3.5"
                        />
                      ) : undefined
                    }
                  />
                </motion.div>
              ))}
            </ScheduleListCard>
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
                  {deleting ? <ButtonSpinner className="mr-2" /> : null} Delete
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>
      )}
    </AnimatePresence>
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
  const worshipData = useWorshipData();
  const rosterRoles = worshipData?.rosterRoles ?? [];
  const { allUsers } = useAllUsers();
  const canManageWorship = useCanManageWorship();
  const { toast } = useToast();

  const [slots, setSlots] = useState<WorshipRosterSlot[]>(() =>
    mergeWorshipRosterSlots(roster.slots, rosterRoles),
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const [deleteRole, setDeleteRole] = useState<string | null>(null);
  const [deletingRole, setDeletingRole] = useState(false);

  const [pickerSlotIdx, setPickerSlotIdx] = useState<number | null>(null);
  const [linkSetlistOpen, setLinkSetlistOpen] = useState(false);

  useEffect(() => {
    if (dirty) return;
    setSlots(mergeWorshipRosterSlots(roster.slots, rosterRoles));
  }, [dirty, roster, rosterRoles]);

  // Worship-team users: all users who are members with roleIds (we show all site users)
  const siteUserOptions = useMemo(() =>
    allUsers
      .filter(u => u.firstName)
      .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)),
    [allUsers]
  );

  const pickerMembers = useMemo(
    () => siteUserOptions.map((user) => ({
      uid: user.uid,
      displayName: `${user.firstName} ${user.lastName}`.trim(),
    })),
    [siteUserOptions],
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

  const handleAddRole = async (name: string) => {
    const label = await worshipData?.addRosterRole(name);
    if (!label) return;
    const next = mergeWorshipRosterSlots(slots, [...rosterRoles, label]);
    setSlots(next);
    await updateRosterSlots(roster.id, next);
    setDirty(false);
    toast({ title: 'Role added' });
  };

  const handleDeleteRole = async () => {
    if (!deleteRole) return;
    setDeletingRole(true);
    try {
      await worshipData?.deleteRosterRole(deleteRole);
      const next = slots
        .filter((slot) => slot.role !== deleteRole)
        .map((slot, order) => ({ ...slot, order }));
      setSlots(next);
      await updateRosterSlots(roster.id, next);
      setDirty(false);
      setDeleteRole(null);
      toast({ title: 'Role removed' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setDeletingRole(false);
    }
  };

  const linkedPlaylist = playlists.find(p => p.id === roster.setlistId);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <IconButton variant="ghost" onClick={onBack} className="rounded-xl mt-0.5" aria-label="Back" icon={ArrowLeft} />
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
              {canManageWorship && (
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
              )}
            </>
          ) : canManageWorship ? (
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
          ) : null}
          {canManageWorship && dirty && (
            <Button size="sm" className="rounded-xl h-9 gap-1.5" onClick={handleSave} disabled={saving}>
              {saving ? <ButtonSpinner size="sm" /> : <Save className="h-3.5 w-3.5" />} Save
            </Button>
          )}
        </div>
      </div>


      {/* Slots */}
      <div className="space-y-2">
        {slots.map((slot, slotIdx) => (
          <RosterRoleSlotRow
            key={slot.role}
            roleLabel={slot.role}
            roleClassName={roleBadgeClass(slot.role)}
            people={slot.members.map((member, memberIdx) => ({
              id: member.userId ?? `guest-${slotIdx}-${memberIdx}`,
              displayName: member.displayName,
              isMember: Boolean(member.userId),
            }))}
            canManage={canManageWorship}
            onAdd={() => setPickerSlotIdx(slotIdx)}
            onRemove={(memberIdx) => removeMember(slotIdx, memberIdx)}
            onDeleteRole={() => setDeleteRole(slot.role)}
          />
        ))}
        {canManageWorship ? (
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-2xl h-11 gap-1.5 border-dashed"
            onClick={() => setAddRoleOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add role
          </Button>
        ) : null}
      </div>

      <AddWorshipRoleDialog
        open={addRoleOpen}
        onOpenChange={setAddRoleOpen}
        existingRoles={rosterRoles}
        onAdd={handleAddRole}
      />

      <AlertDialog open={!!deleteRole} onOpenChange={(open) => { if (!open) setDeleteRole(null); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove “{deleteRole}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {slots.find((slot) => slot.role === deleteRole)?.members.length
                ? 'People assigned to this role on this roster will be unassigned. New rosters will not include this role.'
                : 'New rosters will not include this role.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingRole}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteRole();
              }}
              disabled={deletingRole}
            >
              {deletingRole ? <ButtonSpinner className="mr-2" /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MemberGuestPickerDialog
        open={pickerSlotIdx !== null}
        onOpenChange={(open) => { if (!open) setPickerSlotIdx(null); }}
        roleLabel={pickerSlotIdx !== null ? slots[pickerSlotIdx]?.role ?? '' : ''}
        members={pickerMembers}
        assignedUserIds={
          pickerSlotIdx !== null
            ? slots[pickerSlotIdx].members.map((member) => member.userId).filter((id): id is string => Boolean(id))
            : []
        }
        onSelectMember={(member) => pickerSlotIdx !== null && addMemberToSlot(pickerSlotIdx, {
          userId: member.uid,
          displayName: member.displayName,
        })}
        onAddGuest={(name) => pickerSlotIdx !== null && addMemberToSlot(pickerSlotIdx, {
          userId: null,
          displayName: name,
        })}
      />

      {/* Link Setlist Dialog */}
      <Dialog open={linkSetlistOpen} onOpenChange={setLinkSetlistOpen}>
        <DialogContent className="rounded-xl p-8 border-border/50 bg-card/95 backdrop-blur-3xl max-w-sm">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-semibold normal-case not-italic tracking-tight">Link Setlist</DialogTitle>
            <DialogDescription>Link this roster to a setlist to see song lists and chord sheets.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleLinkSetlist(null)}
                className={cn(
                  "h-auto w-full items-center justify-between p-3 rounded-xl border border-transparent text-sm font-bold",
                  !roster.setlistId ? "bg-muted border-border text-primary" : "hover:bg-muted text-muted-foreground"
                )}>
                None / Unlink
                {!roster.setlistId && <Check className="h-4 w-4" />}
              </Button>
              {playlists
                .sort((a,b) => b.date.localeCompare(a.date))
                .map(sl => (
                <Button
                  key={sl.id}
                  type="button"
                  variant="ghost"
                  onClick={() => handleLinkSetlist(sl.id)}
                  className={cn(
                    "h-auto w-full items-center gap-3 p-3 rounded-xl border border-transparent text-left",
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
                </Button>
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
  const worshipData = useWorshipData();
  const canManageWorship = useCanManageWorship();
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const { setlists: playlists } = useWorshipSetlists();
  const [newOpen, setNewOpen] = useState(false);
  const [detail, setDetail] = useState<WorshipRoster | null>(null);
  const [managingRoles, setManagingRoles] = useState(false);
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

  if (loading) return <PageLoading />;

  return (
    <>
      <AnimatePresence mode="wait">
        {detail ? (
          <RosterDetailView
            key="detail"
            roster={rosters.find(r => r.id === detail.id) || detail}
            playlists={playlists}
            onBack={() => setDetail(null)}
            onOpenPlaylist={onOpenPlaylist}
          />
        ) : managingRoles ? (
          <motion.div key="roles" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <WorshipRosterRolesPanel
              roles={worshipData?.rosterRoles ?? []}
              canManage={canManageWorship}
              onBack={() => setManagingRoles(false)}
              onAdd={async (name) => {
                await worshipData?.addRosterRole(name);
                toast({ title: 'Role added' });
              }}
              onDelete={async (role) => {
                await worshipData?.deleteRosterRole(role);
                toast({ title: 'Role removed' });
              }}
            />
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
            {canManageWorship ? (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg gap-1.5 px-3 text-sm"
                  onClick={() => setManagingRoles(true)}
                >
                  <Settings2 className="h-4 w-4" />
                  {t.rosterRoles}
                </Button>
              </div>
            ) : null}
            {rosters.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 rounded-xl border-2 border-dashed border-border/40 text-center">
                <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="font-semibold text-muted-foreground">No rosters yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Create a team roster for an upcoming service.</p>
              </div>
            ) : (
              <ScheduleListCard>
                <Accordion type="single" collapsible className="w-full">
                  {rosters.map((r) => {
                    const linked = playlists.find(p => p.id === r.setlistId);
                    const filled = r.slots.filter(s => s.members.length > 0).length;
                    return (
                      <AccordionItem
                        key={r.id}
                        value={r.id}
                        className="border-b border-border/40 last:border-0"
                      >
                        <div className="flex items-center gap-0.5">
                          <div className="min-w-0 flex-1">
                            <AccordionTrigger className="py-3 text-[0.9375rem] no-underline hover:no-underline">
                              <div className="flex min-w-0 flex-1 items-center gap-3 pr-2 text-left">
                                <ScheduleRowDate date={parseISO(r.date)} />
                                <div className="event-row-body min-w-0">
                                  <p className="event-row-title">{r.name}</p>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <span className="event-row-meta">
                                      {filled}/{r.slots.length} roles filled
                                    </span>
                                    {linked ? (
                                      <span className="flex items-center gap-1 rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                        <Link2 className="h-2 w-2" /> {linked.name}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </AccordionTrigger>
                          </div>
                          <IconButton
                            variant="ghost"
                            className="shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
                            aria-label="Edit roster"
                            onClick={() => setDetail(r)}
                            icon={Pencil}
                            iconClassName="h-3.5 w-3.5"
                          />
                          {canManageWorship ? (
                            <IconButton
                              variant="ghost"
                              className="shrink-0 rounded-lg hover:text-destructive hover:bg-destructive/10"
                              aria-label="Delete roster"
                              onClick={() => setDeleteConfirm(r)}
                              icon={Trash2}
                              iconClassName="h-3.5 w-3.5"
                            />
                          ) : null}
                        </div>
                        <AccordionContent className="pb-4 pt-0">
                          <div className="space-y-2">
                            {r.slots.map((slot, slotIdx) => (
                              <RosterRoleSlotRow
                                key={slot.role}
                                roleLabel={slot.role}
                                roleClassName={roleBadgeClass(slot.role)}
                                people={slot.members.map((member, memberIdx) => ({
                                  id: member.userId ?? `guest-${slotIdx}-${memberIdx}`,
                                  displayName: member.displayName,
                                  isMember: Boolean(member.userId),
                                }))}
                                canManage={false}
                              />
                            ))}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-9 gap-1.5 rounded-lg"
                              onClick={() => setDetail(r)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              {canManageWorship ? 'Edit roster' : 'Open roster'}
                            </Button>
                            {linked ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 gap-1.5 rounded-lg"
                                onClick={() => onOpenPlaylist(linked.id)}
                              >
                                <Link2 className="h-3.5 w-3.5" />
                                Open setlist
                              </Button>
                            ) : null}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </ScheduleListCard>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
              {deleting ? <ButtonSpinner className="mr-2" /> : null} Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WorshipPortalPage() {
  const { isAdmin, isWorshipTeam, loadingAuth, currentUser } = useAuth();
  const canManageWorship = isAdmin || isWorshipTeam;
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const router = useRouter();
  const searchParams = useClientSearchParams();
  const initialTab = searchParams.get('tab') as 'playlists' | 'songs' | 'rosters' | null;
  const initialId = searchParams.get('id');
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
    const params = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : searchParams.toString(),
    );
    params.set('tab', next);
    if (id) params.set('id', id);
    else params.delete('id');
    router.replace(`/worship?${params.toString()}`, { scroll: false });
  };

  const handleOpenPlaylist = (setlistId: string) => {
    setPendingSetlistId(setlistId);
    selectTab('playlists', setlistId);
  };

  const showNewAction = tab === 'songs' || canManageWorship;

  if (loadingAuth) return <PageLoading />;

  if (!isAdmin && !isWorshipTeam) {
    return (
      <div className="flex min-h-[calc(100vh-16rem)] flex-col items-center justify-center px-6">
        <EmptyState icon={Shield} title={t.accessRestricted} description={t.worshipAccessDesc} />
        <Button asChild className="mt-2 rounded-lg">
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
            showNewAction ? (
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
            ) : undefined
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
            <Button
              type="button"
              variant="ghost"
              onClick={() => selectTab('rosters')}
              className={cn(
                "flex h-auto flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-xs",
                tab === 'rosters' ? "bg-background/40 text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className={cn("h-4 w-4", tab === 'rosters' ? "text-primary" : "text-muted-foreground")} />
              <span>{t.rostersTab}</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => selectTab('playlists')}
              className={cn(
                "flex h-auto flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-xs",
                tab === 'playlists' ? "bg-background/40 text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ListMusic className={cn("h-4 w-4", tab === 'playlists' ? "text-primary" : "text-muted-foreground")} />
              <span>{t.setlistsTab}</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => selectTab('songs')}
              className={cn(
                "flex h-auto flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-xs",
                tab === 'songs' ? "bg-background/40 text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Music2 className={cn("h-4 w-4", tab === 'songs' ? "text-primary" : "text-muted-foreground")} />
              <span>{t.songsTab}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
    </WorshipDataProvider>
  );
}
