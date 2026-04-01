"use client";

import React, { useEffect, useState, useCallback } from "react";
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
  Settings, 
  User, 
  Search, 
  ArrowRight,
  Sparkles
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useAllUsers } from "@/hooks/use-all-users";
import { usePageLoading } from "@/contexts/page-loading-context";
import { translations } from "@/lib/translations";
import { PixelAvatar } from "@/components/avatar/PixelAvatar";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { currentUser } = useAuth();
  const { allUsers } = useAllUsers();
  const { setIsPageLoading } = usePageLoading();
  const t = translations[currentUser?.preferredLanguage || 'en'];

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  const handleNavigate = useCallback((path: string) => {
    runCommand(() => {
      setIsPageLoading(true);
      router.push(path);
    });
  }, [router, setIsPageLoading, runCommand]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={t.searchPrompt || "Type a command or search..."} />
      <CommandList className="max-h-[70vh]">
        <CommandEmpty>{t.noResults || "No results found."}</CommandEmpty>
        
        <CommandGroup heading={t.navigation || "Navigation"}>
          <CommandItem onSelect={() => handleNavigate("/")} className="gap-3 p-3">
            <LayoutDashboard className="h-4 w-4 opacity-70" />
            <span className="font-bold uppercase tracking-widest text-[10px]">{t.dashboard}</span>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate("/bible-checklist")} className="gap-3 p-3">
            <BookOpen className="h-4 w-4 opacity-70" />
            <span className="font-bold uppercase tracking-widest text-[10px]">{t.biblePlan}</span>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate("/events")} className="gap-3 p-3">
            <Calendar className="h-4 w-4 opacity-70" />
            <span className="font-bold uppercase tracking-widest text-[10px]">{t.calendar}</span>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate("/chat")} className="gap-3 p-3">
            <MessageSquare className="h-4 w-4 opacity-70" />
            <span className="font-bold uppercase tracking-widest text-[10px]">{t.messenger}</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t.members || "Community Members"}>
          {allUsers.filter(u => u.uid !== currentUser?.uid).slice(0, 10).map(user => (
            <CommandItem 
                key={user.uid} 
                onSelect={() => handleNavigate(`/profile/${user.uid}`)}
                className="gap-4 p-3"
            >
              <div className="h-8 w-8 rounded-lg overflow-hidden shrink-0 border border-white/5">
                <PixelAvatar avatar={user.avatar} className="w-full h-full" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-xs tracking-tight uppercase">{user.firstName} {user.lastName}</span>
                <span className="text-[9px] font-medium opacity-40 uppercase tracking-widest">
                  {user.isAdmin ? 'Administrator' : (t.member || 'Member')}
                </span>
              </div>
              <ArrowRight className="ml-auto h-3 w-3 opacity-30" />
            </CommandItem>
          ))}
          <CommandItem onSelect={() => handleNavigate("/members")} className="gap-3 p-3 opacity-60">
            <Search className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Search all members</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t.system || "Settings & System"}>
          <CommandItem onSelect={() => handleNavigate("/profile")} className="gap-3 p-3">
            <User className="h-4 w-4 opacity-70" />
            <span className="font-bold uppercase tracking-widest text-[10px]">{t.myProfile}</span>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate("/notifications")} className="gap-3 p-3">
            <Bell className="h-4 w-4 opacity-70" />
            <span className="font-bold uppercase tracking-widest text-[10px]">{t.notifications}</span>
          </CommandItem>
          {currentUser?.isAdmin && (
            <CommandItem onSelect={() => handleNavigate("/admin")} className="gap-3 p-3 text-primary">
              <Sparkles className="h-4 w-4" />
              <span className="font-black uppercase tracking-widest text-[10px]">Administrative Core</span>
            </CommandItem>
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
