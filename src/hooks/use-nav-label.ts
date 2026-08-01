"use client";

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useClientSearchParams } from '@/hooks/use-client-search-params';
import { getNavLabelForPath } from '@/lib/nav-labels';
import { translations } from '@/lib/translations';
import { useChats } from '@/hooks/useChats';
import { useAllUsers } from '@/hooks/use-all-users';
import { useRosterDefinitions } from '@/hooks/useRosterDefinitions';
import { getChatDisplayDetails } from '@/lib/chat-utils';
import { isProfileTabId } from '@/components/profile/profile-hub-tabs';

const CHAT_SUBPAGES = new Set(['photos', 'links']);
const WORSHIP_TABS = new Set(['playlists', 'songs', 'rosters']);

function getProfileTabLabel(tab: string | null, lang: 'en' | 'ko'): string | null {
  const t = translations[lang];
  if (tab === 'appearance') return t.profileTabAppearance as string;
  if (tab === 'settings') return t.profileTabSettings as string;
  if (tab === 'profile') return t.profileTabProfile as string;
  return null;
}

function getWorshipTabLabel(tab: string | null, lang: 'en' | 'ko'): string | null {
  const t = translations[lang];
  if (tab === 'playlists') return t.setlistsTab as string;
  if (tab === 'songs') return t.songsTab as string;
  if (tab === 'rosters') return t.rostersTab as string;
  return null;
}

function getChatIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/chat\/([^/]+)$/);
  if (!match) return null;
  const segment = match[1];
  if (CHAT_SUBPAGES.has(segment)) return null;
  return segment;
}

function getRosterIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/rosters\/([^/]+)$/);
  return match?.[1] ?? null;
}

export function useNavLabel(pathnameOverride?: string) {
  const pathname = usePathname();
  const searchParams = useClientSearchParams();
  const { currentUser } = useAuth();
  const { chats } = useChats();
  const { allUsers } = useAllUsers();
  const lang = (currentUser?.preferredLanguage || 'en') as 'en' | 'ko';
  const resolved = pathnameOverride ?? pathname;
  const rosterId = getRosterIdFromPath(resolved);
  const { definitions } = useRosterDefinitions({ enabled: !!rosterId });

  const chatName = useMemo(() => {
    const chatId = getChatIdFromPath(resolved);
    if (!chatId || !currentUser) return null;
    const chat = chats.find((c) => c.id === chatId);
    if (!chat) return null;
    return getChatDisplayDetails(chat, currentUser.uid, allUsers)?.name ?? null;
  }, [resolved, chats, currentUser, allUsers]);

  const rosterName = useMemo(() => {
    if (!rosterId) return null;
    return definitions.find((def) => def.id === rosterId)?.name?.trim() || null;
  }, [rosterId, definitions]);

  if (chatName) return chatName;
  if (rosterName) return rosterName;

  if (resolved === '/profile') {
    const tab = searchParams.get('tab');
    if (isProfileTabId(tab)) {
      return getProfileTabLabel(tab, lang) ?? getNavLabelForPath(resolved, lang);
    }
    return getNavLabelForPath(resolved, lang);
  }

  if (resolved === '/worship') {
    const tab = searchParams.get('tab');
    if (tab && WORSHIP_TABS.has(tab)) {
      return getWorshipTabLabel(tab, lang) ?? getNavLabelForPath(resolved, lang);
    }
    return getWorshipTabLabel('rosters', lang) ?? getNavLabelForPath(resolved, lang);
  }

  return getNavLabelForPath(resolved, lang);
}

export function useChatNavLabel(chatId: string | null | undefined) {
  const { currentUser } = useAuth();
  const { chats } = useChats();
  const { allUsers } = useAllUsers();
  const lang = (currentUser?.preferredLanguage || 'en') as 'en' | 'ko';

  return useMemo(() => {
    if (!chatId || CHAT_SUBPAGES.has(chatId) || !currentUser) {
      return getNavLabelForPath(`/chat/${chatId ?? ''}`, lang);
    }
    const chat = chats.find((c) => c.id === chatId);
    if (!chat) return getNavLabelForPath('/chat', lang);
    return getChatDisplayDetails(chat, currentUser.uid, allUsers)?.name ?? getNavLabelForPath('/chat', lang);
  }, [chatId, chats, currentUser, allUsers, lang]);
}
