
"use client";

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, PanelLeft, Shield, Bell } from 'lucide-react';
import { usePageLoading } from '@/contexts/page-loading-context';
import { useToast } from '@/hooks/use-toast';
import type { SidebarPreferences, NotificationPreferences } from '@/types';
import { Switch } from '@/components/ui/switch';
import { requestNotificationPermission, saveTokenToFirestore, removeTokenFromFirestore } from '@/lib/firebase';
import useLocalStorage from '@/hooks/use-local-storage';

type SidebarConfigItem = {
  key: keyof SidebarPreferences;
  label: string;
};

const userSidebarConfig: SidebarConfigItem[] = [
  { key: 'home', label: 'Home' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'events', label: 'Events' },
  { key: 'memorize', label: 'Memory Verses' },
  { key: 'checklist', label: 'My Checklist' },
  { key: 'fullPlan', label: 'Full Plan' },
  { key: 'leaderboard', label: 'Leaderboard' },
];

const adminSidebarConfig: SidebarConfigItem[] = [
  { key: 'adminEvents', label: 'Admin: Events' },
  { key: 'adminMemoryVerses', label: 'Admin: Memory Verses' },
  { key: 'adminBiblePlan', label: 'Admin: Bible Plan' },
  { key: 'adminNotifications', label: 'Admin: Notifications'},
];

type NotificationConfigItem = {
  key: keyof NotificationPreferences;
  label: string;
  description: string;
};

const notificationPrefsConfig: NotificationConfigItem[] = [
    { key: 'admin', label: 'Admin Announcements', description: 'Receive general announcements from admins.' },
    { key: 'event', label: 'New Events', description: 'Get notified when new global events are created.' },
    { key: 'reminder', label: 'Event Reminders', description: 'Reminders for events happening today or next week.' },
    { key: 'reading_progress', label: 'Reading Progress', description: 'Updates on your Bible reading progress.' },
];


