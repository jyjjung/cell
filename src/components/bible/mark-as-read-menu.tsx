'use client';

import { useCallback, useState } from 'react';
import { BookUp, CalendarRange, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import MarkDaysReadDialog from '@/components/bible/mark-days-read-dialog';
import MarkRangeReadDialog from '@/components/bible/mark-range-read-dialog';
import { translations } from '@/lib/translations';
import type { DailyReading } from '@/types';

interface MarkAsReadMenuProps {
  lang: string;
  dailyReadings: DailyReading[];
}

export function MarkAsReadMenu({ lang, dailyReadings }: MarkAsReadMenuProps) {
  const t = translations[lang === 'ko' ? 'ko' : 'en'];
  const [menuOpen, setMenuOpen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [daysOpen, setDaysOpen] = useState(false);

  const openAfterMenu = useCallback((openDialog: () => void) => {
    setMenuOpen(false);
    window.setTimeout(() => openDialog(), 0);
  }, []);

  const handleRangeOpenChange = useCallback((open: boolean) => {
    setRangeOpen(open);
  }, []);

  const handleDaysOpenChange = useCallback((open: boolean) => {
    setDaysOpen(open);
  }, []);

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-xl px-3 text-xs font-semibold"
          >
            <BookUp className="h-4 w-4" aria-hidden />
            {t.markAsRead}
            <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-2xl border-border/50 p-2 shadow-2xl">
          <DropdownMenuItem
            className="h-10 rounded-lg px-3 text-sm"
            onSelect={(event) => {
              event.preventDefault();
              openAfterMenu(() => setRangeOpen(true));
            }}
          >
            <BookUp className="mr-2 h-4 w-4 text-primary" aria-hidden />
            {t.markByBookRange}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="h-10 rounded-lg px-3 text-sm"
            onSelect={(event) => {
              event.preventDefault();
              openAfterMenu(() => setDaysOpen(true));
            }}
          >
            <CalendarRange className="mr-2 h-4 w-4 text-primary" aria-hidden />
            {t.markByPlanDays}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <MarkRangeReadDialog isOpen={rangeOpen} onOpenChange={handleRangeOpenChange} lang={lang} />
      <MarkDaysReadDialog
        isOpen={daysOpen}
        onOpenChange={handleDaysOpenChange}
        lang={lang}
        dailyReadings={dailyReadings}
      />
    </>
  );
}
