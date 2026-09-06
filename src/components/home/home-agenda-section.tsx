'use client';

import { useState } from 'react';
import { CalendarOff, ChevronRight } from 'lucide-react';
import type { AppUser } from '@/types';
import { useHomeAgenda, type HomeAgendaEntry } from '@/hooks/use-home-agenda';
import { usePageLoading } from '@/contexts/page-loading-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';
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
import { Text } from '@/components/ui/text';

interface HomeAgendaSectionProps {
  currentUser: AppUser;
}

export function HomeAgendaSection({ currentUser }: HomeAgendaSectionProps) {
  const { agendaByMonth, entryTypeLabel, loading, t } = useHomeAgenda(currentUser);
  const [selectedEntry, setSelectedEntry] = useState<HomeAgendaEntry | null>(null);
  const router = useRouter();
  const { setIsPageLoading } = usePageLoading();

  return (
    <>
      <HomeGroupedSection id="home-agenda-heading" title={t.communitySchedule}>
        <LoadingState isLoading={loading} variant="skeleton" skeletonRows={3} delayMs={250}>
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
                      type={entry.type}
                      typeLabel={entryTypeLabel(entry.type)}
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
              <Text variant="strong">{t.clearSchedule}</Text>
              <Text variant="small" className="mt-0.5">{t.nothingComingUp}</Text>
            </div>
          )}
        </LoadingState>
        <div className="home-bible-footer" data-testid="home-full-schedule">
          <Button
            type="button"
            variant="ghost"
            className="home-bible-footer-link rounded-none"
            onClick={() => {
              setIsPageLoading(true);
              router.push('/events');
            }}
          >
            {t.fullScheduleLink}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
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
