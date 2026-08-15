"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/auth-context";
import { useInboxOptional } from "@/contexts/inbox-context";
import { useNdcpcUnread } from "@/contexts/ndcpc-unread-context";
import { useNotifications } from "@/hooks/use-notifications";
import { resolveActiveApp } from "@/lib/app-access";
import { toMillisSafe } from "@/lib/firestore-timestamp";
import {
  NOTIFICATION_UNREAD_LOOKBACK_DAYS,
  countUnreadNotificationsForUser,
} from "@/lib/notification-visibility";
import { cn } from "@/lib/utils";
import { Bell } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ThemeToggle } from "./theme-toggle";
import { AppSwitcher } from "@/components/shell/app-switcher";

interface HeaderProps {
  /** When true, header stays in the flex column instead of sticky document scroll. */
  pinStatic?: boolean;
}

export default function Header({ pinStatic = false }: HeaderProps) {
  const { currentUser } = useAuth();
  const { notifications } = useNotifications();
  const ndcpcUnread = useNdcpcUnread();
  const inbox = useInboxOptional();
  const pathname = usePathname();
  const activeApp = resolveActiveApp(pathname);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const cellUnread = useMemo(() => {
    if (!currentUser || !mounted || activeApp !== 'cell') return 0;
    const lookbackMs = Date.now() - NOTIFICATION_UNREAD_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
    const recent = notifications.filter((n) => toMillisSafe(n.createdAt) >= lookbackMs);
    return countUnreadNotificationsForUser(recent, currentUser.uid);
  }, [notifications, currentUser, mounted, activeApp]);

  const ndcpcInboxUnread = useMemo(() => {
    if (!currentUser || !mounted || activeApp !== 'ndcpc') return 0;
    return ndcpcUnread.announcementsUnread + ndcpcUnread.prayerUnread;
  }, [currentUser, mounted, activeApp, ndcpcUnread.announcementsUnread, ndcpcUnread.prayerUnread]);

  const totalUnread = activeApp === 'ndcpc' ? ndcpcInboxUnread : cellUnread;

  const openInbox = () => {
    if (!inbox || !currentUser) return;

    if (activeApp === 'ndcpc') {
      if (ndcpcUnread.announcementsUnread > 0) inbox.openInbox('announcements');
      else if (ndcpcUnread.prayerUnread > 0) inbox.openInbox('prayer');
      else inbox.openInbox(inbox.tab === 'notifications' ? 'prayer' : inbox.tab);
      return;
    }

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
    else inbox.openInbox(inbox.tab === 'prayer' ? 'announcements' : inbox.tab);
  };

  const showBell = Boolean(currentUser && inbox && (activeApp === 'cell' || activeApp === 'ndcpc'));

  return (
    <header
      className={cn('z-40 w-full shrink-0', !pinStatic && 'sticky top-0')}
      style={pinStatic ? { touchAction: 'none' } : undefined}
    >
      <div className="app-header-bar">
        <div className="flex min-w-0 items-center justify-self-start">
          <SidebarTrigger className="md:hidden" />
        </div>

        <div className="justify-self-center">
          <AppSwitcher />
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 justify-self-end">
          {showBell && inbox ? (
            <div className="relative">
              <button
                id="header-notification-bell"
                type="button"
                onClick={openInbox}
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
          ) : null}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
