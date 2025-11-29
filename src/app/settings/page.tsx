
"use client";

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, PanelLeft, Shield } from 'lucide-react';
import { usePageLoading } from '@/contexts/page-loading-context';
import type { SidebarPreferences } from '@/types';
import { Switch } from '@/components/ui/switch';

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
