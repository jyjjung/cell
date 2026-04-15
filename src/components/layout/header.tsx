"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Breadcrumbs } from "./breadcrumbs";
import { ThemeToggle } from "./theme-toggle";
import { Bell, Search, Megaphone, Check, CheckCheck, X, ArrowRight } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { useChats } from "@/hooks/useChats";
import { useAuth } from "@/contexts/auth-context";
import { useMemo, useState, useEffect, useRef } from "react";
import { isChatUnread } from "@/lib/notification-utils";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { LinkifiedText } from "@/components/ui/linkified-text";

interface HeaderProps {
  onOpenCommandMenu?: () => void;
}

export default function Header({ onOpenCommandMenu }: HeaderProps) {
  const { currentUser } = useAuth();
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const { chats } = useChats();
  const [mounted, setMounted] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'announcements' | 'notifications'>('announcements');
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);

  // Close on outside click
  useEffect(() => {
    if (!panelOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [panelOpen]);

  // Close on Escape
  useEffect(() => {
    if (!panelOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPanelOpen(false); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [panelOpen]);

  const uid = currentUser?.uid || "";

  const announcements = useMemo(
    () => notifications.filter(n => n.type === "announcement")
      .sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return tb - ta;
      }),
    [notifications]
  );

  const unreadAnnouncements = useMemo(
    () => announcements.filter(n => !(n.readBy || []).includes(uid)),
    [announcements, uid]
  );

  const generalNotifications = useMemo(
    () => notifications.filter(n => n.type !== "announcement")
      .sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return tb - ta;
      }),
    [notifications]
  );

  const unreadGeneralNotifications = useMemo(
    () => generalNotifications.filter(n => !(n.readBy || []).includes(uid)),
    [generalNotifications, uid]
  );

  const totalUnread = useMemo(() => {
    if (!currentUser || !mounted) return 0;
    const unreadAlerts = notifications.filter(n => {
      const readBy = Array.isArray(n.readBy) ? n.readBy : [];
      return !readBy.includes(currentUser.uid);
    }).length;
    const unreadChats = chats.filter(chat => isChatUnread(chat, currentUser.uid)).length;
    return unreadAlerts + unreadChats;
  }, [notifications, chats, currentUser, mounted]);

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="flex h-14 items-center justify-between gap-3 px-3 md:px-4 bg-background/70 backdrop-blur-xl border-b border-border/40 shadow-sm shadow-black/[0.03]">
        {/* Left: trigger + breadcrumbs */}
        <div className="flex items-center gap-2 min-w-0">
          <SidebarTrigger className="h-9 w-9 rounded-xl shrink-0 hover:bg-muted/70 transition-colors" />
          <div className="hidden sm:block overflow-hidden">
            <Breadcrumbs />
          </div>
        </div>

        {/* Right: search pill + bell + theme */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick-search pill — visible on all devices now */}
          {onOpenCommandMenu && (
            <button
              id="header-search-pill"
              onClick={onOpenCommandMenu}
              className="flex items-center gap-2 h-8 px-2.5 md:px-3 rounded-xl bg-muted/60 hover:bg-muted border border-border/50 hover:border-border/80 transition-all text-muted-foreground hover:text-foreground group"
              aria-label="Open command menu"
            >
              <Search className="h-4 w-4 md:h-3.5 md:w-3.5" />
              <span className="hidden md:inline text-xs font-medium">Quick search</span>
              <kbd className="hidden lg:inline-flex ml-1 text-[10px] font-mono bg-background/80 text-muted-foreground px-1.5 py-0.5 rounded-md border border-border/60 leading-none">
                ⌘K
              </kbd>
            </button>
          )}

          {/* Notification bell + dropdown */}
          {currentUser && (
            <div className="relative" ref={panelRef}>
              <button
                id="header-notification-bell"
                onClick={() => setPanelOpen(v => !v)}
                aria-label={`Alerts${totalUnread > 0 ? ` (${totalUnread} unread)` : ""}`}
                aria-expanded={panelOpen}
                className={cn(
                  "h-9 w-9 rounded-xl flex items-center justify-center transition-colors",
                  panelOpen
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted/70 text-muted-foreground hover:text-foreground"
                )}
              >
                <Bell className="h-4 w-4" />
              </button>

              {/* Unread badge */}
              {totalUnread > 0 && (
                <span
                  className={cn(
                    "absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full bg-primary text-primary-foreground font-bold leading-none border-2 border-background pointer-events-none",
                    totalUnread > 9 ? "h-5 w-5 text-[8px]" : "h-4 w-4 text-[9px]"
                  )}
                >
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}

              {/* Dropdown panel */}
              <AnimatePresence>
                {panelOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -6 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute right-0 top-full mt-2 w-[340px] sm:w-[380px] rounded-2xl border border-border/50 bg-background/95 backdrop-blur-2xl shadow-2xl shadow-black/10 overflow-hidden z-50"
                    role="dialog"
                    aria-label="Alerts panel"
                  >
                    {/* Panel Tabs */}
                    <div className="flex items-center p-1.5 border-b border-border/30 gap-1 bg-muted/10">
                      <button onClick={() => setActiveTab('announcements')} className={cn("flex-1 py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all", activeTab === 'announcements' ? "bg-background text-foreground shadow-sm shadow-black/5" : "text-muted-foreground hover:bg-muted/50")}>
                        <Megaphone className={cn("h-3.5 w-3.5", activeTab === 'announcements' && "text-orange-500")} /> Announcements
                        {unreadAnnouncements.length > 0 && <span className={cn("px-1.5 rounded-full text-[9px] leading-[14px]", activeTab === 'announcements' ? "bg-orange-500 text-white" : "bg-muted-foreground/20 text-foreground")}>{unreadAnnouncements.length}</span>}
                      </button>
                      <button onClick={() => setActiveTab('notifications')} className={cn("flex-1 py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all", activeTab === 'notifications' ? "bg-background text-foreground shadow-sm shadow-black/5" : "text-muted-foreground hover:bg-muted/50")}>
                        <Bell className={cn("h-3.5 w-3.5", activeTab === 'notifications' && "text-primary")} /> Notifications
                        {unreadGeneralNotifications.length > 0 && <span className={cn("px-1.5 rounded-full text-[9px] leading-[14px]", activeTab === 'notifications' ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20 text-foreground")}>{unreadGeneralNotifications.length}</span>}
                      </button>
                    </div>

                    {/* Specific Sub-header */}
                    {activeTab === 'announcements' && unreadAnnouncements.length > 0 && (
                      <div className="flex justify-end px-4 py-1.5 border-b border-border/20 bg-muted/5">
                        <button
                          onClick={() => markAllAsRead(unreadAnnouncements.map(n => n.id))}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors uppercase tracking-widest"
                        >
                          <CheckCheck className="h-3 w-3" />
                          Mark all read
                        </button>
                      </div>
                    )}
                    {activeTab === 'notifications' && unreadGeneralNotifications.length > 0 && (
                      <div className="flex justify-end px-4 py-1.5 border-b border-border/20 bg-muted/5">
                        <button
                          onClick={() => markAllAsRead(unreadGeneralNotifications.map(n => n.id))}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors uppercase tracking-widest"
                        >
                          <CheckCheck className="h-3 w-3" />
                          Mark all read
                        </button>
                      </div>
                    )}

                    {/* Content List */}
                    <div className="max-h-[420px] overflow-y-auto overscroll-contain">
                      {activeTab === 'announcements' ? (
                        announcements.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-6">
                              <div className="p-3 rounded-xl bg-orange-500/10">
                                <Megaphone className="h-6 w-6 text-orange-500" />
                              </div>
                              <p className="text-sm font-semibold text-foreground">No announcements yet</p>
                              <p className="text-xs text-muted-foreground">Community updates will appear here.</p>
                            </div>
                        ) : (
                          <AnimatePresence initial={false}>
                            {announcements.slice(0, 8).map((n, i) => {
                              const isRead = (n.readBy || []).includes(uid);
                              return (
                                <motion.div
                                  key={n.id}
                                  layout
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, x: 20 }}
                                  transition={{ delay: i * 0.03, duration: 0.2 }}
                                  className={cn(
                                    "flex items-start gap-3 px-4 py-3.5 border-b border-border/20 last:border-0 transition-colors cursor-pointer",
                                    isRead ? "opacity-60 hover:opacity-100" : "hover:bg-muted/30"
                                  )}
                                  onClick={() => { setPanelOpen(false); router.push("/announcements"); }}
                                >
                                  {/* Unread dot */}
                                  <div className={cn(
                                    "mt-1.5 h-2 w-2 rounded-full shrink-0",
                                    isRead ? "bg-muted-foreground/20" : "bg-orange-500 animate-pulse"
                                  )} />

                                  {/* Content */}
                                  <div className="flex-1 min-w-0 space-y-0.5">
                                    <p className={cn("text-sm font-bold leading-snug truncate", isRead ? "text-muted-foreground" : "text-foreground")}>
                                      {n.title}
                                    </p>
                                    <LinkifiedText
                                      text={n.message}
                                      className="block text-xs text-muted-foreground leading-relaxed line-clamp-2"
                                    />
                                    <p className="text-[10px] text-muted-foreground/50 font-semibold pt-1">
                                      {n.createdAt ? formatDistanceToNow(n.createdAt?.toDate?.() || new Date(n.createdAt), { addSuffix: true }) : "Just now"}
                                    </p>
                                  </div>

                                  {/* Dismiss button */}
                                  {!isRead && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                                      className="mt-0.5 h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-orange-500 hover:bg-orange-500/10 transition-colors shrink-0"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        )
                      ) : (
                        generalNotifications.length === 0 ? (
                           <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-6">
                              <div className="p-3 rounded-xl bg-primary/10">
                                <Bell className="h-6 w-6 text-primary" />
                              </div>
                              <p className="text-sm font-semibold text-foreground">No notifications yet</p>
                              <p className="text-xs text-muted-foreground">Your activity feed will appear here.</p>
                            </div>
                        ) : (
                          <AnimatePresence initial={false}>
                            {generalNotifications.slice(0, 8).map((n, i) => {
                              const isRead = (n.readBy || []).includes(uid);
                              return (
                                <motion.div
                                  key={n.id}
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.03, duration: 0.2 }}
                                  className={cn(
                                    "flex items-start gap-3 px-4 py-3.5 border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group",
                                    isRead ? "opacity-60 hover:opacity-100" : ""
                                  )}
                                  onClick={() => { setPanelOpen(false); router.push("/notifications"); }}
                                >
                                  {/* Unread dot */}
                                  <div className={cn(
                                    "mt-1.5 h-2 w-2 rounded-full shrink-0",
                                    isRead ? "bg-muted-foreground/20" : "bg-primary animate-pulse"
                                  )} />

                                  {/* Content */}
                                  <div className="flex-1 min-w-0 space-y-0.5">
                                    <p className={cn("text-sm font-bold leading-snug truncate", isRead ? "text-muted-foreground" : "text-foreground")}>
                                      {n.title}
                                    </p>
                                    <LinkifiedText
                                      text={n.message}
                                      className="block text-xs text-muted-foreground leading-relaxed line-clamp-2"
                                    />
                                    <p className="text-[10px] text-muted-foreground/50 font-semibold pt-1">
                                      {n.createdAt ? formatDistanceToNow(n.createdAt?.toDate?.() || new Date(n.createdAt), { addSuffix: true }) : "Just now"}
                                    </p>
                                  </div>

                                  {/* Dismiss button */}
                                  {!isRead && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                                      className="mt-0.5 h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        )
                      )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-border/30 px-3 py-2 bg-muted/5">
                      <button
                        onClick={() => { setPanelOpen(false); router.push(activeTab === 'announcements' ? "/announcements" : "/notifications"); }}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-primary hover:bg-primary/10 transition-colors"
                      >
                        {activeTab === 'announcements' ? "View all announcements" : "View all notifications"}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
