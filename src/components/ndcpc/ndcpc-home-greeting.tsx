'use client';

import { useCallback, useMemo } from 'react';
import { ChevronRight, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useChats } from '@/hooks/useChats';
import { sumChatUnreadMessageCounts } from '@/lib/notification-utils';
import { chatBelongsToApp } from '@/lib/chat-utils';
import { formatUserDisplayName } from '@/lib/formatting';
import { translations } from '@/lib/translations';
import { useRouter } from 'next/navigation';
import { usePageLoading } from '@/contexts/page-loading-context';
import { Button } from '@/components/ui/button';
import { HomeGroupList } from '@/components/home/home-grouped-section';

function getGreeting(lang: string) {
  const h = new Date().getHours();
  if (lang === 'ko') return h < 12 ? '좋은 아침이에요' : h < 17 ? '좋은 오후예요' : '좋은 저녁이에요';
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export function NdcpcHomeGreeting() {
  const { currentUser } = useAuth();
  const lang = currentUser?.preferredLanguage || 'en';
  const t = translations[lang];
  const { chats } = useChats();
  const router = useRouter();
  const { setIsPageLoading } = usePageLoading();

  const go = useCallback(
    (path: string) => {
      setIsPageLoading(true);
      router.push(path);
    },
    [router, setIsPageLoading],
  );

  const unreadChatCount = useMemo(
    () =>
      sumChatUnreadMessageCounts(
        chats.filter((chat) => chatBelongsToApp(chat, 'ndcpc')),
        currentUser?.uid ?? '',
      ),
    [chats, currentUser?.uid],
  );

  if (!currentUser) return null;

  const displayName = `${formatUserDisplayName(currentUser, 'Guest')}${lang === 'ko' ? '님' : ''}`;

  return (
    <header className="home-greeting">
      <h1 className="home-greeting-title">
        {getGreeting(lang)}, {displayName}
      </h1>

      {unreadChatCount > 0 ? (
        <div className="ui-card-flat mt-3 overflow-hidden">
          <HomeGroupList>
            <Button
              type="button"
              variant="ghost"
              className="home-group-nav-row h-auto w-full"
              onClick={() => go('/ndcpc/chat')}
            >
              <MessageCircle className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 flex-1 text-left text-sm font-medium">
                {t.unreadMessagesLine.replace('{count}', String(unreadChatCount))}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </Button>
          </HomeGroupList>
        </div>
      ) : null}
    </header>
  );
}
