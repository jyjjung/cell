'use client';

import { Schedule } from '@/types/ndcpc-ported';
import {
  SCHEDULE_ROLE_KEYS,
  SIMPLE_SCHEDULE_ROLE_KEYS,
  getScheduleRoleValue,
  type ScheduleRoleKey,
} from '@/lib/ndcpc/schedule-roles';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/context/LocaleProvider';
import { formatAppDate } from '@/lib/ndcpc/format-date';
import { ReactNode } from 'react';

type ScheduleTableProps = {
  schedules: Schedule[];
  variant?: 'full' | 'simple';
  showDate?: boolean;
  actions?: (schedule: Schedule) => ReactNode;
};

export function ScheduleTable({
  schedules,
  variant = 'full',
  showDate = true,
  actions,
}: ScheduleTableProps) {
  const { t, locale } = useTranslation();

  const roleKeys =
    variant === 'simple' ? SIMPLE_SCHEDULE_ROLE_KEYS : SCHEDULE_ROLE_KEYS;

  const roleLabel = (key: ScheduleRoleKey) => t(`schedules.role.${key}`);

  const formatDate = (schedule: Schedule) =>
    schedule.date?.seconds
      ? formatAppDate(new Date(schedule.date.seconds * 1000), 'MMM d, yyyy', locale)
      : t('schedules.dateNotSet');

  return (
    <div className="-mx-1 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {showDate && (
              <TableHead className="min-w-[7rem] whitespace-nowrap pl-1">
                {t('common.date')}
              </TableHead>
            )}
            {roleKeys.map((key) => (
              <TableHead key={key} className="min-w-[5.5rem] whitespace-nowrap">
                {roleLabel(key)}
              </TableHead>
            ))}
            {actions && (
              <TableHead className="w-20 pr-1 text-right">
                <span className="sr-only">{t('common.edit')}</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedules.map((schedule) => (
            <TableRow key={schedule.id}>
              {showDate && (
                <TableCell className="whitespace-nowrap pl-1 font-medium">
                  {formatDate(schedule)}
                </TableCell>
              )}
              {roleKeys.map((key) => (
                <TableCell key={key} className="text-muted-foreground">
                  {getScheduleRoleValue(schedule, key)}
                </TableCell>
              ))}
              {actions && (
                <TableCell className="pr-1 text-right">{actions(schedule)}</TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
