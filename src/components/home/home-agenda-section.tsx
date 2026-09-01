'use client';

import { useState } from 'react';
import { CalendarOff } from 'lucide-react';
import type { AppUser } from '@/types';
import { useHomeAgenda, type HomeAgendaEntry } from '@/hooks/use-home-agenda';
import {
  ScheduleDetailDialog,
  ScheduleDetailField,
  ScheduleDetailGroup,
  ScheduleDetailPassage,
  ScheduleDetailPeople,
  ScheduleDetailText,
} from '@/components/schedule/schedule-detail-dialog';
import {
  HomeAgendaRow,
  mergeAgendaDetail,
} from '@/components/home/home-agenda-row';
import {
  HomeGroupedSection,
  HomeGroupList,
  HomeGroupSubhead,
} from '@/components/home/home-grouped-section';

interface HomeAgendaSectionProps {
  currentUser: AppUser;
}

export function HomeAgendaSection({ currentUser }: HomeAgendaSectionProps) {
  const { agendaByMonth, entryTypeLabel, t } = useHomeAgenda(currentUser);
  const [selectedEntry, setSelectedEntry] = useState<HomeAgendaEntry | null>(null);

  return (
    <>
      <HomeGroupedSection id="home-agenda-heading" title={t.communitySchedule}>
        {agendaByMonth.length > 0 ? (
          <HomeGroupList className="home-group-list-flush">
            {agendaByMonth.map(([month, entries]) => (
              <div key={month}>
                <HomeGroupSubhead>{month}</HomeGroupSubhead>
                {entries.map((entry) => (
                  <HomeAgendaRow
                    key={entry.sourceKey}
                    date={entry.date}
                    title={entry.title}
                    detail={mergeAgendaDetail(entry.subtitle, entry.meta)}
                    rightElement={entry.rightElement}
                    onClick={() => setSelectedEntry(entry)}
                  />
                ))}
              </div>
            ))}
          </HomeGroupList>
        ) : (
          <div className="home-group-empty">
            <CalendarOff className="mb-2 h-5 w-5 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium text-foreground">{t.clearSchedule}</p>
            <p className="text-micro-label mt-0.5">{t.nothingComingUp}</p>
          </div>
        )}
      </HomeGroupedSection>

      <ScheduleDetailDialog
        open={!!selectedEntry}
        onOpenChange={(open) => !open && setSelectedEntry(null)}
        eyebrow={selectedEntry ? entryTypeLabel(selectedEntry.type) : undefined}
        title={selectedEntry?.title}
        date={selectedEntry?.date}
        closeLabel={t.done}
      >
        {(selectedEntry?.type === 'event' ||
          selectedEntry?.type === 'birthday' ||
          selectedEntry?.type === 'worship' ||
          selectedEntry?.type === 'custom') &&
          selectedEntry.details && <ScheduleDetailText>{selectedEntry.details}</ScheduleDetailText>}
        {selectedEntry?.type === 'qt' && (
          <ScheduleDetailGroup>
            {selectedEntry.qtTitle && (
              <ScheduleDetailField label={t.topic} value={selectedEntry.qtTitle} />
            )}
            {selectedEntry.passage && <ScheduleDetailPassage passage={selectedEntry.passage} />}
          </ScheduleDetailGroup>
        )}
        {selectedEntry?.type === 'cleaning' && (
          <ScheduleDetailGroup>
            {selectedEntry.dayName && (
              <ScheduleDetailField label={t.dayType} value={selectedEntry.dayName} />
            )}
            {selectedEntry.assignedNames && (
              <ScheduleDetailPeople names={selectedEntry.assignedNames} />
            )}
          </ScheduleDetailGroup>
        )}
      </ScheduleDetailDialog>
    </>
  );
}
