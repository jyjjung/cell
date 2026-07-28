"use client";

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { AppNotification } from '@/types';
import { SmilePlus } from 'lucide-react';

export const STANDARD_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export function AnnouncementReactions({
  notification,
  uid,
  onToggle,
}: {
  notification: AppNotification;
  uid: string;
  onToggle: (emoji: string) => void;
}) {
  const reactions = notification.reactions || {};
  const entries = Object.entries(reactions).filter(([, uids]) => uids.length > 0);

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1">
      {entries.map(([emoji, uids]) => {
        const mine = uids.includes(uid);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onToggle(emoji)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
              mine
                ? 'border-primary/40 bg-primary/10 text-foreground'
                : 'border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted',
            )}
          >
            <span>{emoji}</span>
            <span className="tabular-nums">{uids.length}</span>
          </button>
        );
      })}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/60 text-muted-foreground hover:bg-muted"
            aria-label="Add reaction"
          >
            <SmilePlus className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1">
            {STANDARD_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onToggle(emoji)}
                className="rounded-lg px-2 py-1 text-base hover:bg-muted"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
