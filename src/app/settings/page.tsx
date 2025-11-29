
"use client";

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
<<<<<<< HEAD
import { useEffect, useState } from 'react';
=======
import { useEffect, useState, useTransition } from 'react';
>>>>>>> c1c5804 (Get rid of push notifications)
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, PanelLeft, Shield } from 'lucide-react';
import { usePageLoading } from '@/contexts/page-loading-context';
import type { SidebarPreferences } from '@/types';
import { Switch } from '@/components/ui/switch';
<<<<<<< HEAD
=======
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
>>>>>>> c1c5804 (Get rid of push notifications)

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


export default function SettingsPage() {
  const { currentUser, isAdmin, loadingAuth, updateUserProfile } = useAuth();
  const router = useRouter();
  const { setIsPageLoading } = usePageLoading();
  const [isMounted, setIsMounted] = useState(false);
  
  const [sidebarPrefs, setSidebarPrefs] = useState<Partial<SidebarPreferences>>(currentUser?.sidebar || {});
  
<<<<<<< HEAD
=======
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

>>>>>>> c1c5804 (Get rid of push notifications)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (currentUser) {
      setSidebarPrefs(currentUser.sidebar || {});
    }
  }, [currentUser]);

  useEffect(() => {
    if (isMounted && !loadingAuth && !currentUser) {
      setIsPageLoading(true);
      router.push('/login');
    }
  }, [currentUser, loadingAuth, router, setIsPageLoading, isMounted]);

<<<<<<< HEAD
=======
  
  const handleNotifPrefToggle = async (key: keyof NotificationPreferences, isChecked: boolean) => {
    if (!currentUser || key === 'admin') return; // Prevent changing admin notifications
    const newPrefs = { ...notifPrefs, [key]: isChecked };
    setNotifPrefs(newPrefs);
    
    startTransition(async () => {
        try {
            await updateUserProfile(currentUser.uid, { notificationPreferences: newPrefs });
        } catch (error) {
            console.error("Failed to update notification preference:", error);
            const revertedPrefs = { ...notifPrefs, [key]: !isChecked };
            setNotifPrefs(revertedPrefs); // Revert on error
        }
    });
  };

>>>>>>> c1c5804 (Get rid of push notifications)
  const handleSidebarToggle = async (key: keyof SidebarPreferences, isChecked: boolean) => {
    if (!currentUser) return;
    const newPrefs = { ...sidebarPrefs, [key]: isChecked };
    setSidebarPrefs(newPrefs); // Optimistic UI update
    
    try {
      await updateUserProfile(currentUser.uid, { sidebar: newPrefs });
    } catch (error) {
      console.error("Failed to update sidebar preference:", error);
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
        <p className="text-muted-foreground">Manage your application settings.</p>
      </div>
      
      <Card>
        <CardHeader>
<<<<<<< HEAD
=======
            <CardTitle className="flex items-center"><Bell className="mr-2 h-5 w-5" /> In-App Notifications</CardTitle>
            <CardDescription>Choose what in-app alerts you receive.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            
            <div className="space-y-2 pt-4">
                <h4 className="text-sm font-medium">Notification Types</h4>
                 {notificationPrefsConfig.map(({key, label, description}) => (
                    <div key={key} className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background/50">
                        <div className="space-y-0.5">
                            <Label htmlFor={`notif-switch-${key}`} className={cn(key === 'admin' && "text-muted-foreground")}>{label}</Label>
                            <p className="text-xs text-muted-foreground">{description}</p>
                        </div>
                        <Switch
                            id={`notif-switch-${key}`}
                            checked={key === 'admin' ? true : notifPrefs[key as keyof typeof notifPrefs] ?? true}
                            onCheckedChange={(checked) => handleNotifPrefToggle(key as keyof NotificationPreferences, checked)}
                            disabled={isPending || key === 'admin'}
                            aria-label={label}
                        />
                    </div>
                ))}
                
                <Separator className="my-4" />

                <h4 className="text-sm font-medium pt-2">Event Reminders</h4>
                 {reminderPrefsConfig.map(({key, label, description}) => (
                    <div key={key} className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background/50">
                        <div className="space-y-0.5">
                            <Label htmlFor={`notif-switch-${key}`} >{label}</Label>
                            <p className="text-xs text-muted-foreground">{description}</p>
                        </div>
                        <Switch
                            id={`notif-switch-${key}`}
                            checked={notifPrefs[key as keyof typeof notifPrefs] ?? true}
                            onCheckedChange={(checked) => handleNotifPrefToggle(key as keyof NotificationPreferences, checked)}
                            disabled={isPending}
                            aria-label={label}
                        />
                    </div>
                ))}

            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
>>>>>>> c1c5804 (Get rid of push notifications)
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
                    aria-label={`Toggle ${label} sidebar item`}
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
                        aria-label={`Toggle ${label} sidebar item`}
                    />
                </div>
            ))}
            </CardContent>
        </Card>
      )}

    </div>
  );
}
