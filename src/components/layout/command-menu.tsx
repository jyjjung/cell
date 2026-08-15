"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useCommandState } from "cmdk";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Home,
  BookOpen,
  CalendarCheck,
  MessageCircle,
  Music,
  Library,
  Users,
  HeartHandshake,
  Lightbulb,
  Shield,
  User,
  Bell,
  Trophy,
  ListChecks,
  Brain,
  Megaphone,
  Search,
  ArrowRight,
  Sparkles,
  Check,
  FileText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useInboxOptional } from "@/contexts/inbox-context";
import { usePageLoading } from "@/contexts/page-loading-context";
import { useChats } from "@/hooks/useChats";
import { useAllUsers } from "@/hooks/use-all-users";
import { translations } from "@/lib/translations";
import { GroupChatAvatar } from "@/components/chat/GroupChatAvatar";
import { PixelAvatar } from "@/components/avatar/PixelAvatar";
import { formatUserDisplayName } from "@/lib/formatting";
import { getChatDisplayDetails, chatBelongsToApp, chatHrefForApp } from "@/lib/chat-utils";
import { resolveActiveApp } from "@/lib/app-access";
import {
  chatLastActivityMs,
  matchesSearchQuery,
  normalizeSearchQuery,
} from "@/lib/command-search";
import { cn } from "@/lib/utils";

interface CommandMenuProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type PageCommand = {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
  keywords: string[];
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
  requiresWorship?: boolean;
};

