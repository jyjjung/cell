'use client';

import { useEffect, useMemo, useState } from 'react';
import { ButtonSpinner } from '@/components/ui/loading-spinner';
import { AnimatePresence, motion } from 'framer-motion';
import {
  collection,
  doc,
  deleteDoc,
  addDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { ArrowLeft, ListMusic, Plus, Trash2 } from 'lucide-react';import { SetlistForm } from '@/components/ndcpc/SetlistForm';
import { SetlistMedia } from '@/components/ndcpc/SetlistMedia';
import { LoadingState } from '@/components/ui/loading-state';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DrillDownListRow, ScheduleListCard, ScheduleRowDate } from '@/components/schedule/schedule-occurrence-row';
import { useTranslation } from '@/context/LocaleProvider';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { NDCPc_COLLECTIONS } from '@/lib/ndcpc/collections';
import { formatAppDate } from '@/lib/ndcpc/format-date';
import { getDefaultSunday, getSundays, isPastSundayDate } from '@/lib/ndcpc/dates';
import { normalizeSetlist, resolveSetlistResources } from '@/lib/ndcpc/setlist';
import { cn } from '@/lib/utils';
import type { Resource, Setlist } from '@/types/ndcpc-ported';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.3 },
  }),
};

type ListFilter = 'upcoming' | 'past';

interface SetlistManagerProps {
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
}

