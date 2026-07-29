"use client";

import { DeletedContentNotice } from '@/components/chat/DeletedContentNotice';
import { useAuth } from '@/contexts/auth-context';
import { useFirestoreDoc } from '@/hooks/use-firestore-doc';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';
import type { WorshipSong } from '@/types';
import { ChevronRight, Loader2, Music2, User } from 'lucide-react';
import {
  chatCardLoading,
  chatCardMeta,
  chatCardShell,
} from './chat-card-styles';

interface SongSummaryProps {
  songId: string;
  isSender: boolean;
  onOpenViewer?: (songId?: string) => void;
}

export default function SongSummary({ songId, isSender, onOpenViewer }: SongSummaryProps) {
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const { data: song, loading } = useFirestoreDoc<WorshipSong>('worshipSongs', songId);

  if (loading) {
    return (
      <div className={cn(chatCardLoading, 'flex items-center justify-center')}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!song) {
    return <DeletedContentNotice label={t.deletedContentSong} />;
  }

  return (
    <div
      onClick={() => onOpenViewer?.(songId)}
      className={cn(
        chatCardShell(isSender, 'max-w-[280px] cursor-pointer flex-row items-center gap-3 active:scale-95'),
      )}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-muted">
        <Music2 className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-base font-semibold text-foreground">{song.title}</h4>
        {song.artist && (
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate">{song.artist}</span>
          </div>
        )}
        <p className={cn(chatCardMeta, 'mt-1 group-hover:text-foreground')}>
          {song.chordSheets.length} chart{song.chordSheets.length !== 1 ? 's' : ''}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
    </div>
  );
}
