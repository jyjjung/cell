"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/auth-context";
import { useInboxOptional } from "@/contexts/inbox-context";
import { useNotifications } from "@/hooks/use-notifications";
import { toMillisSafe } from "@/lib/firestore-timestamp";
import {
  NOTIFICATION_UNREAD_LOOKBACK_DAYS,
  countUnreadNotificationsForUser,
} from "@/lib/notification-visibility";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";
import { Bell, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Breadcrumbs } from "./breadcrumbs";
import { ThemeToggle } from "./theme-toggle";

interface HeaderProps {
  onOpenCommandMenu?: () => void;
  /** When true, header stays in the flex column instead of sticky document scroll. */
  pinStatic?: boolean;
}

export default function Header({ onOpenCommandMenu, pinStatic = false }: HeaderProps) {
  const { currentUser } = useAuth();
  const { notifications } = useNotifications();
  const inbox = useInboxOptional();
  const [mounted, setMounted] = useState(false);
  const t = translations[currentUser?.preferredLanguage || "en"];

  useEffect(() => { setMounted(true); }, []);

  const totalUnread = useMemo(() => {
    if (!currentUser || !mounted) return 0;
    const lookbackMs = Date.now() - NOTIFICATION_UNREAD_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
    const recent = notifications.filter((n) => toMillisSafe(n.createdAt) >= lookbackMs);
    return countUnreadNotificationsForUser(recent, currentUser.uid);
  }, [notifications, currentUser, mounted]);

  return (
    <header
      className={cn('z-40 w-full shrink-0', !pinStatic && 'sticky top-0')}
      style={pinStatic ? { touchAction: 'none' } : undefined}
    >
      <div className="app-header-bar">
        <div className="flex min-w-0 items-center gap-2">
          <SidebarTrigger />
          <div className="min-w-0 overflow-visible pr-1">
            <Breadcrumbs />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {onOpenCommandMenu && (
            <button
              id="header-search-pill"
              onClick={onOpenCommandMenu}
              className="group flex h-9 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
              aria-label="Open command menu"
            >
              <Search className="h-4 w-4 md:h-3.5 md:w-3.5" />
              <span className="hidden text-xs font-medium md:inline">{t.quickSearch}</span>
              <kbd className="ml-1 hidden rounded-md border border-border/60 bg-background/80 px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground lg:inline-flex">
                ⌘K
              </kbd>
            </button>
          )}

          {currentUser && inbox && (
            <div className="relative">
              <button
                id="header-notification-bell"
                type="button"
                onClick={() => {
                  const lookbackMs = Date.now() - NOTIFICATION_UNREAD_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
                  const recent = notifications.filter((n) => toMillisSafe(n.createdAt) >= lookbackMs);
                  const uid = currentUser.uid;
                  const hasUnreadAnn = recent.some(
                    (n) => n.type === 'announcement' && !(n.readBy || []).includes(uid),
                  );
                  const hasUnreadNotif = recent.some(
                    (n) => n.type !== 'announcement' && !(n.readBy || []).includes(uid),
                  );
                  if (hasUnreadAnn) inbox.openInbox('announcements');
                  else if (hasUnreadNotif) inbox.openInbox('notifications');
                  else inbox.openInbox(inbox.tab);
                }}
                aria-label={`Inbox${totalUnread > 0 ? ` (${totalUnread} unread)` : ""}`}
                aria-expanded={inbox.isOpen}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                  inbox.isOpen
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
              >
                <Bell className="h-4 w-4" />
              </button>

              {totalUnread > 0 && (
                <span
                  className={cn(
                    "pointer-events-none absolute -right-0.5 -top-0.5 flex items-center justify-center rounded-full border-2 border-background bg-primary font-bold leading-none text-primary-foreground",
                    totalUnread > 9 ? "h-5 w-5 text-[8px]" : "h-4 w-4 text-[9px]"
                  )}
                >
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </div>
          )}

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
