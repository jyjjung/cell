import type { CommunityAppId } from '@/lib/app-access';
import { cellPath } from '@/lib/app-access';
import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  BookOpen,
  Calendar,
  CalendarCheck,
  FileText,
  HeartHandshake,
  Home,
  ImageIcon,
  LayoutDashboard,
  Library,
  Lightbulb,
  MessageCircle,
  Music,
  Palette,
  SlidersHorizontal,
  User,
  Users,
} from 'lucide-react';

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  requiresAuth?: boolean;
  badgeKey?: 'chat';
};

export function getSidebarNavForApp(
  app: CommunityAppId,
  opts: {
    isAdmin: boolean;
    isWorshipTeam: boolean;
    labels: Record<string, string>;
  },
): AppNavItem[] {
  const { isAdmin, isWorshipTeam, labels } = opts;

  switch (app) {
    case 'cell':
      return [
        { href: cellPath('/'), label: labels.home, icon: Home },
        { href: cellPath('/bible-checklist'), label: labels.readingPlan, icon: BookOpen },
        { href: cellPath('/chat'), label: labels.chat, icon: MessageCircle, requiresAuth: true, badgeKey: 'chat' },
        { href: cellPath('/events'), label: labels.schedule, icon: CalendarCheck },
        ...(isAdmin || isWorshipTeam
          ? [{ href: cellPath('/worship'), label: labels.worshipPortal, icon: Music }]
          : []),
        { href: cellPath('/media'), label: labels.links, icon: Library },
        { href: cellPath('/docs'), label: labels.docs, icon: FileText, requiresAuth: true },
        { href: cellPath('/forms'), label: labels.forms, icon: FileText },
        {
          href: cellPath('/prayer-requests'),
          label: labels.prayerRequests,
          icon: HeartHandshake,
          requiresAuth: true,
        },
      ];
    case 'ndcpc':
      return [
        { href: '/ndcpc', label: 'Home', icon: LayoutDashboard },
        { href: '/ndcpc/chat', label: 'Chat', icon: MessageCircle, badgeKey: 'chat' },
        { href: '/ndcpc/photos', label: 'Photos', icon: ImageIcon },
        { href: '/ndcpc/worship', label: 'Worship', icon: Calendar },
      ];
    case 'users':
      return [{ href: '/users', label: 'Users', icon: Users }];
    case 'accounts':
      return [
        { href: '/accounts?tab=profile', label: labels.profile, icon: User },
        { href: '/accounts?tab=appearance', label: labels.appearance, icon: Palette },
        { href: '/accounts?tab=apps', label: 'Apps', icon: SlidersHorizontal },
        { href: '/accounts?tab=notifications', label: labels.notifications, icon: Bell },
      ];
    case 'updates':
      return [{ href: '/feedback', label: labels.feedback || 'Updates', icon: Lightbulb }];
  }
}
