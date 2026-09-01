"use client";

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/auth-context';
import { useUsersById } from '@/hooks/use-all-users';
import { formatUserDisplayName } from '@/lib/formatting';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';
import type { AppNotification } from '@/types';
import { SmilePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';

const STANDARD_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

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
              <Button
                type="button"
                variant="ghost"
                size="chip"
                className={cn(
                  'border',
                  mine
                    ? 'border-primary/40 bg-primary/10 text-foreground'
                    : 'border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted',
                )}
              >
                <span>{emoji}</span>
                <span className="tabular-nums">{uids.length}</span>
              </Button>
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
                <Button
                  type="button"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(emoji);
                  }}
                  className="h-auto min-h-11 w-full py-1.5 text-[10px] font-semibold"
                >
                  {mine ? t.removeReaction : t.addReaction}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        );
      })}
      <Popover modal>
        <PopoverTrigger asChild>
          <IconButton
            size="compact"
            aria-label={t.addReaction}
            icon={SmilePlus}
            className="rounded-full border border-border/60 text-muted-foreground"
          />
        </PopoverTrigger>
        <PopoverContent
          className="z-[100] w-auto p-2"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex gap-1">
            {STANDARD_REACTIONS.map((emoji) => (
              <Button
                key={emoji}
                type="button"
                variant="ghost"
                aria-label={emoji}
                onClick={() => onToggle(emoji)}
                size="iconCompact"
                className="h-8 w-8 min-h-0 min-w-0 px-0 text-base"
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
