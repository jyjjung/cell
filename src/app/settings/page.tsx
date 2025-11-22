
"use client";

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, PanelLeft } from 'lucide-react';
import { usePageLoading } from '@/contexts/page-loading-context';
import { useToast } from '@/hooks/use-toast';
import type { SidebarPreferences } from '@/types';
import { Switch } from '@/components/ui/switch';

type SidebarConfigItem = {
  key: keyof SidebarPreferences;
  label: string;
};

const sidebarConfig: SidebarConfigItem[] = [
  { key: 'home', label: 'Home' },
  { key: 'events', label: 'Events' },
  { key: 'memorize', label: 'Memory Verses' },
  { key: 'checklist', label: 'My Checklist' },
  { key: 'fullPlan', label: 'Full Plan' },
  { key: 'leaderboard', label: 'Leaderboard' },
];

export default function SettingsPage() {
  const { currentUser, loadingAuth, updateUserProfile } = useAuth();
  const router = useRouter();
  const { setIsPageLoading } = usePageLoading();
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  
  const [sidebarPrefs, setSidebarPrefs] = useState<Partial<SidebarPreferences>>(currentUser?.sidebar || {});

  useEffect(() => {
    setIsMounted(true);
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
    }
  }, [currentUser]);

  const handleSidebarToggle = async (key: keyof SidebarPreferences, isChecked: boolean) => {
    if (!currentUser) return;
    const newPrefs = { ...sidebarPrefs, [key]: isChecked };
    setSidebarPrefs(newPrefs); // Optimistic UI update
    
    try {
      await updateUserProfile(currentUser.uid, { sidebar: newPrefs });
      toast({
        title: "Sidebar Updated",
        description: `'${sidebarConfig.find(c => c.key === key)?.label}' item is now ${isChecked ? 'visible' : 'hidden'}.`,
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
        <p className="text-muted-foreground">Manage your application settings.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><PanelLeft className="mr-2 h-5 w-5" /> Sidebar Customization</CardTitle>
          <CardDescription>Choose which items you want to see in the sidebar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sidebarConfig.map(({key, label}) => (
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
    </div>
  );
}

    