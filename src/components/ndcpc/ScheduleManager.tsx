'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { ArrowLeft, ChevronRight, Loader2, Plus, Trash2, Users } from 'lucide-react';
import { RosterRoleSlotRow } from '@/components/worship/roster-people-picker';
import { ScheduleForm } from '@/components/ndcpc/ScheduleForm';
import { LoadingState } from '@/components/ndcpc/LoadingState';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScheduleRowDate } from '@/components/schedule/schedule-occurrence-row';
import { useAdmin } from '@/context/AuthProvider';
import { useTranslation } from '@/context/LocaleProvider';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAllUsers } from '@/hooks/use-all-users';
import { NDCPc_COLLECTIONS } from '@/lib/ndcpc/collections';
import { formatAppDate } from '@/lib/ndcpc/format-date';
import {
  dateInputValueToDate,
  isPastCalendarDate,
  timestampToDateInputValue,
} from '@/lib/ndcpc/dates';
import {
  getScheduleRoleValue,
  ndcpcScheduleRoleBadgeClass,
  SCHEDULE_ROLE_KEYS,
} from '@/lib/ndcpc/schedule-roles';
import {
  ndcpcRosterDirectoryEntries,
  ndcpcRosterMemberUidForName,
} from '@/lib/ndcpc/roster-people';
import { cn } from '@/lib/utils';
import type { Schedule } from '@/types/ndcpc-ported';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.3 },
  }),
};

type ListFilter = 'upcoming' | 'past';

interface ScheduleManagerProps {
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
}

function filledRoleCount(schedule: Schedule) {
  return SCHEDULE_ROLE_KEYS.filter((key) => Boolean(getScheduleRoleValue(schedule, key))).length;
}