export default function SettingsPage() {
  const { currentUser, isAdmin, loadingAuth, updateUserProfile } = useAuth();
  const router = useRouter();
  const { setIsPageLoading } = usePageLoading();
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  
  const [sidebarPrefs, setSidebarPrefs] = useState<Partial<SidebarPreferences>>(currentUser?.sidebar || {});
  const [notifPrefs, setNotifPrefs] = useState<Partial<NotificationPreferences>>(currentUser?.notificationPreferences || {});
  
  const [fcmToken, setFcmToken] = useLocalStorage<string | null>('fcmToken', null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [isUpdatingPush, setIsUpdatingPush] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setIsMounted(true);
    if (Notification.permission === 'granted' && fcmToken) {
        setPushEnabled(true);
    } else {
        setPushEnabled(false);
    }
  }, [fcmToken]);

  useEffect(() => {
    if (currentUser) {
      setSidebarPrefs(currentUser.sidebar || {});
      setNotifPrefs(currentUser.notificationPreferences || {});
    }
  }, [currentUser]);

  useEffect(() => {
    if (isMounted && !loadingAuth && !currentUser) {
      setIsPageLoading(true);
      router.push('/login');
    }
  }, [currentUser, loadingAuth, router, setIsPageLoading, isMounted]);

  const handlePushNotificationToggle = async (isChecked: boolean) => {
    if (!currentUser) return;
    setIsUpdatingPush(true);
  
    if (isChecked) {
      // Logic to enable push notifications
      try {
        const currentPermission = Notification.permission;
        if (currentPermission === 'granted') {
          // Already granted, just get the token
          const token = await requestNotificationPermission();
          if (token) {
            await saveTokenToFirestore(currentUser.uid, token);
            setFcmToken(token);
            setPushEnabled(true);
            toast({ title: "Push Notifications Enabled" });
          }
        } else if (currentPermission === 'denied') {
          // Permission was previously denied
          toast({
            title: "Permission Required",
            description: "Notification permission is blocked. Please enable it in your browser settings.",
            variant: "destructive",
            duration: 7000
          });
          setPushEnabled(false);
        } else { // 'default' state
          // Request permission
          const token = await requestNotificationPermission();
          if (token) {
            await saveTokenToFirestore(currentUser.uid, token);
            setFcmToken(token);
            setPushEnabled(true);
            toast({ title: "Push Notifications Enabled" });
          } else {
            // This case might not be hit if requestPermission throws, but included for safety.
            setPushEnabled(false);
          }
        }
      } catch (error: any) {
        console.error("Error enabling push notifications:", error);
        toast({
          title: "Could Not Enable Notifications",
          description: error.message || "An unknown error occurred.",
          variant: "destructive"
        });
        setPushEnabled(false);
      }
    } else {
      // Logic to disable push notifications
      if (fcmToken) {
        try {
          await removeTokenFromFirestore(currentUser.uid, fcmToken);
          setFcmToken(null);
          setPushEnabled(false);
          toast({ title: "Push Notifications Disabled" });
        } catch (error: any) {
          console.error("Error disabling push notifications:", error);
          toast({ title: "Error", description: "Failed to disable notifications. Please try again.", variant: "destructive"});
        }
      } else {
        setPushEnabled(false);
      }
    }
    setIsUpdatingPush(false);
  };
  
  const handleNotifPrefToggle = async (key: keyof NotificationPreferences, isChecked: boolean) => {
    if (!currentUser) return;
    const newPrefs = { ...notifPrefs, [key]: isChecked };
    setNotifPrefs(newPrefs);
    
    startTransition(async () => {
        try {
            await updateUserProfile(currentUser.uid, { notificationPreferences: newPrefs });
            toast({
                title: "Preference Updated",
                description: `'${notificationPrefsConfig.find(c => c.key === key)?.label}' notifications ${isChecked ? 'enabled' : 'disabled'}.`
            });
        } catch (error) {
            console.error("Failed to update notification preference:", error);
            toast({ title: "Update Failed", description: "Could not save your preference.", variant: "destructive" });
            const revertedPrefs = { ...notifPrefs, [key]: !isChecked };
            setNotifPrefs(revertedPrefs); // Revert on error
        }
    });
  };

  const handleSidebarToggle = async (key: keyof SidebarPreferences, isChecked: boolean) => {
    if (!currentUser) return;
    const newPrefs = { ...sidebarPrefs, [key]: isChecked };
    setSidebarPrefs(newPrefs); // Optimistic UI update
    
    try {
      await updateUserProfile(currentUser.uid, { sidebar: newPrefs });
      const configItem = [...userSidebarConfig, ...adminSidebarConfig].find(c => c.key === key);
      toast({
        title: "Sidebar Updated",
        description: `'${configItem?.label}' item is now ${isChecked ? 'visible' : 'hidden'}.`,
      });
    } catch (error) {
      console.error("Failed to update sidebar preference:", error);
      toast({ title: "Update Failed", description: "Could not update your sidebar setting.", variant: "destructive" });
      const revertedPrefs = { ...sidebarPrefs, [key]: !isChecked };
      setSidebarPrefs(revertedPrefs); // Revert on error
    }
  };

  if (!isMounted || loadingAuth) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser && isMounted) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your application and notification settings.</p>
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center"><Bell className="mr-2 h-5 w-5" /> Push Notifications</CardTitle>
            <CardDescription>Enable or disable push notifications on this device and choose what alerts you receive.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                    <Label htmlFor="push-master-switch">Enable Push Notifications</Label>
                    <p className="text-xs text-muted-foreground">Receive alerts even when the app is closed.</p>
                </div>
                <Switch
                    id="push-master-switch"
                    checked={pushEnabled}
                    onCheckedChange={handlePushNotificationToggle}
                    disabled={isUpdatingPush}
                />
            </div>
            
            {pushEnabled && (
                <div className="space-y-2 pt-4 border-t">
                    <h4 className="text-sm font-medium">Notification Types</h4>
                     {notificationPrefsConfig.map(({key, label, description}) => (
                        <div key={key} className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background/50">
                            <div className="space-y-0.5">
                                <Label htmlFor={`notif-switch-${key}`}>{label}</Label>
                                <p className="text-xs text-muted-foreground">{description}</p>
                            </div>
                            <Switch
                                id={`notif-switch-${key}`}
                                checked={notifPrefs[key] ?? true}
                                onCheckedChange={(checked) => handleNotifPrefToggle(key, checked)}
                                disabled={isPending}
                            />
                        </div>
                    ))}
                </div>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><PanelLeft className="mr-2 h-5 w-5" /> Sidebar Customization</CardTitle>
          <CardDescription>Choose which items you want to see in the sidebar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {userSidebarConfig.map(({key, label}) => (
            <div key={key} className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <Label htmlFor={`sidebar-switch-${key}`}>{label}</Label>
                </div>
                <Switch
                    id={`sidebar-switch-${key}`}
                    checked={sidebarPrefs[key] ?? true}
                    onCheckedChange={(checked) => handleSidebarToggle(key, checked)}
                />
            </div>
          ))}
        </CardContent>
      </Card>
      
      {isAdmin && (
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><Shield className="mr-2 h-5 w-5" /> Admin Sidebar</CardTitle>
                <CardDescription>Customize the visibility of admin pages in the sidebar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            {adminSidebarConfig.map(({key, label}) => (
                <div key={key} className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                    <Label htmlFor={`sidebar-switch-${key}`}>{label}</Label>
                    </div>
                    <Switch
                        id={`sidebar-switch-${key}`}
                        checked={sidebarPrefs[key] ?? true}
                        onCheckedChange={(checked) => handleSidebarToggle(key, checked)}
                    />
                </div>
            ))}
            </CardContent>
        </Card>
      )}

    </div>
  );
}
