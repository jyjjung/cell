"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from "@/components/ui/command";
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  MessageSquare,
  Bell,
  User,
  Search,
  ArrowRight,
  Sparkles,
  Users
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { usePageLoading } from "@/contexts/page-loading-context";
import { useChats } from "@/hooks/useChats";
import { useAllUsers } from "@/hooks/use-all-users";
import { translations } from "@/lib/translations";
import { GroupChatAvatar } from "@/components/chat/GroupChatAvatar";
import { formatUserDisplayName } from "@/lib/formatting";

interface CommandMenuProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CommandMenu({ open: controlledOpen, onOpenChange: controlledOnOpenChange }: CommandMenuProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser } = useAuth();
  const { setIsPageLoading } = usePageLoading();
  const { chats } = useChats();
  const { allUsers } = useAllUsers();
  const t = translations[currentUser?.preferredLanguage || 'en'];

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, setOpen]);

  const handleNavigate = useCallback(
    (path: string) => {
      setOpen(false);
      // Trigger the global loader immediately for better UX
      if (pathname !== path) {
        setIsPageLoading(true);
      }
      router.push(path);
    },
    [router, setOpen, pathname, setIsPageLoading]
  );

  const usersMap = useMemo(() => new Map(allUsers.map(u => [u.uid, u])), [allUsers]);

  const chatItems = useMemo(() => {
    if (!currentUser) return [];
    return chats.slice(0, 8).map(chat => {
      if (chat.type === 'private') {
        const peerId = chat.members.find(id => id !== currentUser.uid);
        const peer = peerId ? usersMap.get(peerId) : null;
        const peerInfo = peerId ? chat.memberInfo?.[peerId] : null;
        const name = peer
          ? formatUserDisplayName(peer)
          : peerInfo
            ? formatUserDisplayName(peerInfo, 'Private Chat')
            : 'Private Chat';
        return {
          id: chat.id,
          name,
          preview: chat.lastMessageText || '',
          avatarData: peer?.avatar ?? peerInfo?.avatar ?? null,
          isGroup: false,
        };
      }
      return {
        id: chat.id,
        name: chat.name || 'Group Chat',
        preview: chat.lastMessageText || '',
        avatarData: null,
        photoURL: chat.photoURL || null,
        isGroup: true,
      };
    });
  }, [chats, currentUser, usersMap]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={t.searchPrompt || "Type a command or search..."} />
      <CommandList className="max-h-[70vh]">
        <CommandEmpty>
          <Search className="h-8 w-8 text-black/10 dark:text-white/10 mb-1" />
          <span>{t.noResults || "No results found."}</span>
        </CommandEmpty>

        <CommandGroup heading={t.navigation || "Navigation"}>
          <CommandItem 
            value="dashboard home" 
            onSelect={() => handleNavigate("/")}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleNavigate("/"); }}
            className="flex items-center gap-3 p-3 cursor-pointer [&_*]:pointer-events-none"
          >
            <LayoutDashboard className="h-4 w-4 opacity-70 shrink-0" />
            <span className="font-bold uppercase tracking-wider text-[10px] text-foreground/80 flex-1">
                {t.dashboard}
            </span>
            <ArrowRight className="h-3 w-3 opacity-30 shrink-0 transition-transform duration-200 group-data-[selected=true]:translate-x-1" />
          </CommandItem>
          
          <CommandItem 
            value="bible reading plan checklist scroll" 
            onSelect={() => handleNavigate("/bible-checklist")}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleNavigate("/bible-checklist"); }}
            className="flex items-center gap-3 p-3 cursor-pointer [&_*]:pointer-events-none"
          >
            <BookOpen className="h-4 w-4 opacity-70 shrink-0" />
            <span className="font-bold uppercase tracking-wider text-[10px] text-foreground/80 flex-1">
                {t.biblePlan}
            </span>
            <ArrowRight className="h-3 w-3 opacity-30 shrink-0 transition-transform duration-200 group-data-[selected=true]:translate-x-1" />
          </CommandItem>

          <CommandItem 
            value="calendar events schedule" 
            onSelect={() => handleNavigate("/events")}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleNavigate("/events"); }}
            className="flex items-center gap-3 p-3 cursor-pointer [&_*]:pointer-events-none"
          >
            <Calendar className="h-4 w-4 opacity-70 shrink-0" />
            <span className="font-bold uppercase tracking-wider text-[10px] text-foreground/80 flex-1">
                {t.calendar}
            </span>
            <ArrowRight className="h-3 w-3 opacity-30 shrink-0 transition-transform duration-200 group-data-[selected=true]:translate-x-1" />
          </CommandItem>

          <CommandItem 
            value="chat messenger messages" 
            onSelect={() => handleNavigate("/chat")}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleNavigate("/chat"); }}
            className="flex items-center gap-3 p-3 cursor-pointer [&_*]:pointer-events-none"
          >
            <MessageSquare className="h-4 w-4 opacity-70 shrink-0" />
            <span className="font-bold uppercase tracking-wider text-[10px] text-foreground/80 flex-1">
                {t.messenger}
            </span>
            <ArrowRight className="h-3 w-3 opacity-30 shrink-0 transition-transform duration-200 group-data-[selected=true]:translate-x-1" />
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {chatItems.length > 0 && (
          <CommandGroup heading="Recent Chats">
            {chatItems.map(chat => (
              <CommandItem
                key={chat.id}
                value={`${chat.name} ${chat.preview} ${chat.id}`.toLowerCase().trim()}
                onSelect={() => handleNavigate(`/chat/${chat.id}`)}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleNavigate(`/chat/${chat.id}`); }}
                className="flex items-center gap-3 p-3 cursor-pointer [&_*]:pointer-events-none"
              >
                {/* Avatar */}
                <div className="relative h-10 w-10 shrink-0">
                    <div className="h-full w-full rounded-full border border-border/40 bg-primary/5 flex items-center justify-center overflow-hidden">
                    {chat.avatarData || chat.photoURL ? (
                        <GroupChatAvatar
                          avatar={chat.avatarData}
                          photoURL={chat.photoURL}
                          className="!w-full !h-full"
                          iconClassName="h-4 w-4"
                        />
                    ) : chat.isGroup ? (
                        <Users className="h-4 w-4 text-primary/50" />
                    ) : (
                        <User className="h-4 w-4 text-primary/50" />
                    )}
                    </div>
                </div>

                {/* Text */}
                <div className="flex flex-col min-w-0 flex-1 ml-1">
                    <span className="font-bold text-sm tracking-tight truncate">{chat.name}</span>
                    {chat.preview && (
                        <span className="text-[11px] text-muted-foreground/60 truncate font-medium mt-0.5">
                            {chat.preview}
                        </span>
                    )}
                </div>

                <ArrowRight className="h-4 w-4 opacity-30 shrink-0 transition-transform duration-200 group-data-[selected=true]:translate-x-1" />
              </CommandItem>
            ))}

            <CommandItem 
              value="all conversations chats"
              onSelect={() => handleNavigate("/chat")}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleNavigate("/chat"); }}
              className="flex items-center gap-3 p-3 cursor-pointer opacity-60 [&_*]:pointer-events-none"
            >
                <Search className="h-4 w-4 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/80 flex-1">
                    All conversations
                </span>
                <ArrowRight className="h-3 w-3 opacity-30 shrink-0 transition-transform duration-200 group-data-[selected=true]:translate-x-1" />
            </CommandItem>
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading={t.system || "Settings & System"}>
          <CommandItem 
            value="profile settings me"
            onSelect={() => handleNavigate("/profile")}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleNavigate("/profile"); }}
            className="flex items-center gap-3 p-3 cursor-pointer [&_*]:pointer-events-none"
          >
            <User className="h-4 w-4 opacity-70 shrink-0" />
            <span className="font-bold uppercase tracking-wider text-[10px] text-foreground/80 flex-1">
                {t.myProfile}
            </span>
            <ArrowRight className="h-3 w-3 opacity-30 shrink-0 transition-transform duration-200 group-data-[selected=true]:translate-x-1" />
          </CommandItem>

          <CommandItem 
            value="notifications alerts"
            onSelect={() => handleNavigate("/notifications")}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleNavigate("/notifications"); }}
            className="flex items-center gap-3 p-3 cursor-pointer [&_*]:pointer-events-none"
          >
            <Bell className="h-4 w-4 opacity-70 shrink-0" />
            <span className="font-bold uppercase tracking-wider text-[10px] text-foreground/80 flex-1">
                {t.notifications}
            </span>
            <ArrowRight className="h-3 w-3 opacity-30 shrink-0 transition-transform duration-200 group-data-[selected=true]:translate-x-1" />
          </CommandItem>

          {currentUser?.isAdmin && (
            <CommandItem 
              value="admin administrative core panel"
              onSelect={() => handleNavigate("/admin")}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleNavigate("/admin"); }}
              className="flex items-center gap-3 p-3 cursor-pointer text-primary [&_*]:pointer-events-none"
            >
                <Sparkles className="h-4 w-4 shrink-0" />
                <span className="font-black uppercase tracking-wider text-[10px] text-primary/90 flex-1">
                    Admin
                </span>
                <ArrowRight className="h-3 w-3 opacity-30 shrink-0 transition-transform duration-200 group-data-[selected=true]:translate-x-1" />
            </CommandItem>
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