export function ScheduleManager({
  createOpen = false,
  onCreateOpenChange,
}: ScheduleManagerProps) {
  const { isAdmin } = useAdmin();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t, locale } = useTranslation();
  const { allUsers } = useAllUsers();
  const directory = useMemo(() => ndcpcRosterDirectoryEntries(allUsers), [allUsers]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [listFilter, setListFilter] = useState<ListFilter>('upcoming');
  const [newOpen, setNewOpen] = useState(false);
  const [newDate, setNewDate] = useState(() => timestampToDateInputValue(null));
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Schedule | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (createOpen) setNewOpen(true);
  }, [createOpen]);

  const schedulesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, NDCPc_COLLECTIONS.schedules), orderBy('date', 'desc'));
  }, [firestore]);

  const { data: schedules, isLoading } = useCollection<Schedule>(schedulesQuery);
  const detail = schedules?.find((s) => s.id === detailId) ?? null;

  const { upcoming, past } = useMemo(() => {
    const upcomingList: Schedule[] = [];
    const pastList: Schedule[] = [];
    for (const schedule of schedules ?? []) {
      if (isPastCalendarDate(schedule.date)) pastList.push(schedule);
      else upcomingList.push(schedule);
    }
    return { upcoming: upcomingList, past: pastList };
  }, [schedules]);

  const visible = listFilter === 'upcoming' ? upcoming : past;

  const closeNew = (open: boolean) => {
    setNewOpen(open);
    if (!open) onCreateOpenChange?.(false);
  };

  const handleCreate = async () => {
    if (!firestore || !isAdmin) return;
    setCreating(true);
    try {
      const ref = await addDoc(collection(firestore, NDCPc_COLLECTIONS.schedules), {
        date: Timestamp.fromDate(dateInputValueToDate(newDate)),
        worship: '',
        offering: '',
        sermon: '',
        chant: '',
        activity: '',
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
      await deleteDoc(doc(firestore, NDCPc_COLLECTIONS.schedules, deleteConfirm.id));
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

  if (isLoading) return <LoadingState />;

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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={() => setDetailId(null)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold">
                {detail.date?.seconds
                  ? formatAppDate(new Date(detail.date.seconds * 1000), 'EEEE, MMMM d', locale)
                  : t('schedules.add')}
              </p>
              <p className="text-xs text-muted-foreground">
                {filledRoleCount(detail)} / {SCHEDULE_ROLE_KEYS.length} assigned
              </p>
            </div>
            {isAdmin ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive"
                onClick={() => setDeleteConfirm(detail)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>

          {isAdmin ? (
            <ScheduleForm
              key={detail.id}
              schedule={detail}
              onSuccess={() => {
                /* stay on detail after save */
              }}
            />
          ) : (
            <div className="space-y-2">
              {SCHEDULE_ROLE_KEYS.map((key) => {
                const name = getScheduleRoleValue(detail, key);
                const memberUid = name
                  ? ndcpcRosterMemberUidForName(directory, name)
                  : undefined;
                return (
                  <RosterRoleSlotRow
                    key={key}
                    roleLabel={t(`schedules.role.${key}`)}
                    roleClassName={ndcpcScheduleRoleBadgeClass(key)}
                    people={
                      name
                        ? [{
                            id: memberUid ?? `guest-${key}`,
                            displayName: name,
                            isMember: Boolean(memberUid),
                          }]
                        : []
                    }
                    canManage={false}
                  />
                );
              })}
            </div>
          )}
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
            <button
              type="button"
              onClick={() => setListFilter('upcoming')}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                listFilter === 'upcoming'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Upcoming{upcoming.length > 0 ? ` (${upcoming.length})` : ''}
            </button>
            <button
              type="button"
              onClick={() => setListFilter('past')}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                listFilter === 'past'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Past{past.length > 0 ? ` (${past.length})` : ''}
            </button>
          </div>

          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/40 py-20 text-center">
              <Users className="mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="font-semibold text-muted-foreground">
                {listFilter === 'upcoming' ? 'No upcoming rosters' : 'No past rosters'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                {listFilter === 'upcoming'
                  ? 'Create a Sunday roster to assign preschool duties.'
                  : 'Earlier Sundays will show up here.'}
              </p>
              {listFilter === 'upcoming' && isAdmin ? (
                <Button
                  size="sm"
                  className="mt-4 rounded-lg"
                  onClick={() => setNewOpen(true)}
                >
                  <Plus className="mr-1.5 h-4 w-4" /> New roster
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="ui-card !p-0">
              <div className="ui-list px-2">
                {visible.map((schedule, i) => {
                  const date = schedule.date?.seconds
                    ? new Date(schedule.date.seconds * 1000)
                    : null;
                  const filled = filledRoleCount(schedule);
                  return (
                    <motion.div
                      key={schedule.id}
                      custom={i}
                      variants={fadeUp}
                      initial="hidden"
                      animate="visible"
                      className="event-row group"
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        onClick={() => setDetailId(schedule.id)}
                      >
                        {date ? <ScheduleRowDate date={date} /> : <div className="w-10" />}
                        <div className="event-row-body">
                          <p className="event-row-title">
                            {date
                              ? formatAppDate(date, 'EEEE, MMMM d', locale)
                              : t('schedules.add')}
                          </p>
                          <p className="event-row-meta">
                            {filled} / {SCHEDULE_ROLE_KEYS.length} roles filled
                          </p>
                        </div>
                      </button>
                      {isAdmin ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0 rounded-lg opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                          onClick={() => setDeleteConfirm(schedule)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" />
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          <Dialog open={newOpen} onOpenChange={closeNew}>
            <DialogContent className="max-w-sm rounded-xl">
              <DialogHeader>
                <DialogTitle>New roster</DialogTitle>
                <DialogDescription>Pick the date, then assign people on the next screen.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ndcpc-roster-date">{t('common.date')}</Label>
                  <Input
                    id="ndcpc-roster-date"
                    type="date"
                    className="rounded-lg"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={() => void handleCreate()} disabled={creating || !newDate}>
                  {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create roster
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
            <DialogContent className="max-w-sm rounded-xl">
              <DialogHeader>
                <DialogTitle>Delete this roster?</DialogTitle>
                <DialogDescription>This permanently removes the Sunday assignments.</DialogDescription>
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
                  {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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
