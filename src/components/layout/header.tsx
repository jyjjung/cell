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
import { cn } from "@/lib/utils";
import { Bell } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppSwitcher } from "@/components/shell/app-switcher";
import { IconButton } from "@/components/ui/icon-button";
import { OfflineBanner } from "./offline-banner";

interface HeaderProps {
  /** When true, header stays in the flex column instead of sticky document scroll. */
  pinStatic?: boolean;
}

export default function Header({ pinStatic = false }: HeaderProps) {
  const { currentUser } = useAuth();
  const { notifications } = useNotifications();
  const inbox = useInboxOptional();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const notificationUnread = useMemo(() => {
    if (!currentUser || !mounted) return 0;
    const lookbackMs = Date.now() - NOTIFICATION_UNREAD_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
    const recent = notifications.filter((n) => toMillisSafe(n.createdAt) >= lookbackMs);
    const nonAnnouncements = recent.filter((n) => n.type !== 'announcement');
    return countUnreadNotificationsForUser(nonAnnouncements, currentUser.uid);
  }, [notifications, currentUser, mounted]);

  const openInbox = () => {
    if (!inbox || !currentUser) return;

    const lookbackMs = Date.now() - NOTIFICATION_UNREAD_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
    const recent = notifications.filter((n) => toMillisSafe(n.createdAt) >= lookbackMs);
    const uid = currentUser.uid;
    const hasUnreadNotif = recent.some(
      (n) => n.type !== 'announcement' && !(n.readBy || []).includes(uid),
    );

    if (hasUnreadNotif) inbox.openInbox('notifications');
    else if (inbox.tab === 'prayer') inbox.openInbox('notifications');
    else inbox.openInbox(inbox.tab);
  };

  const showBell = Boolean(currentUser && inbox);

  return (
    <header
      className={cn('z-40 w-full shrink-0', !pinStatic && 'sticky top-0')}
      style={pinStatic ? { touchAction: 'none' } : undefined}
    >
      <div className="app-header-bar">
        <SidebarTrigger className="md:hidden shrink-0" />

        <div className="ml-auto flex min-w-0 shrink-0 items-center justify-end gap-2">
          <OfflineBanner />
          <AppSwitcher />
          {showBell && inbox ? (
            <div className="relative">
              <IconButton
                id="header-notification-bell"
                aria-label={`Notifications${notificationUnread > 0 ? ` (${notificationUnread} unread)` : ""}`}
                aria-expanded={inbox.isOpen}
                icon={Bell}
                onClick={openInbox}
                className={cn(
                  inbox.isOpen
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
              />

              {notificationUnread > 0 && (
                <span
                  className={cn(
                    "pointer-events-none absolute -right-0.5 -top-0.5 flex items-center justify-center rounded-full border-2 border-background bg-primary font-bold leading-none text-primary-foreground",
                    notificationUnread > 9 ? "h-5 w-5 text-[8px]" : "h-4 w-4 text-[9px]"
                  )}
                >
                  {notificationUnread > 99 ? "99+" : notificationUnread}
                </span>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
