"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Link2, Loader2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useChats } from '@/hooks/useChats';
import { useAllUsers, useUsersById } from '@/hooks/use-all-users';
import { useAllChatMessages } from '@/hooks/use-all-chat-messages';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';
import { getChatDisplayDetails } from '@/lib/chat-utils';
import { extractChatLinks } from '@/lib/chat-media-extract';
import { chatLinkFaviconUrl, chatLinkHostname } from '@/lib/chat-url-utils';
import { NavPageHeader } from '@/components/ui/page-layout';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type GlobalLink = {
  id: string;
  url: string;
  displayUrl: string;
  senderLabel: string;
  chatId: string;
  chatName: string;
  createdAtMillis: number;
};

export default function AllChatLinksPage() {
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const { chats, loading: loadingChats } = useChats();
  const { allUsers } = useAllUsers();
  const usersById = useUsersById();
  const chatIds = useMemo(() => chats.map((c) => c.id), [chats]);
  const { messagesByChatId, loading: loadingMessages } = useAllChatMessages(chatIds);

  const links = useMemo(() => {
    if (!currentUser) return [];

    const seen = new Set<string>();
    const items: GlobalLink[] = [];

    for (const chat of chats) {
      const details = getChatDisplayDetails(chat, currentUser.uid, allUsers);
      if (!details) continue;

      const messages = messagesByChatId[chat.id] ?? [];
      const chatLinks = extractChatLinks(messages, usersById);

      for (const link of chatLinks) {
        const dedupeKey = `${link.url}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        items.push({
          id: `${chat.id}-${link.id}`,
          url: link.url,
          displayUrl: link.displayUrl,
          senderLabel: link.senderLabel,
          chatId: chat.id,
          chatName: details.name,
          createdAtMillis: link.createdAt?.toMillis?.() ?? 0,
        });
      }
    }

    return items.sort((a, b) => b.createdAtMillis - a.createdAtMillis);
  }, [chats, messagesByChatId, usersById, allUsers, currentUser]);

  const loading = loadingChats || (chatIds.length > 0 && loadingMessages);

  return (
    <div className="page-container">
      <NavPageHeader
        action={
          <Button asChild variant="outline" className="h-8 rounded-lg px-3 text-sm">
            <Link href="/chat">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.back}
            </Link>
          </Button>
        }
      />

      {loading ? (
        <div className="empty-inline py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : links.length === 0 ? (
        <div className="empty-inline">
          <Link2 className="mb-2 h-8 w-8 text-muted-foreground/40" />
          <p className="font-semibold text-foreground">{t.noLinksYetChat}</p>
          <p className="text-micro-label mt-1">{t.linksSharedHint}</p>
        </div>
      ) : (
        <div className="admin-table-wrap page-responsive-table">
          <Table className="admin-table">
            <TableHeader className="bg-muted">
              <TableRow className="hover:bg-transparent border-white/5">
                <TableHead>{t.links}</TableHead>
                <TableHead>{t.chat}</TableHead>
                <TableHead>{t.adminName}</TableHead>
                <TableHead>{t.date}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => {
                const favicon = chatLinkFaviconUrl(link.url);
                const host = chatLinkHostname(link.url);
                const label = link.displayUrl ?? link.url;
                return (
                  <TableRow key={link.id} className="border-white/5 hover:bg-white/5">
                    <TableCell className="responsive-table-primary py-2 whitespace-normal">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-start gap-2.5 min-w-0"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                          {favicon ? (
                            <img
                              src={favicon}
                              alt=""
                              className="h-4 w-4 object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Link2 className="h-3.5 w-3.5 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium break-words group-hover:text-primary transition-colors">
                            {label}
                          </p>
                          <p className="text-[11px] text-muted-foreground break-all">{host}</p>
                        </div>
                        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      </a>
                    </TableCell>
                    <TableCell className="py-2 whitespace-normal" data-label={t.chat}>
                      <span className="text-sm break-words">{link.chatName}</span>
                    </TableCell>
                    <TableCell className="py-2 whitespace-normal" data-label={t.adminName}>
                      <span className="text-sm text-muted-foreground break-words">{link.senderLabel || '—'}</span>
                    </TableCell>
                    <TableCell className="py-2 whitespace-normal" data-label={t.date}>
                      <span className="text-sm text-muted-foreground">
                        {link.createdAtMillis > 0
                          ? format(new Date(link.createdAtMillis), 'MMM d, yyyy')
                          : '—'}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
