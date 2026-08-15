'use client';

import { useMemo } from 'react';
import { useAuth } from '@/context/AuthProvider';
import type { Schedule } from '@/types/ndcpc-ported';
import { useTranslation } from '@/context/LocaleProvider';
import { formatAppDate } from '@/lib/ndcpc/format-date';
import { getUpcomingDuties } from '@/lib/ndcpc/upcoming-duties';
import type { ScheduleRoleKey } from '@/lib/ndcpc/schedule-roles';
import { ContentFlow, FlowItem } from '@/components/ndcpc/ContentFlow';

type UpcomingDutiesProps = {
  schedules: Schedule[] | null | undefined;
};

export function UpcomingDuties({ schedules }: UpcomingDutiesProps) {
  const { profile } = useAuth();
  const { t, locale } = useTranslation();

  const duties = useMemo(
    () => getUpcomingDuties(schedules, profile),
    [schedules, profile],
  );

  const formatRoles = (roles: ScheduleRoleKey[]) =>
    roles.map((role) => t(`schedules.role.${role}`)).join(', ');

  if (!profile) return null;

  return (
    <section className="space-y-4">
      <h2 className="font-headline text-lg font-semibold">{t('dashboard.yourDuties')}</h2>
      {duties.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('dashboard.noDuties')}</p>
      ) : (
        <ContentFlow>
          {duties.map((duty) => (
            <FlowItem key={duty.scheduleId}>
              <p className="font-medium">
                {formatAppDate(duty.date, 'EEEE, MMMM d', locale)}
              </p>
              <p className="text-sm text-muted-foreground">{formatRoles(duty.roles)}</p>
            </FlowItem>
          ))}
        </ContentFlow>
      )}
    </section>
  );
}
