
"use client";

import { useMemo } from 'react';
import { useNotifications } from '@/hooks/use-notifications';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Check, Loader2, Bell, ArrowRight } from 'lucide-react';
import { usePageLoading } from '@/contexts/page-loading-context';
import { useRouter } from 'next/navigation';

const NotificationItem = ({ notification, onMarkRead }: { notification: any, onMarkRead: () => void }) => (
  <motion.div
    layout
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
    className="relative p-4 bg-muted/20 hover:bg-destructive transition-all rounded-[1.5rem] border border-transparent group"
  >
    <div className="flex items-center justify-between gap-4">
        <div className="flex-grow min-w-0 space-y-0.5">
            <p className="font-bold text-sm tracking-tight truncate text-foreground group-hover:text-white transition-colors">{notification.title}</p>
            <p className="text-muted-foreground text-xs font-medium truncate group-hover:text-white/80 transition-colors">{notification.message}</p>
        </div>
        <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 shrink-0 rounded-xl hover:bg-white hover:text-destructive transition-all" 
            onClick={onMarkRead} 
            aria-label="Mark as read"
        >
            <Check className="h-4 w-4" />
        </Button>
    </div>
  </motion.div>
);

export default function NotificationsWidget() {
  const { currentUser } = useAuth();
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();
  const router = useRouter();
  const { setIsPageLoading } = usePageLoading();

  const unreadNotifications = useMemo(() => {
    if (!currentUser || !notifications) return [];
    return notifications.filter(n => n.type !== 'announcement' && !n.readBy.includes(currentUser.uid));
  }, [notifications, currentUser]);
  
  const handleGoToNotifications = () => {
    setIsPageLoading(true);
    router.push('/notifications');
  }

  return (
    <div className="relative p-6 md:p-8 rounded-[2.5rem] bg-card border border-border/50 shadow-xl overflow-hidden h-fit">
        <div className="flex items-center justify-between mb-6">
            <div className="min-w-0">
                <h3 className="text-lg font-black tracking-tight">Activity Feed</h3>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Real-time Pulse</p>
            </div>
            <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive shadow-inner">
                <Bell className="h-5 w-5" />
            </div>
        </div>

        <div className="space-y-3 mb-6 min-h-[120px]">
            {loading ? (
                <div className="h-32 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground opacity-20" />
                </div>
            ) : unreadNotifications.length === 0 ? (
                <div className="h-32 flex flex-col items-center justify-center text-center opacity-40 py-4">
                    <Bell className="h-8 w-8 mb-3" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">All Settled</p>
                </div>
            ) : (
                <>
                    <AnimatePresence mode="popLayout">
                        {unreadNotifications.slice(0, 3).map(notification => (
                        <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onMarkRead={() => markAsRead(notification.id)}
                        />
                        ))}
                    </AnimatePresence>
                    {unreadNotifications.length > 3 && (
                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest pl-2 pt-2 text-center">
                            + {unreadNotifications.length - 3} further alerts
                        </p>
                    )}
                </>
            )}
        </div>
        
        <div className="flex flex-col gap-3 mt-8">
            <Button 
                variant="outline" 
                className="h-12 w-full rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] bg-background/50 border-border/50 hover:bg-destructive hover:text-white transition-all shadow-none group" 
                onClick={handleGoToNotifications}
            >
                Alert Vault
                <ArrowRight className="ml-2 h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </Button>
            {unreadNotifications.length > 1 && (
                <button 
                    className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground hover:text-destructive transition-colors py-2" 
                    onClick={() => markAllAsRead(unreadNotifications.map(n => n.id))}
                >
                    Dismiss All
                </button>
            )}
        </div>
    </div>
  );
}
