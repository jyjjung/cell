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
import { ArrowLeft, Trash2, Users } from 'lucide-react';
import { RosterRoleSlotRow } from '@/components/worship/roster-people-picker';
import { ScheduleForm } from '@/components/ndcpc/ScheduleForm';
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
import { ScheduleRowDate } from '@/components/schedule/schedule-occurrence-row';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAdmin } from '@/context/AuthProvider';
import { useTranslation } from '@/context/LocaleProvider';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAllUsers } from '@/hooks/use-all-users';
import { NDCPc_COLLECTIONS } from '@/lib/ndcpc/collections';
import { formatAppDate } from '@/lib/ndcpc/format-date';
import {
  dateInputValueToDate,
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
import type { Schedule } from '@/types/ndcpc-ported';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ScheduleManagerProps {
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
}

function filledRoleCount(schedule: Schedule) {
  return SCHEDULE_ROLE_KEYS.filter((key) => Boolean(getScheduleRoleValue(schedule, key))).length;
}

function ScheduleRosterPreview({
  schedule,
  directory,
  t,
}: {
  schedule: Schedule;
  directory: ReturnType<typeof ndcpcRosterDirectoryEntries>;
  t: (key: string) => string;
}) {
  return (
    <div className="space-y-2">
      {SCHEDULE_ROLE_KEYS.map((key) => {
        const name = getScheduleRoleValue(schedule, key);
        const memberUid = name ? ndcpcRosterMemberUidForName(directory, name) : undefined;
        return (
          <RosterRoleSlotRow
            key={key}
            roleLabel={t(`schedules.role.${key}`)}
            roleClassName={ndcpcScheduleRoleBadgeClass(key)}
            people={
              name
                ? [
                    {
                      id: memberUid ?? `guest-${key}`,
                      displayName: name,
                      isMember: Boolean(memberUid),
                    },
                  ]
                : []
            }
            canManage={false}
          />
        );
      })}
    </div>
  );
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

  if (isLoading) return <LoadingState isLoading delayMs={0} variant="skeleton" skeletonRows={4} />;

  return (
    <>
      <AnimatePresence mode="wait">
        {detail ? (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3">
              <IconButton
                aria-label="Back"
                icon={ArrowLeft}
                variant="ghost"
                className="rounded-xl"
                onClick={() => setDetailId(null)}
              />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-semibold leading-tight">
                  {detail.date?.seconds
                    ? formatAppDate(new Date(detail.date.seconds * 1000), 'EEEE, MMMM d', locale)
                    : t('schedules.add')}
                </h2>
                <p className="text-xs font-medium text-muted-foreground/60">
                  {filledRoleCount(detail)} / {SCHEDULE_ROLE_KEYS.length} assigned
                </p>
              </div>
              {isAdmin ? (
                <IconButton
                  aria-label="Delete roster"
                  icon={Trash2}
                  variant="ghost"
                  className="rounded-xl text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteConfirm(detail)}
                />
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
              <ScheduleRosterPreview schedule={detail} directory={directory} t={t} />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {schedules?.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/40 py-20 text-center">
                <Users className="mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="font-semibold text-muted-foreground">No rosters yet</p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  Create a Sunday roster to assign preschool duties.
                </p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="gap-2">
                {(schedules ?? []).map((schedule, i) => {
                  const date = schedule.date?.seconds
                    ? new Date(schedule.date.seconds * 1000)
                    : null;
                  const filled = filledRoleCount(schedule);
                  return (
                    <motion.div
                      key={schedule.id}
                      custom={i}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.3 }}
                    >
                      <AccordionItem value={schedule.id} className="rounded-2xl border border-border/40 bg-card/50 p-0">
                        <AccordionTrigger className="px-4 py-3 hover:bg-accent/30">
                          <div className="flex min-w-0 items-center gap-3 text-left">
                            {date ? <ScheduleRowDate date={date} /> : <div className="w-10 shrink-0" />}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">
                                {date ? formatAppDate(date, 'EEEE, MMMM d', locale) : t('schedules.add')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {filled} / {SCHEDULE_ROLE_KEYS.length} roles filled
                              </p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 px-4 pb-4">
                            <ScheduleRosterPreview schedule={schedule} directory={directory} t={t} />
                            <div className="flex justify-end gap-2">
                              {isAdmin ? (
                                <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(schedule)}>
                                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                  Delete
                                </Button>
                              ) : null}
                              <Button size="sm" onClick={() => setDetailId(schedule.id)}>
                                Open roster
                              </Button>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </motion.div>
                  );
                })}
              </Accordion>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
              {creating ? <ButtonSpinner className="mr-2" /> : null}
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
              {deleting ? <ButtonSpinner className="mr-2" /> : null}
              {t('common.delete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
