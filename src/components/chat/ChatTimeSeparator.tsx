'use client';

import { differenceInDays, format, isToday, isYesterday } from 'date-fns';

/** Shared chat timestamp label — used by em. and NDCPC. */
export function formatChatMessageDate(date: Date) {
  if (isToday(date)) return `Today ${format(date, 'HH:mm')}`;
  if (isYesterday(date)) return `Yesterday ${format(date, 'HH:mm')}`;
  if (differenceInDays(new Date(), date) < 7) return format(date, 'EEEE HH:mm');
  return format(date, 'MMM d, HH:mm');
}

export function ChatTimeSeparator({ label }: { label: string }) {
  return (
    <div className="chat-message-row py-3 flex justify-center w-full">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
