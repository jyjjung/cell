"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useNotifications } from '@/hooks/use-notifications';
import type { AppNotification } from '@/types';
import NotificationAdminForm from '@/components/admin/notification-admin-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, BellRing, List, Trash2 } from 'lucide-react';
import { usePageLoading } from '@/contexts/page-loading-context';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';

export default function AdminNotificationsPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const { setIsPageLoading } = usePageLoading();
  const { notifications, loading, deleteNotification } = useNotifications();
  const { toast } = useToast();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !isAdmin) {
      setIsPageLoading(true);
      router.push('/admin');
    }
  }, [isAdmin, router, isMounted, setIsPageLoading]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
      },
    },
  };
  
  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
      toast({
        title: "Notification Deleted",
        description: "The notification has been successfully removed.",
      });
    } catch (error: any) {
      toast({
        title: "Error Deleting Notification",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };


  if (!isMounted || !isAdmin) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <motion.div
        className="space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="flex items-center space-x-3">
          <BellRing className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Manage Notifications</h1>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Create New Global Notification</CardTitle>
              <CardDescription>Send a message to all users. It will appear on their homepage.</CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationAdminForm />
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Sent Notifications</CardTitle>
              <CardDescription>List of recently sent global and automated notifications.</CardDescription>
            </CardHeader>
            <CardContent>
               {loading ? (
                  <div className="flex items-center justify-center p-6"><Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />Loading notifications...</div>
                ) : notifications.length === 0 ? (
                  <div className="p-10 text-center bg-muted/50 rounded-lg">
                    <List className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No notifications have been sent yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Message</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Sent</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {notifications.map((notification) => (
                            <TableRow key={notification.id}>
                                <TableCell className="font-medium max-w-sm truncate">{notification.message}</TableCell>
                                <TableCell>{notification.type}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                    {notification.createdAt ? `${formatDistanceToNow(notification.createdAt.toDate())} ago` : 'N/A'}
                                </TableCell>
                                <TableCell className="text-right">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="icon" aria-label="Delete notification">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete this notification for all users.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(notification.id)}>
                                                Yes, delete notification
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
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
