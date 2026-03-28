
"use client";

import { useState, useMemo } from 'react';
import { useNotifications } from '@/hooks/use-notifications';
import NotificationAdminForm from '@/components/admin/notification-admin-form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Send, Trash2, Megaphone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from '@/components/ui/separator';

export default function AdminNotificationsPage() {
  const { notifications, loading, deleteNotification } = useNotifications();
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const announcements = useMemo(() => notifications.filter(n => n.type === 'announcement'), [notifications]);

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
    } catch (error: any) {
      console.error("Error Deleting Announcement", error);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      const deletionPromises = announcements.map(n => deleteNotification(n.id));
      await Promise.allSettled(deletionPromises);
    } catch (error: any) {
      console.error("Error Deleting All Announcements", error);
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-16 pb-24">
      <header className="space-y-6">
        <div className="space-y-2">
            <h1 className="text-2xl sm:text-2xl font-black tracking-tighter leading-none uppercase">Announcements.</h1>
            <div className="flex items-center gap-2 text-orange-500">
                <div className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                <p className="text-[10px] font-black tracking-[0.3em] uppercase opacity-70">Community Communication Console</p>
            </div>
        </div>
      </header>

      <section className="max-w-2xl space-y-8">
        <div className="p-8 rounded-[2.5rem] bg-card/20 backdrop-blur-md border border-white/5 space-y-6">
            <h2 className="text-xl font-black tracking-tight uppercase tracking-widest flex items-center gap-3">
                <Send className="h-5 w-5 text-orange-500" /> Dispatch New
            </h2>
            <NotificationAdminForm />
        </div>
      </section>
      
      <Separator className="opacity-50" />

      <section className="space-y-8">
        <div className="flex justify-between items-center px-4">
            <div className="space-y-1">
                <h2 className="text-2xl font-black tracking-tighter uppercase">Announcements Archive</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Sent History</p>
            </div>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                <Button variant="destructive" className="h-10 rounded-xl font-bold px-6" disabled={isDeletingAll || loading || announcements.length === 0}>
                  {isDeletingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4 mr-2" />}
                    Purge All
                </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-[2.5rem]">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-black tracking-tighter">Purge Archive?</AlertDialogTitle>
                    <AlertDialogDescription className="font-medium leading-relaxed">
                        This will permanently delete all announcements for all members. This action is irreversible.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-2xl h-12 font-bold">Abort</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAll} disabled={isDeletingAll} className="rounded-2xl h-12 font-black bg-destructive hover:bg-destructive/90">
                        {isDeletingAll ? 'Purging...' : 'Confirm Purge'}
                    </AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>

        {loading ? (
          <div className="h-60 flex flex-col items-center justify-center gap-4 opacity-30">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest">Scanning Archive</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="py-24 text-center border-2 border-dashed border-border/50 rounded-[3rem] opacity-30">
            <Megaphone className="h-12 w-12 mx-auto mb-6" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em]">Silence in the Air</p>
          </div>
        ) : (
            <div className="border border-white/5 rounded-[2.5rem] overflow-hidden bg-card/20 backdrop-blur-md">
            <Table>
                <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-white/5">
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Announcement Payload</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Type</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Sent</TableHead>
                    <TableHead className="text-right font-black uppercase tracking-widest text-[10px]">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {announcements.map((notification) => (
                    <TableRow key={notification.id} className="border-white/5 transition-colors group">
                        <TableCell className="py-6 min-w-[200px]">
                            <p className="font-black tracking-tight text-base leading-snug mb-1">{notification.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{notification.message}</p>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline" className="h-5 px-2 rounded-lg border-white/10 bg-white/5 font-black text-[8px] uppercase tracking-widest">{notification.type}</Badge>
                        </TableCell>
                        <TableCell className="text-[10px] font-bold uppercase tracking-widest opacity-40">
                            {notification.createdAt ? formatDistanceToNow(notification.createdAt.toDate()) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right py-6">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon" className="h-10 w-10 rounded-xl opacity-20 group-hover:opacity-100 transition-opacity" aria-label="Delete notification">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-[2.5rem]">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-2xl font-black tracking-tighter">Purge Dispatch?</AlertDialogTitle>
                                    <AlertDialogDescription className="font-medium">
                                        Terminating this transmission will remove it from all member feeds instantly.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="rounded-2xl h-12 font-bold">Abort</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(notification.id)} className="rounded-2xl h-12 font-black bg-destructive hover:bg-destructive/90">
                                        Execute Purge
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            </div>
        )}
      </section>
    </div>
  );
}
