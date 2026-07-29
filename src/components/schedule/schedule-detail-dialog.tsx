"use client";

import { format } from 'date-fns';
import { Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ScheduleDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eyebrow?: string;
  title?: string;
  date?: Date;
  closeLabel: string;
  children?: ReactNode;
}

/** Detail sheet for a schedule row, opened from the agenda. */
export function ScheduleDetailDialog({
  open,
  onOpenChange,
  eyebrow,
  title,
  date,
  closeLabel,
  children,
}: ScheduleDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-xl border-border/70 p-5">
        <DialogHeader className="space-y-2 text-left">
          <p className="text-eyebrow">{eyebrow}</p>
          <DialogTitle className="text-base font-semibold leading-snug">{title}</DialogTitle>
          <DialogDescription className="text-stat-label">
            {date ? format(date, 'EEEE, MMMM d, yyyy') : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">{children}</div>

        <Button className="mt-2 w-full" onClick={() => onOpenChange(false)}>
          {closeLabel}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

/** Free-text body, such as an event description. */
export function ScheduleDetailText({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>;
}

export function ScheduleDetailGroup({ children }: { children: ReactNode }) {
  return <div className="space-y-2 text-sm">{children}</div>;
}

/** Labelled value pair, e.g. "Topic: Psalm of ascent". */
export function ScheduleDetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <p>
      <span className="text-muted-foreground">{label}: </span>
      {value}
    </p>
  );
}

export function ScheduleDetailPassage({ passage }: { passage: string }) {
  return <p className="font-mono font-medium">{passage}</p>;
}

/** Roster names with a people icon. */
export function ScheduleDetailPeople({ names }: { names: string }) {
  return (
    <div className="flex items-start gap-2">
      <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <p>{names}</p>
    </div>
  );
}
