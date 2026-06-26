
"use client";

import { useMemo } from 'react';
import { useNotifications } from '@/hooks/use-notifications';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2, Bell, ArrowRight } from 'lucide-react';
import { usePageLoading } from '@/contexts/page-loading-context';
import { useRouter } from 'next/navigation';
import { LinkifiedText } from '@/components/ui/linkified-text';
import { translations } from '@/lib/translations';

const NotificationItem = ({ notification, onMarkRead, markReadLabel }: { notification: any, onMarkRead: () => void, markReadLabel: string }) => (
  <motion.div
    layout
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
    className="surface-row group"
  >
    <div className="flex-grow min-w-0 space-y-0.5">
        <p className="font-semibold text-sm truncate text-foreground">{notification.title}</p>
        <LinkifiedText 
          text={notification.message} 
          truncate 
          className="text-muted-foreground text-xs"
        />
    </div>
    <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8 shrink-0" 
        onClick={onMarkRead} 
        aria-label={markReadLabel}
    >
        <Check className="h-4 w-4" />
    </Button>
  </motion.div>
);

export default function NotificationsWidget() {
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();
  const router = useRouter();
  const { setIsPageLoading } = usePageLoading();

  const unreadNotifications = useMemo(() => {
    if (!currentUser || !notifications) return [];
    return notifications.filter(n => n.type !== 'announcement' && !(n.readBy || []).includes(currentUser.uid));
  }, [notifications, currentUser]);
  
  const handleGoToNotifications = () => {
    setIsPageLoading(true);
    router.push('/notifications');
  }

  return (
    <div className="widget-surface relative h-fit overflow-hidden">
        <div className="panel-header">
            <div className="min-w-0">
                <h3 className="panel-title">{t.activityFeed}</h3>
                <p className="panel-subtitle">{t.realtimePulse}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                <Bell className="h-4 w-4" />
            </div>
        </div>

        <div className="stack-gap-sm mb-3">
            {loading ? (
                <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground opacity-40" />
                </div>
            ) : unreadNotifications.length === 0 ? (
                <div className="empty-inline">
                    <Bell className="h-6 w-6 mb-2 text-muted-foreground" />
                    <p>{t.allSettled}</p>
                </div>
            ) : (
                <>
                    <AnimatePresence mode="popLayout">
                        {unreadNotifications.slice(0, 3).map(notification => (
                        <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onMarkRead={() => markAsRead(notification.id)}
                            markReadLabel={t.markAsRead}
                        />
                        ))}
                    </AnimatePresence>
                    {unreadNotifications.length > 3 && (
                        <p className="text-xs text-muted-foreground text-center pt-1">
                            + {unreadNotifications.length - 3} {t.furtherAlerts}
                        </p>
                    )}
                </>
            )}
        </div>
        
        <div className="stack-gap-sm">
            <Button 
                variant="outline" 
                size="sm"
                className="w-full" 
                onClick={handleGoToNotifications}
            >
                {t.alertVault}
                <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Button>
            {unreadNotifications.length > 1 && (
                <button 
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1" 
                    onClick={() => markAllAsRead(unreadNotifications.map(n => n.id))}
                >
                    {t.dismissAll}
                </button>
            )}
        </div>
    </div>
  );
}