export function SetlistManager({
  createOpen = false,
  onCreateOpenChange,
}: SetlistManagerProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t, locale } = useTranslation();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [listFilter, setListFilter] = useState<ListFilter>('upcoming');
  const [newOpen, setNewOpen] = useState(false);
  const [newDate, setNewDate] = useState(() => getDefaultSunday().toISOString());
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Setlist | null>(null);
  const [deleting, setDeleting] = useState(false);
  const sundays = useMemo(() => getSundays(), []);

  useEffect(() => {
    if (createOpen) setNewOpen(true);
  }, [createOpen]);

  const setlistsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, NDCPc_COLLECTIONS.setlists), orderBy('date', 'desc'));
  }, [firestore]);

  const resourcesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, NDCPc_COLLECTIONS.resources), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: setlists, isLoading } = useCollection<Setlist>(setlistsQuery);
  const { data: resources } = useCollection<Resource>(resourcesQuery);
  const resourceMap = useMemo(
    () => new Map(resources?.map((r) => [r.id, r]) ?? []),
    [resources],
  );
  const detail = setlists?.find((s) => s.id === detailId) ?? null;

  const { upcoming, past } = useMemo(() => {
    const upcomingList: Setlist[] = [];
    const pastList: Setlist[] = [];
    for (const setlist of setlists ?? []) {
      if (isPastSundayDate(setlist.date)) pastList.push(setlist);
      else upcomingList.push(setlist);
    }
    return { upcoming: upcomingList, past: pastList };
  }, [setlists]);

  const visible = listFilter === 'upcoming' ? upcoming : past;

  const closeNew = (open: boolean) => {
    setNewOpen(open);
    if (!open) onCreateOpenChange?.(false);
  };

  const handleCreate = async () => {
    if (!firestore) return;
    setCreating(true);
    try {
      const ref = await addDoc(collection(firestore, NDCPc_COLLECTIONS.setlists), {
        date: Timestamp.fromDate(new Date(newDate)),
        songIds: [],
        chantIds: [],
        createdAt: Timestamp.now(),
      });
      toast({ title: t('common.added') });
      closeNew(false);
      setDetailId(ref.id);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: t('toast.couldntSave') });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!firestore || !deleteConfirm) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(firestore, NDCPc_COLLECTIONS.setlists, deleteConfirm.id));
      toast({ title: t('toast.deleted') });
      if (detailId === deleteConfirm.id) setDetailId(null);
      setDeleteConfirm(null);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: t('toast.couldntDelete') });
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) return <LoadingState isLoading delayMs={0} variant="skeleton" skeletonRows={4} />;

  const detailLists = detail ? normalizeSetlist(detail, resourceMap) : null;
  const detailSongs = detailLists
    ? resolveSetlistResources(detailLists.songIds, resourceMap)
    : [];
  const detailChants = detailLists
    ? resolveSetlistResources(detailLists.chantIds, resourceMap)
    : [];

  return (
    <AnimatePresence mode="wait">
      {detail ? (
        <motion.div
          key="detail"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2">
            <IconButton
              aria-label="Back"
              icon={ArrowLeft}
              className="rounded-lg"
              onClick={() => setDetailId(null)}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold">
                {detail.date?.seconds
                  ? formatAppDate(new Date(detail.date.seconds * 1000), 'EEEE, MMMM d', locale)
                  : t('setlist.new')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('setlist.summary', {
                  songs: detailSongs.length,
                  chants: detailChants.length,
                })}
              </p>
            </div>
            <IconButton
              aria-label="Delete setlist"
              icon={Trash2}
              className="rounded-lg text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteConfirm(detail)}
            />
          </div>

          <div className="rounded-xl border border-border/60 p-4">
            <SetlistForm key={detail.id} setlist={detail} onSuccess={() => {}} allowEmpty />
          </div>

          {detailSongs.length + detailChants.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Preview
              </p>
              <SetlistMedia songs={detailSongs} chants={detailChants} />
            </div>
          ) : null}

          <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
            <DialogContent className="max-w-sm rounded-xl">
              <DialogHeader>
                <DialogTitle>Delete this setlist?</DialogTitle>
                <DialogDescription>This permanently removes the weekly setlist.</DialogDescription>
              </DialogHeader>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => void handleDelete()}
                  disabled={deleting}
                >
                  {deleting ? <ButtonSpinner className="mr-2" /> : null}
                  {t('common.delete')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>
      ) : (
        <motion.div
          key="list"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="space-y-5"
        >
          <div className="inline-flex rounded-lg bg-muted/50 p-0.5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setListFilter('upcoming')}
              className={cn(
                'h-auto min-h-11 rounded-md px-3 py-1.5 text-xs font-medium',
                listFilter === 'upcoming'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Upcoming{upcoming.length > 0 ? ` (${upcoming.length})` : ''}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setListFilter('past')}
              className={cn(
                'h-auto min-h-11 rounded-md px-3 py-1.5 text-xs font-medium',
                listFilter === 'past'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Past{past.length > 0 ? ` (${past.length})` : ''}
            </Button>
          </div>

          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/40 py-20 text-center">
              <ListMusic className="mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="font-semibold text-muted-foreground">
                {listFilter === 'upcoming' ? 'No upcoming setlists' : 'No past setlists'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                {listFilter === 'upcoming'
                  ? 'Create a setlist for an upcoming Sunday service.'
                  : 'Earlier Sundays will show up here.'}
              </p>
              {listFilter === 'upcoming' ? (
                <Button size="sm" className="mt-4 rounded-lg" onClick={() => setNewOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" /> New setlist
                </Button>
              ) : null}
            </div>
          ) : (
            <ScheduleListCard>
                {visible.map((setlist, i) => {
                  const date = setlist.date?.seconds
                    ? new Date(setlist.date.seconds * 1000)
                    : null;
                  const { songIds, chantIds } = normalizeSetlist(setlist, resourceMap);
                  return (
                    <motion.div
                      key={setlist.id}
                      custom={i}
                      variants={fadeUp}
                      initial="hidden"
                      animate="visible"
                    >
                      <DrillDownListRow
                        leading={date ? <ScheduleRowDate date={date} /> : <div className="w-10" />}
                        title={
                          date
                            ? formatAppDate(date, 'EEEE, MMMM d', locale)
                            : t('setlist.noDate')
                        }
                        subtitle={t('setlist.summary', {
                          songs: songIds.length,
                          chants: chantIds.length,
                        })}
                        onClick={() => setDetailId(setlist.id)}
                        trailing={
                          <IconButton
                            aria-label="Delete setlist"
                            icon={Trash2}
                            className="rounded-lg hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeleteConfirm(setlist)}
                          />
                        }
                      />
                    </motion.div>
                  );
                })}
            </ScheduleListCard>
          )}

          <Dialog open={newOpen} onOpenChange={closeNew}>
            <DialogContent className="max-w-sm rounded-xl">
              <DialogHeader>
                <DialogTitle>New setlist</DialogTitle>
                <DialogDescription>
                  Pick the Sunday, then add songs and chants on the next screen.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <Select value={newDate} onValueChange={setNewDate}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('setlist.pickSunday')} />
                  </SelectTrigger>
                  <SelectContent>
                    {sundays.map((sunday) => (
                      <SelectItem key={sunday.toISOString()} value={sunday.toISOString()}>
                        {formatAppDate(sunday, 'PPP', locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button className="w-full" onClick={() => void handleCreate()} disabled={creating}>
                  {creating ? <ButtonSpinner className="mr-2" /> : null}
                  Create setlist
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
            <DialogContent className="max-w-sm rounded-xl">
              <DialogHeader>
                <DialogTitle>Delete this setlist?</DialogTitle>
                <DialogDescription>This permanently removes the weekly setlist.</DialogDescription>
              </DialogHeader>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => void handleDelete()}
                  disabled={deleting}
                >
                  {deleting ? <ButtonSpinner className="mr-2" /> : null}
                  {t('common.delete')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
