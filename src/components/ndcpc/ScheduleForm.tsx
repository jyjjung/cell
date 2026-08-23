'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MemberGuestPickerDialog,
  RosterRoleSlotRow,
} from '@/components/worship/roster-people-picker';
import { useToast } from '@/hooks/use-toast';
import { useAllUsers } from '@/hooks/use-all-users';
import { useFirestore } from '@/firebase';
import { collection, addDoc, doc, setDoc, Timestamp } from 'firebase/firestore';
import type { Schedule } from '@/types/ndcpc-ported';
import { dateInputValueToDate, timestampToDateInputValue } from '@/lib/ndcpc/dates';
import { useTranslation } from '@/context/LocaleProvider';
import {
  ndcpcScheduleRoleBadgeClass,
  SCHEDULE_ROLE_KEYS,
  type ScheduleRoleKey,
} from '@/lib/ndcpc/schedule-roles';
import { NDCPc_COLLECTIONS } from '@/lib/ndcpc/collections';
import {
  ndcpcRosterDirectoryEntries,
  ndcpcRosterMemberUidForName,
} from '@/lib/ndcpc/roster-people';

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

  const formSchema = z.object({
    date: z.string().min(1, t('schedules.dateRequired')),
    worship: z.string(),
    offering: z.string(),
    sermon: z.string(),
    chant: z.string(),
    activity: z.string(),
  });

  type ScheduleFormValues = z.infer<typeof formSchema>;

  const siteUserOptions = useMemo(() => ndcpcRosterDirectoryEntries(allUsers), [allUsers]);

  const pickerMembers = useMemo(
    () => siteUserOptions.map((user) => ({ uid: user.uid, displayName: user.name })),
    [siteUserOptions],
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

  const assignPerson = (role: ScheduleRoleKey, name: string) => {
    form.setValue(role, name, { shouldDirty: true, shouldTouch: true });
    setPickerRole(null);
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

  const pickerValue = pickerRole ? form.watch(pickerRole) : '';
  const pickerAssignedUid = pickerRole
    ? ndcpcRosterMemberUidForName(siteUserOptions, pickerValue)
    : undefined;

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

              <div className="space-y-2">
                {SCHEDULE_ROLE_KEYS.map((key) => {
                  const value = form.watch(key);
                  const memberUid = value
                    ? ndcpcRosterMemberUidForName(siteUserOptions, value)
                    : undefined;
                  return (
                    <FormField
                      key={key}
                      control={form.control}
                      name={key}
                      render={() => (
                        <FormItem>
                          <RosterRoleSlotRow
                            roleLabel={t(`schedules.role.${key}`)}
                            roleClassName={ndcpcScheduleRoleBadgeClass(key)}
                            people={
                              value
                                ? [{
                                    id: memberUid ?? `guest-${key}`,
                                    displayName: value,
                                    isMember: Boolean(memberUid),
                                  }]
                                : []
                            }
                            canManage
                            onAdd={() => setPickerRole(key)}
                            onRemove={() => clearPerson(key)}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  );
                })}
              </div>

              <Button type="submit" className="w-full">
                {form.formState.isSubmitting ? t('common.saving') : t('schedules.saveSchedule')}
              </Button>
            </form>
          </Form>
        </div>
      </ScrollArea>

      <MemberGuestPickerDialog
        open={pickerRole != null}
        onOpenChange={(open) => {
          if (!open) setPickerRole(null);
        }}
        roleLabel={pickerRole ? t(`schedules.role.${pickerRole}`) : ''}
        members={pickerMembers}
        assignedUserIds={pickerAssignedUid ? [pickerAssignedUid] : []}
        loading={usersLoading}
        onSelectMember={(member) => pickerRole && assignPerson(pickerRole, member.displayName)}
        onAddGuest={(name) => pickerRole && assignPerson(pickerRole, name)}
      />
    </>
  );
}