function CommandRow({
  value,
  icon: Icon,
  label,
  subtitle,
  onSelect,
  isActive,
  avatar,
  photoURL,
}: {
  value: string;
  icon: LucideIcon;
  label: string;
  subtitle?: string;
  onSelect: () => void;
  isActive?: boolean;
  avatar?: React.ReactNode;
  photoURL?: string | null;
}) {
  return (
    <CommandItem
      value={value}
      onSelect={onSelect}
      className="flex items-center gap-3 p-3 cursor-pointer"
    >
      <div className="relative h-9 w-9 shrink-0">
        {avatar ?? (
          <div className="flex h-full w-full items-center justify-center rounded-full border border-border/40 bg-muted/50">
            {photoURL ? (
              <GroupChatAvatar photoURL={photoURL} className="!h-full !w-full" iconClassName="h-4 w-4" />
            ) : (
              <Icon className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{label}</span>
        {subtitle ? (
          <span className="block truncate text-[11px] text-muted-foreground">{subtitle}</span>
        ) : null}
      </div>
      {isActive ? (
        <Check className="h-4 w-4 shrink-0 text-primary" />
      ) : (
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
      )}
    </CommandItem>
  );
}

export function CommandMenu({ open: controlledOpen, onOpenChange: controlledOnOpenChange }: CommandMenuProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (controlledOnOpenChange) controlledOnOpenChange(next);
      else setInternalOpen(next);
    },
    [controlledOnOpenChange],
  );

  const closeMenu = useCallback(() => handleOpenChange(false), [handleOpenChange]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, handleOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange} shouldFilter={false}>
      {open ? <CommandMenuBody onClose={closeMenu} /> : null}
    </CommandDialog>
  );
}

function CommandMenuBody({ onClose }: { onClose: () => void }) {
  const query = useCommandState((state) => state.search);
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, isAdmin, isWorshipTeam } = useAuth();
  const inbox = useInboxOptional();
  const { setIsPageLoading } = usePageLoading();
  const { chats } = useChats();
  const { allUsers } = useAllUsers();
  const t = translations[currentUser?.preferredLanguage || "en"];

  const handleNavigate = useCallback(
    (path: string) => {
      onClose();
      if (path === "/announcements" && inbox) {
        inbox.openInbox("announcements");
        return;
      }
      if (path === "/notifications" && inbox) {
        inbox.openInbox("notifications");
        return;
      }
      if (pathname !== path) setIsPageLoading(true);
      router.push(path);
    },
    [router, pathname, setIsPageLoading, onClose, inbox],
  );

  const isActivePath = useCallback(
    (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href)),
    [pathname],
  );

  const pageCommands = useMemo((): PageCommand[] => {
    const pages: PageCommand[] = [
      { id: "home", href: "/", label: t.home, icon: Home, keywords: ["dashboard", "main"] },
      {
        id: "reading",
        href: "/bible-checklist",
        label: t.readingPlan,
        icon: BookOpen,
        keywords: ["bible", "checklist", "scripture", "plan"],
      },
      {
        id: "full-plan",
        href: "/full-plan",
        label: t.fullPlan,
        icon: ListChecks,
        keywords: ["bible", "calendar", "schedule", "readings"],
      },
      {
        id: "memorize",
        href: "/memorize",
        label: t.memoryVerses,
        icon: Brain,
        keywords: ["bible", "memory", "verses"],
      },
      {
        id: "leaderboard",
        href: "/leaderboard",
        label: t.communityProgress,
        icon: Trophy,
        keywords: ["progress", "ranking", "stats"],
      },
      { id: "chat", href: "/chat", label: t.chat, icon: MessageCircle, keywords: ["messages", "messenger"], requiresAuth: true },
      {
        id: "docs",
        href: "/docs",
        label: t.docs,
        icon: FileText,
        keywords: ["documents", "docs", "notes", "shared"],
        requiresAuth: true,
      },
      {
        id: "events",
        href: "/events",
        label: t.schedule,
        icon: CalendarCheck,
        keywords: ["calendar", "events", "dates"],
      },
      { id: "qt", href: "/qt", label: t.qtRoster, icon: CalendarCheck, keywords: ["quiet time", "roster"] },
      {
        id: "cleaning",
        href: "/cleaning-roster",
        label: t.cleaningRoster,
        icon: CalendarCheck,
        keywords: ["roster", "duty"],
      },
      {
        id: "custom-rosters",
        href: "/rosters",
        label: t.customRosters,
        icon: CalendarCheck,
        keywords: ["roster", "custom", "schedule"],
      },
      {
        id: "worship",
        href: "/worship",
        label: t.worshipPortal,
        icon: Music,
        keywords: ["songs", "setlist", "roster"],
        requiresAuth: true,
      },
      { id: "media", href: "/media", label: t.links, icon: Library, keywords: ["links", "resources", "media"] },
      { id: "members", href: "/members", label: t.members, icon: Users, keywords: ["people", "directory"] },
      {
        id: "prayer",
        href: "/prayer-requests",
        label: t.prayerRequests,
        icon: HeartHandshake,
        keywords: ["prayer", "requests"],
        requiresAuth: true,
      },
      { id: "feedback", href: "/feedback", label: t.feedback, icon: Lightbulb, keywords: ["changelog", "ideas", "bugs"] },
      {
        id: "announcements",
        href: "/announcements",
        label: t.announcements,
        icon: Megaphone,
        keywords: ["broadcast", "news"],
      },
    ];

    return pages.filter((page) => {
      if (page.requiresAuth && !currentUser) return false;
      if (page.requiresAdmin && !isAdmin) return false;
      if (page.requiresWorship && !isAdmin && !isWorshipTeam) return false;
      return true;
    });
  }, [t, currentUser, isAdmin, isWorshipTeam]);

  const settingsCommands = useMemo((): PageCommand[] => {
    const items: PageCommand[] = [
      {
        id: "profile",
        href: "/profile",
        label: t.myProfile,
        icon: User,
        keywords: ["settings", "account", "me"],
        requiresAuth: true,
      },
      {
        id: "notifications",
        href: "/notifications",
        label: t.notifications,
        icon: Bell,
        keywords: ["alerts", "inbox"],
        requiresAuth: true,
      },
    ];
    if (isAdmin) {
      items.push({
        id: "admin",
        href: "/admin",
        label: t.admin,
        icon: Shield,
        keywords: ["settings", "manage"],
        requiresAdmin: true,
      });
    }
    return items.filter((item) => {
      if (item.requiresAuth && !currentUser) return false;
      if (item.requiresAdmin && !isAdmin) return false;
      return true;
    });
  }, [t, currentUser, isAdmin]);

  const chatItems = useMemo(() => {
    if (!currentUser) return [];
    const activeApp = resolveActiveApp(pathname);
    const chatApp = activeApp === 'ndcpc' ? 'ndcpc' : 'cell';
    return [...chats]
      .filter((chat) => chatBelongsToApp(chat, chatApp))
      .sort((a, b) => chatLastActivityMs(b) - chatLastActivityMs(a))
      .map((chat) => {
        const details = getChatDisplayDetails(chat, currentUser.uid, allUsers);
        const name = details?.name ?? (chat.type === "group" ? chat.name || "Group Chat" : "Private Chat");
        const preview = chat.lastMessageText || "";
        const peerId = chat.type === "private" ? chat.members.find((id) => id !== currentUser.uid) : null;
        return {
          id: chat.id,
          name,
          preview,
          href: chatHrefForApp(chat.id, chatApp),
          avatarData: details?.avatar ?? (peerId ? chat.memberInfo?.[peerId]?.avatar : null),
          photoURL: chat.photoURL || null,
          isGroup: chat.type === "group",
          searchValue: `${name} ${preview} ${chat.id}`.toLowerCase(),
        };
      });
  }, [chats, currentUser, allUsers, pathname]);

  const normalizedQuery = normalizeSearchQuery(query);
  const showMemberResults = normalizedQuery.length >= 2;

  const memberItems = useMemo(() => {
    if (!showMemberResults) return [];
    return allUsers
      .filter((user) => {
        const name = formatUserDisplayName(user);
        return matchesSearchQuery(normalizedQuery, name, user.email, user.firstName, user.lastName);
      })
      .slice(0, 8)
      .map((user) => ({
        id: user.uid,
        name: formatUserDisplayName(user),
        email: user.email ?? "",
        avatar: user.avatar,
      }));
  }, [allUsers, normalizedQuery, showMemberResults]);

  const visibleChatItems = useMemo(() => {
    if (!normalizedQuery) return chatItems.slice(0, 6);
    return chatItems
      .filter((chat) => matchesSearchQuery(normalizedQuery, chat.name, chat.preview))
      .slice(0, 12);
  }, [chatItems, normalizedQuery]);

  const filterPages = useCallback(
    (pages: PageCommand[]) =>
      pages.filter((page) =>
        matchesSearchQuery(normalizedQuery, page.label, page.id, ...page.keywords),
      ),
    [normalizedQuery],
  );

  const visiblePages = filterPages(pageCommands);
  const visibleSettings = filterPages(settingsCommands);

  return (
    <>
      <CommandInput placeholder={t.searchPrompt || "Search pages, people, chats…"} />
      <CommandList className="max-h-[70vh]">
        <CommandEmpty>
          <Search className="mb-1 h-8 w-8 text-muted-foreground/30" />
          <span>{t.noResults || "No results found."}</span>
          {normalizedQuery.length === 1 && (
            <span className="text-xs text-muted-foreground/70">Type another letter to search members</span>
          )}
        </CommandEmpty>

        {visiblePages.length > 0 && (
          <CommandGroup heading={t.navigation || "Go to"}>
            {visiblePages.map((page) => (
              <CommandItem
                key={page.id}
                value={`${page.label} ${page.keywords.join(" ")}`}
                keywords={page.keywords}
                onSelect={() => handleNavigate(page.href)}
                className="flex items-center gap-3 p-3 cursor-pointer"
              >
                <page.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-sm font-medium">{page.label}</span>
                {isActivePath(page.href) ? (
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {visibleChatItems.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={normalizedQuery ? t.chat : t.recentChatsHeading}>
              {visibleChatItems.map((chat) => (
                <CommandRow
                  key={chat.id}
                  value={chat.searchValue}
                  icon={chat.isGroup ? Users : User}
                  label={chat.name}
                  subtitle={chat.preview || undefined}
                  isActive={pathname === chat.href}
                  onSelect={() => handleNavigate(chat.href)}
                  avatar={
                    <div className="h-9 w-9 overflow-hidden rounded-full border border-border/40">
                      <GroupChatAvatar
                        avatar={chat.avatarData}
                        photoURL={chat.photoURL}
                        className="!h-full !w-full"
                        iconClassName="h-4 w-4"
                      />
                    </div>
                  }
                />
              ))}
              {!normalizedQuery && chatItems.length > 6 && (
                <CommandItem
                  value={`${t.allConversations} chats messages`}
                  onSelect={() => handleNavigate("/chat")}
                  className="flex items-center gap-3 p-3 cursor-pointer opacity-70"
                >
                  <Search className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-sm font-medium">{t.allConversations}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                </CommandItem>
              )}
            </CommandGroup>
          </>
        )}

        {showMemberResults && memberItems.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t.members}>
              {memberItems.map((member) => (
                <CommandRow
                  key={member.id}
                  value={`${member.name} ${member.email}`.toLowerCase()}
                  icon={User}
                  label={member.name}
                  subtitle={member.email || undefined}
                  isActive={pathname === `/members/${member.id}`}
                  onSelect={() => handleNavigate(`/members/${member.id}`)}
                  avatar={
                    <div className="h-9 w-9 overflow-hidden rounded-full border border-border/40">
                      <PixelAvatar avatar={member.avatar} className="h-9 w-9" />
                    </div>
                  }
                />
              ))}
            </CommandGroup>
          </>
        )}

        {visibleSettings.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t.system || "Settings"}>
              {visibleSettings.map((page) => (
                <CommandItem
                  key={page.id}
                  value={`${page.label} ${page.keywords.join(" ")}`}
                  keywords={page.keywords}
                  onSelect={() => handleNavigate(page.href)}
                  className={cn(
                    "flex items-center gap-3 p-3 cursor-pointer",
                    page.id === "admin" && "text-primary",
                  )}
                >
                  {page.id === "admin" ? (
                    <Sparkles className="h-4 w-4 shrink-0" />
                  ) : (
                    <page.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="flex-1 truncate text-sm font-medium">{page.label}</span>
                  {isActivePath(page.href) ? (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </>
  );
}
