
"use client";

import { useState, useMemo } from 'react';
import { ButtonSpinner } from '@/components/ui/loading-spinner';
import { useNotifications } from '@/hooks/use-notifications';
import NotificationAdminForm from '@/components/admin/notification-admin-form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Send, Trash2, Megaphone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from '@/components/ui/separator';
import { EmptyState, PageHeader } from '@/components/ui/page-layout';
import { ListLoadingSkeleton } from '@/components/ui/loading-state';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';

export default function AdminNotificationsPage() {
  const { notifications, loading, deleteNotification } = useNotifications();
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];

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
    <div className="admin-page">
      <header className="space-y-3">
        <PageHeader title={t.announcements} />
      </header>

      <section className="max-w-2xl">
        <div className="widget-surface space-y-4">
          <div className="panel-header !mb-0">
            <h2 className="panel-title flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              {t.adminNewAnnouncement}
            </h2>
          </div>
          <NotificationAdminForm />
        </div>
      </section>
      
      <Separator className="opacity-50" />

      <section className="space-y-3">
        <div className="panel-header">
          <h2 className="text-section-title">{t.adminArchive}</h2>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isDeletingAll || loading || announcements.length === 0}>
                {isDeletingAll ? <ButtonSpinner className="mr-2" /> : <Trash2 className="mr-2 h-4 w-4" />}
                {t.adminDeleteAll}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-section-title">{t.adminPurgeAll}</AlertDialogTitle>
                <AlertDialogDescription>{t.adminPurgeAllDesc}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t.adminCancel}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAll} disabled={isDeletingAll} className="bg-destructive hover:bg-destructive/90">
                  {isDeletingAll ? t.adminDeleting : t.adminYesDelete}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {loading ? (
          <ListLoadingSkeleton />
        ) : announcements.length === 0 ? (
          <EmptyState icon={Megaphone} title={t.adminNoAnnouncements} />
        ) : (
          <div className="admin-table-wrap">
            <Table className="admin-table">
              <TableHeader className="bg-muted">
                <TableRow className="hover:bg-transparent border-white/5">
                  <TableHead>{t.adminContent}</TableHead>
                  <TableHead>{t.adminType}</TableHead>
                  <TableHead>{t.adminSent}</TableHead>
                  <TableHead className="text-right">{t.adminActions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((notification) => (
                  <TableRow key={notification.id} className="border-white/5 transition-colors group">
                    <TableCell className="min-w-[260px]">
                      <p className="truncate text-xs font-semibold">
                        {notification.title}
                        {notification.message ? <span className="ml-2 text-muted-foreground">- {notification.message}</span> : null}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="h-5 px-2 text-micro-label !opacity-100">{notification.type}</Badge>
                    </TableCell>
                    <TableCell className="text-micro-label !opacity-100">
                      {notification.createdAt ? formatDistanceToNow(notification.createdAt.toDate()) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon" className="h-8 w-8 opacity-30 group-hover:opacity-100 transition-opacity" aria-label={t.adminYesDelete}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-section-title">{t.adminDeleteAnnouncement}</AlertDialogTitle>
                            <AlertDialogDescription>{t.adminDeleteAnnouncementDesc}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t.adminCancel}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(notification.id)} className="bg-destructive hover:bg-destructive/90">
                              {t.adminYesDelete}
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
