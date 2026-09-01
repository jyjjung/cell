'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthProvider';
import type { Schedule } from '@/types/ndcpc-ported';
import { useTranslation } from '@/context/LocaleProvider';
import { getUpcomingDuties } from '@/lib/ndcpc/upcoming-duties';
import type { ScheduleRoleKey } from '@/lib/ndcpc/schedule-roles';
import { HomeGroupedSection, HomeGroupList } from '@/components/home/home-grouped-section';
import { HomeAgendaRow } from '@/components/home/home-agenda-row';
import { Button } from '@/components/ui/button';

type UpcomingDutiesProps = {
  schedules: Schedule[] | null | undefined;
};

export function UpcomingDuties({ schedules }: UpcomingDutiesProps) {
  const { profile } = useAuth();
  const { t } = useTranslation();

  const duties = useMemo(
    () => getUpcomingDuties(schedules, profile),
    [schedules, profile],
  );

  const formatRoles = (roles: ScheduleRoleKey[]) =>
    roles.map((role) => t(`schedules.role.${role}`)).join(', ');

  if (!profile || duties.length === 0) return null;

  return (
    <HomeGroupedSection
      id="ndcpc-your-duties"
      title={t('dashboard.yourDuties')}
      action={
        <Button asChild variant="ghost" size="sm" className="home-group-action">
          <Link href="/ndcpc/worship?tab=roster">{t('dashboard.viewAll')}</Link>
        </Button>
      }
    >
      <HomeGroupList>
        {duties.map((duty) => (
          <HomeAgendaRow
            key={duty.scheduleId}
            date={duty.date}
            title={formatRoles(duty.roles)}
            rightElement={<span className="home-you-badge">{t('youLabel')}</span>}
          />
        ))}
      </HomeGroupList>
    </HomeGroupedSection>
  );
}
