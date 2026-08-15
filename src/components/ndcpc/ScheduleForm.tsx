'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Search, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc, doc, setDoc, Timestamp } from 'firebase/firestore';
import type { Schedule } from '@/types/ndcpc-ported';
import { dateInputValueToDate, timestampToDateInputValue } from '@/lib/ndcpc/dates';
import { useTranslation } from '@/context/LocaleProvider';
import { SCHEDULE_ROLE_KEYS, type ScheduleRoleKey } from '@/lib/ndcpc/schedule-roles';
import { NDCPc_COLLECTIONS } from '@/lib/ndcpc/collections';
import { useAllUsers } from '@/hooks/use-all-users';
import { ndcpcAccountDisplayName } from '@/lib/ndcpc/account-name';
import { cn } from '@/lib/utils';

interface ScheduleFormProps {
  onSuccess: () => void;
  schedule?: Schedule | null;
}

export function ScheduleForm({ onSuccess, schedule }: ScheduleFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { allUsers, loading: usersLoading } = useAllUsers();
  const [pickerRole, setPickerRole] = useState<ScheduleRoleKey | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [guestName, setGuestName] = useState('');

  const formSchema = z.object({
    date: z.string().min(1, t('schedules.dateRequired')),
    worship: z.string(),
    offering: z.string(),
    sermon: z.string(),
    chant: z.string(),
    activity: z.string(),
  });

  type ScheduleFormValues = z.infer<typeof formSchema>;

  // Same pool as em. worship rosters: anyone with a first name in the directory.
  const siteUserOptions = useMemo(
    () =>
      allUsers
        .filter((user) => Boolean(user.firstName?.trim()))
        .map((user) => ({
          uid: user.uid,
          name: ndcpcAccountDisplayName(user) || `${user.firstName} ${user.lastName ?? ''}`.trim(),
        }))
        .filter((entry) => entry.name)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allUsers],
  );

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: schedule
      ? {
          date: timestampToDateInputValue(schedule.date),
          worship: schedule.worship || '',
          offering: schedule.offering || '',
          sermon: schedule.sermon || '',
          chant: schedule.chant || '',
          activity: schedule.activity || '',
        }
      : {
          date: timestampToDateInputValue(null),
          worship: '',
          offering: '',
          sermon: '',
          chant: '',
          activity: '',
        },
  });

  const filteredUsers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return siteUserOptions;
    return siteUserOptions.filter((user) => user.name.toLowerCase().includes(q));
  }, [siteUserOptions, memberSearch]);

  const assignPerson = (role: ScheduleRoleKey, name: string) => {
    form.setValue(role, name, { shouldDirty: true, shouldTouch: true });
    setPickerRole(null);
    setMemberSearch('');
    setGuestName('');
  };

  const clearPerson = (role: ScheduleRoleKey) => {
    form.setValue(role, '', { shouldDirty: true, shouldTouch: true });
  };

  const onSubmit = async (values: ScheduleFormValues) => {
    if (!firestore) return;

    try {
      const scheduleData = {
        worship: values.worship.trim(),
        offering: values.offering.trim(),
        sermon: values.sermon.trim(),
        chant: values.chant.trim(),
        activity: values.activity.trim(),
        date: Timestamp.fromDate(dateInputValueToDate(values.date)),
      };

      if (schedule?.id) {
        const scheduleRef = doc(firestore, NDCPc_COLLECTIONS.schedules, schedule.id);
        await setDoc(scheduleRef, scheduleData);
        toast({ title: t('common.saved') });
      } else {
        await addDoc(collection(firestore, NDCPc_COLLECTIONS.schedules), scheduleData);
        toast({ title: t('common.added') });
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving schedule: ', error);
      toast({
        variant: 'destructive',
        title: t('toast.couldntSave'),
      });
    }
  };

  const pickerTitle = pickerRole ? t(`schedules.role.${pickerRole}`) : '';

  return (
    <>
      <ScrollArea className="max-h-[70vh] p-1">
        <div className="pr-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.date')}</FormLabel>
                    <FormControl>
                      <Input type="date" className="rounded-lg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {SCHEDULE_ROLE_KEYS.map((key) => {
                const value = form.watch(key);
                return (
                  <FormField
                    key={key}
                    control={form.control}
                    name={key}
                    render={() => (
                      <FormItem>
                        <FormLabel>{t(`schedules.role.${key}`)}</FormLabel>
                        <div className="flex items-center gap-2">
                          {value ? (
                            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                              <span className="min-w-0 truncate font-medium">{value}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={() => clearPerson(key)}
                                aria-label={t('common.remove')}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <p className="flex-1 text-sm text-muted-foreground">None</p>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 shrink-0 gap-1.5 rounded-lg"
                            onClick={() => {
                              setPickerRole(key);
                              setMemberSearch('');
                              setGuestName('');
                            }}
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            {value ? 'Change' : 'Add'}
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                );
              })}

              <Button type="submit" className="w-full">
                {form.formState.isSubmitting ? t('common.saving') : t('schedules.saveSchedule')}
              </Button>
            </form>
          </Form>
        </div>
      </ScrollArea>

      <Dialog
        open={pickerRole != null}
        onOpenChange={(open) => {
          if (!open) {
            setPickerRole(null);
            setMemberSearch('');
            setGuestName('');
          }
        }}
      >
        <DialogContent className="max-w-sm rounded-xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-semibold">{pickerTitle}</DialogTitle>
            <DialogDescription>Pick a person from the directory, or add a guest name.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search people…"
                className="h-9 rounded-xl pl-9"
              />
            </div>

            <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
              {usersLoading ? (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">Loading people…</p>
              ) : filteredUsers.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">No matches</p>
              ) : (
                filteredUsers.map((user) => {
                  const selected = pickerRole ? form.getValues(pickerRole) === user.name : false;
                  return (
                    <button
                      key={user.uid}
                      type="button"
                      onClick={() => pickerRole && assignPerson(pickerRole, user.name)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-left text-sm transition-colors',
                        selected
                          ? 'border-border bg-muted text-primary'
                          : 'hover:border-border hover:bg-muted',
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">{user.name}</span>
                      {selected ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
                    </button>
                  );
                })
              )}
            </div>

            <div className="space-y-2 border-t border-border/40 pt-3">
              <Label className="text-xs text-muted-foreground">Guest</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Guest name…"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="h-9 flex-1 rounded-xl text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && guestName.trim() && pickerRole) {
                      e.preventDefault();
                      assignPerson(pickerRole, guestName.trim());
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-9 shrink-0 rounded-xl"
                  disabled={!guestName.trim() || !pickerRole}
                  onClick={() => pickerRole && guestName.trim() && assignPerson(pickerRole, guestName.trim())}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {pickerRole && form.getValues(pickerRole) ? (
              <Button
                type="button"
                variant="ghost"
                className="w-full rounded-xl text-muted-foreground"
                onClick={() => {
                  clearPerson(pickerRole);
                  setPickerRole(null);
                }}
              >
                Clear assignment
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
