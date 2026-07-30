"use client";

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/auth-context';
import { useUsersById } from '@/hooks/use-all-users';
import { formatUserDisplayName } from '@/lib/formatting';
import { translations } from '@/lib/translations';
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
  const { currentUser } = useAuth();
  const usersById = useUsersById();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const reactions = notification.reactions || {};
  const entries = Object.entries(reactions).filter(([, uids]) => uids.length > 0);

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1">
      {entries.map(([emoji, uids]) => {
        const mine = uids.includes(uid);
        const reactionNames = uids
          .map((reactorId) => formatUserDisplayName(usersById.get(reactorId)))
          .join(', ');

        return (
          // modal + elevated z-index: Radix Sheet (Dialog) otherwise traps/hides portaled popovers
          <Popover key={emoji} modal>
            <PopoverTrigger asChild>
              <button
                type="button"
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
            </PopoverTrigger>
            <PopoverContent
              side="top"
              className="z-[100] w-auto max-w-[220px] rounded-xl border border-border !bg-popover px-3 py-2.5 text-popover-foreground shadow-xl"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <div className="flex flex-col gap-2">
                <div className="break-words text-xs leading-snug">
                  <span className="mb-0.5 block text-micro-label">
                    {t.reactedBy}
                  </span>
                  <span className="font-medium text-foreground">{reactionNames}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(emoji);
                  }}
                  className="w-full rounded-md bg-muted py-1.5 text-[10px] font-semibold text-foreground transition-colors hover:bg-muted/80"
                >
                  {mine ? t.removeReaction : t.addReaction}
                </button>
              </div>
            </PopoverContent>
          </Popover>
        );
      })}
      <Popover modal>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/60 text-muted-foreground hover:bg-muted"
            aria-label={t.addReaction}
          >
            <SmilePlus className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="z-[100] w-auto p-2"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
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
