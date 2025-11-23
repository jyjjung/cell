
"use client";

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, PanelLeft, Shield, Bell } from 'lucide-react';
import { usePageLoading } from '@/contexts/page-loading-context';
import { useToast } from '@/hooks/use-toast';
import type { SidebarPreferences, NotificationPreferences } from '@/types';
import { Switch } from '@/components/ui/switch';
import { requestNotificationPermission, removeNotificationToken } from '@/lib/firebase';
import { Separator } from '@/components/ui/separator';

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

const defaultNotificationPreferences: NotificationPreferences = {
  admin: true,
  event: true,
  reading_progress: true,
  reminder: true,
};

type NotificationTypeKey = keyof NotificationPreferences;

const notificationTypeLabels: Record<NotificationTypeKey, string> = {
  admin: "Admin Announcements",
  event: "New Events & Updates",
  reminder: "Event Reminders",
  reading_progress: "Reading Progress",
};


export default function SettingsPage() {
  const { currentUser, isAdmin, loadingAuth, updateUserProfile } = useAuth();
  const router = useRouter();
  const { setIsPageLoading } = usePageLoading();
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  
  const [sidebarPrefs, setSidebarPrefs] = useState<Partial<SidebarPreferences>>(currentUser?.sidebar || {});
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(currentUser?.notificationPreferences || defaultNotificationPreferences);


  useEffect(() => {
    setIsMounted(true);
    if ('Notification' in window && Notification.permission === 'granted') {
      setPushNotificationsEnabled(true);
    }
  }, []);

  useEffect(() => {
    if (isMounted && !loadingAuth && !currentUser) {
      setIsPageLoading(true);
      router.push('/login');
    }
  }, [currentUser, loadingAuth, router, setIsPageLoading, isMounted]);

  useEffect(() => {
    if (currentUser) {
      setSidebarPrefs(currentUser.sidebar || {});
      setNotifPrefs(currentUser.notificationPreferences || defaultNotificationPreferences);
    }
  }, [currentUser]);

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

  const handlePushNotificationToggle = async (enabled: boolean) => {
    if (!currentUser) return;

    if (enabled) {
      try {
        await requestNotificationPermission(currentUser.uid);
        setPushNotificationsEnabled(true);
        toast({
          title: "Push Notifications Enabled",
          description: "You will now receive updates on your device.",
        });
      } catch (error: any) {
        console.error("Error enabling push notifications:", error);
        toast({
          title: "Could Not Enable Notifications",
          description: error.message || "Please check your browser settings.",
          variant: "destructive",
        });
        setPushNotificationsEnabled(false);
      }
    } else {
      try {
        await removeNotificationToken(currentUser.uid);
        setPushNotificationsEnabled(false);
        toast({
            title: "Push Notifications Disabled",
            description: "You will no longer receive push notifications on this device.",
        });
      } catch (error: any) {
          console.error("Error disabling push notifications:", error);
          toast({
              title: "Error",
              description: "Could not disable push notifications fully. You may need to do so in browser settings.",
              variant: "destructive",
          });
      }
    }
  };
  
  const handleNotifPrefToggle = async (key: NotificationTypeKey, isChecked: boolean) => {
    if (!currentUser) return;

    const newPrefs = { ...notifPrefs, [key]: isChecked };
    setNotifPrefs(newPrefs); // Optimistic update

    try {
        await updateUserProfile(currentUser.uid, { notificationPreferences: newPrefs });
        toast({
            title: "Notification Preference Updated",
            description: `${notificationTypeLabels[key]} alerts are now ${isChecked ? 'enabled' : 'disabled'}.`
        });
    } catch (error: any) {
        console.error(`Failed to update ${key} notification preference:`, error);
        toast({
            title: "Update Failed",
            description: `Could not update setting for ${notificationTypeLabels[key]}.`,
            variant: "destructive",
        });
        // Revert UI on error
        setNotifPrefs(prev => ({...prev, [key]: !isChecked}));
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
        <p className="text-muted-foreground">Manage your application settings.</p>
      </div>

       <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Bell className="mr-2 h-5 w-5" /> Push Notifications</CardTitle>
          <CardDescription>Manage how you receive push notifications from the app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <Label htmlFor="push-notifications-switch">Enable Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                    Receive notifications on your device even when the app is closed.
                </p>
              </div>
              <Switch
                  id="push-notifications-switch"
                  checked={pushNotificationsEnabled}
                  onCheckedChange={handlePushNotificationToggle}
              />
          </div>
          {pushNotificationsEnabled && (
            <div className="space-y-2 pt-4">
              <Separator />
               <p className="text-sm font-medium pt-2 text-foreground">Notification Types</p>
               {Object.keys(notificationTypeLabels).map((key) => (
                  <div key={key} className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                          <Label htmlFor={`notif-switch-${key}`}>{notificationTypeLabels[key as NotificationTypeKey]}</Label>
                      </div>
                      <Switch
                          id={`notif-switch-${key}`}
                          checked={notifPrefs[key as NotificationTypeKey]}
                          onCheckedChange={(checked) => handleNotifPrefToggle(key as NotificationTypeKey, checked)}
                          disabled={!pushNotificationsEnabled}
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
