
"use client";

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, Palette, LogOut, BellRing, BellOff, AlertTriangle, Download, Send, User as UserIcon, Languages, Cake } from 'lucide-react';
import type { UserProfileData, AvatarData, AppEvent } from '@/types';
import { Switch } from '@/components/ui/switch';
import { PixelAvatar } from '@/components/avatar/PixelAvatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AvatarEditor } from '@/components/avatar/AvatarEditor';
import { DEFAULT_AVATAR_DATA } from '@/lib/avatar-options';
import { getToken } from 'firebase/messaging';
import { messaging, db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useNotifications } from '@/hooks/use-notifications';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { translations } from '@/lib/translations';
import { useEvents } from '@/hooks/use-events';
import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/page-layout';



type PushSupportState = 'SUPPORTED' | 'NEEDS_PWA_INSTALL' | 'NEEDS_PERMISSION' | 'DENIED' | 'UNSUPPORTED' | 'LOADING';

export default function ProfilePage() {
  const { currentUser, loadingAuth, signOutUser, updateUserProfile } = useAuth();
  const { events, loading: loadingEvents } = useEvents();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  const [isAvatarEditorOpen, setIsAvatarEditorOpen] = useState(false);
  const [avatarInEditor, setAvatarInEditor] = useState<AvatarData>(currentUser?.avatar || DEFAULT_AVATAR_DATA);

  const [showProgress, setShowProgress] = useState(currentUser?.showInCommunityProgress ?? true);
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'ko'>(currentUser?.preferredLanguage || 'en');
  
  const [pushSupport, setPushSupport] = useState<PushSupportState>('LOADING');
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false);
  const [isTestingPush, setIsTestingPush] = useState(false);
  const { createNotification } = useNotifications();
  
  const t = translations[preferredLanguage || 'en'];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const getPushSupportState = useCallback((): PushSupportState => {
    if (typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_FCM_VAPID_KEY) {
      return 'UNSUPPORTED';
    }
    
    if (typeof window === 'undefined' || !navigator.serviceWorker || !window.PushManager || !window.Notification) {
      return 'UNSUPPORTED';
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isStandalone) {
      return 'NEEDS_PWA_INSTALL';
    }
    
    const permission = Notification.permission;
    if (permission === 'denied') {
      return 'DENIED';
    }
    if (permission === 'default') {
      return 'NEEDS_PERMISSION';
    }
    
    return 'SUPPORTED';
  }, []);

  useEffect(() => {
    if(isMounted) {
      setPushSupport(getPushSupportState());
    }
  }, [isMounted, getPushSupportState]);


  useEffect(() => {
    if (isMounted && !loadingAuth && !currentUser) router.push('/login');
  }, [currentUser, loadingAuth, router, isMounted]);

  useEffect(() => {
    if (currentUser) {
      setShowProgress(currentUser.showInCommunityProgress ?? true);
      setPreferredLanguage(currentUser.preferredLanguage || 'en');
    }
  }, [currentUser]);
  
  useEffect(() => {
    if (isAvatarEditorOpen && currentUser) {
      setAvatarInEditor({ ...DEFAULT_AVATAR_DATA, ...currentUser.avatar });
    }
  }, [isAvatarEditorOpen, currentUser]);

  const birthdayEvent = useMemo(() => {
    if (!events || !currentUser) return null;
    return events.find(e => e.category === 'Birthday' && e.userId === currentUser.uid);
  }, [events, currentUser]);

  const handleRepairPush = useCallback(async () => {
    if (!currentUser) return;
    setIsSubscriptionLoading(true);
    try {
        // 1. Forcefully unregister all service workers to clear the "Handshake"
        if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (const reg of regs) {
                await reg.unregister();
            }
        }
        
        // 2. Clear local storage for FCM
        localStorage.removeItem('fcm_token_synced');
        
        toast({
            title: "Repairing Handshake...",
            description: "Refreshing the app to finish the repair.",
        });

        // 3. Reload to trigger fresh registration
        setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
        console.error('Repair failed:', err);
        setIsSubscriptionLoading(false);
    }
  }, [currentUser, toast]);


  const handleEnableNotifications = useCallback(async () => {
    if (!currentUser || !messaging) return;
    
    setIsSubscriptionLoading(true);
    
    try {
        const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY!;
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            // CRITICAL: Explicitly register firebase-messaging-sw.js.
            // Cannot use navigator.serviceWorker.ready — that may return sw.js (next-pwa),
            // which doesn't have Firebase Messaging code, breaking onBackgroundMessage.
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/firebase-cloud-messaging-push-scope' });
            const currentToken = await getToken(messaging, { 
                vapidKey,
                serviceWorkerRegistration: registration 
            });
            
            if (currentToken) {
                // Preserve tokens from other devices (up to 3 total).
                // Put this device's token first, keep existing tokens deduped.
                const existing = currentUser.fcmTokens || [];
                const filtered = existing.filter(t => t !== currentToken);
                const newList = [currentToken, ...filtered].slice(0, 3);
                await updateDoc(doc(db, 'users', currentUser.uid), { fcmTokens: newList });
                toast({
                    title: "Notifications Enabled",
                    description: "You will now receive push notifications on this device.",
                });
            } else {
                throw new Error("Could not get push token.");
            }
        } else {
            toast({
                variant: "destructive",
                title: "Permission Denied",
                description: "You have blocked push notifications.",
            });
        }
    } catch (err: any) {
        console.error('Error enabling push notifications:', err);
        toast({
            variant: "destructive",
            title: "Subscription Failed",
            description: err.message || "An error occurred.",
        });
    } finally {
        setIsSubscriptionLoading(false);
        setPushSupport(getPushSupportState());
    }
  }, [currentUser, toast, getPushSupportState]);

  const handleTestPush = async () => {
    if (!currentUser) return;
    setIsTestingPush(true);
    try {
      await createNotification({
        title: "Test Notification",
        message: "If you received this, push notifications are working!",
        type: 'admin',
        isGlobal: false,
        userId: currentUser.uid,
        relatedUrl: '/profile'
      });
    } catch (error: any) {
      console.error("Failed to send test push notification", error);
      toast({
        variant: "destructive",
        title: "Push Dispatch Failed",
        description: error.message || "An unknown error occurred.",
      });
    } finally {
      setIsTestingPush(false);
    }
  };


  const handleSignOut = async () => { await signOutUser(); };
  
  const handleAvatarSave = async () => {
     if (!currentUser) return;
     setIsSaving(true);
     try {
       await updateUserProfile(currentUser.uid, { avatar: avatarInEditor });
       setIsAvatarEditorOpen(false); 
     } catch (error) { console.error("Failed to update avatar:", error); } 
     finally { setIsSaving(false); }
  };

  const handleProgressToggle = async (isChecked: boolean) => {
    if (!currentUser) return;
    setShowProgress(isChecked);
    try {
      await updateUserProfile(currentUser.uid, { showInCommunityProgress: isChecked });
    } catch (error) {
      console.error("Failed to update progress visibility:", error);
      setShowProgress(!isChecked);
    }
  };

  const handleLanguageChange = async (lang: 'en' | 'ko') => {
    if (!currentUser) return;
    // Optimistic UI update
    setPreferredLanguage(lang);
    try {
      await updateUserProfile(currentUser.uid, { preferredLanguage: lang });
      toast({ title: "Language Updated", description: lang === 'ko' ? "언어 설정이 변경되었습니다." : "Language settings updated." });
    } catch (error) {
      console.error("Failed to update language:", error);
      // Revert local state on error
      setPreferredLanguage(currentUser.preferredLanguage || 'en');
    }
  };

  const renderNotificationButton = useMemo(() => {
    switch (pushSupport) {
      case 'LOADING':
        return <Button disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t.checking}</Button>;
      case 'SUPPORTED':
        if (currentUser && (!currentUser.fcmTokens || currentUser.fcmTokens.length === 0)) {
           return <Button onClick={handleEnableNotifications} disabled={isSubscriptionLoading}><BellRing className="mr-2 h-4 w-4" />{t.enable}</Button>;
        }
        return <div className="flex items-center text-sm text-primary"><BellRing className="mr-2 h-4 w-4" />{t.enabled}</div>;
      case 'NEEDS_PERMISSION':
        return <Button onClick={handleEnableNotifications} disabled={isSubscriptionLoading}><BellRing className="mr-2 h-4 w-4" />{t.enable}</Button>;
      case 'NEEDS_PWA_INSTALL':
        return <div className="flex items-center text-sm text-amber-500"><Download className="mr-2 h-4 w-4" />{t.addHome}</div>;
      case 'DENIED':
        return <Button disabled><BellOff className="mr-2 h-4 w-4" />{t.permissionDenied}</Button>;
      case 'UNSUPPORTED':
        return <Button disabled><AlertTriangle className="mr-2 h-4 w-4" />{t.notSupported}</Button>;
      default:
        return null;
    }
  }, [pushSupport, isSubscriptionLoading, handleEnableNotifications, currentUser, t]);
  
  if (!isMounted || loadingAuth || (!currentUser && isMounted)) return null;
  if (!currentUser) return null;

  return (
    <div className="page-container space-y-8 pb-32">
      {/* Header */}
      <PageHeader
        title={t.myProfile}
      />

      {/* Avatar + Name Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center gap-6 p-6 rounded-3xl border border-border/40 bg-card/50 backdrop-blur-sm"
      >
        <div className="relative group shrink-0">
          <div className="h-20 w-20 rounded-2xl overflow-hidden border-2 border-border/40 bg-muted shadow-sm">
            <PixelAvatar avatar={currentUser.avatar} />
          </div>
          <Dialog open={isAvatarEditorOpen} onOpenChange={setIsAvatarEditorOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="absolute -bottom-2 -right-2 h-7 w-7 rounded-xl p-0 shadow-md transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100">
                <Palette className="h-3.5 w-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Customize Your Avatar</DialogTitle>
                <DialogDescription>Make changes to your pixel art avatar. Click save when done.</DialogDescription>
              </DialogHeader>
              <div className="py-2"><AvatarEditor value={avatarInEditor} onChange={setAvatarInEditor} /></div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setIsAvatarEditorOpen(false)}>Cancel</Button>
                <Button onClick={handleAvatarSave} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold">{currentUser.displayName}</p>
          <p className="text-sm text-muted-foreground">{currentUser.email}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Name changes require an admin.</p>
        </div>
      </motion.div>

      {/* Significant Dates Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="p-6 rounded-3xl border border-border/40 bg-card/50 backdrop-blur-sm space-y-4"
      >
        <h2 className="text-base font-semibold">{t.significantDates}</h2>
        <div className="flex items-center justify-between p-4 rounded-2xl bg-muted border border-border/30">
          <div className="flex items-center gap-3">
            <Cake className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium">{t.yourBirthday}</p>
              <p className="text-xs text-muted-foreground">
                {birthdayEvent ? format(parseISO(birthdayEvent.date), 'MMMM d') : 'Not linked yet.'}
              </p>
            </div>
          </div>
          {birthdayEvent && <div className="h-2 w-2 rounded-full bg-muted animate-pulse" />}
        </div>
        {!birthdayEvent && (
          <p className="text-xs text-muted-foreground/60 px-1">Ask an admin to link your birthday via the community schedule.</p>
        )}
      </motion.div>

      {/* Settings Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="p-6 rounded-3xl border border-border/40 bg-card/50 backdrop-blur-sm space-y-4"
      >
        <h2 className="text-base font-semibold">{t.settings}</h2>

        {/* Language */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-muted border border-border/30">
          <div className="flex items-center gap-3">
            <Languages className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium">{t.language}</p>
              <p className="text-xs text-muted-foreground">{t.languageDesc}</p>
            </div>
          </div>
          <Select value={preferredLanguage} onValueChange={(val) => handleLanguageChange(val as 'en' | 'ko')}>
            <SelectTrigger className="w-[110px] rounded-xl h-9"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="ko">한국어</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Community Progress Toggle */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-muted border border-border/30">
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-sm font-medium">{t.communityProgressTitle}</p>
            <p className="text-xs text-muted-foreground">{t.communityProgress}</p>
          </div>
          <Switch id="community-progress-switch" checked={showProgress} onCheckedChange={handleProgressToggle} />
        </div>

        {/* Push Notifications */}
        <div className="p-4 rounded-2xl bg-muted border border-border/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <p className="text-sm font-medium">{t.pushNotifications}</p>
              <p className="text-xs text-muted-foreground">{t.pushNotificationsDesc}</p>
            </div>
            {renderNotificationButton}
          </div>
          {pushSupport === 'SUPPORTED' && currentUser.fcmTokens && currentUser.fcmTokens.length > 0 && (
            <div className="space-y-2">
                <Button onClick={handleTestPush} disabled={isTestingPush} variant="outline" className="w-full rounded-xl h-9 text-sm">
                  {isTestingPush ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} {t.testPush}
                </Button>
                <Button onClick={handleRepairPush} disabled={isSubscriptionLoading} variant="ghost" className="w-full rounded-xl h-9 text-xs text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors">
                  {isSubscriptionLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <AlertTriangle className="mr-2 h-3 w-3" />} Repair Push Notifications
                </Button>
            </div>
          )}
          {pushSupport === 'NEEDS_PWA_INSTALL' && (
            <Alert variant="default">
              <Download className="h-4 w-4" />
              <AlertTitle>Enable Push Notifications on iOS</AlertTitle>
              <AlertDescription>Add this app to your Home Screen to enable notifications.</AlertDescription>
            </Alert>
          )}
        </div>
      </motion.div>

      {/* Account Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="p-6 rounded-3xl border border-destructive/20 bg-destructive/5 space-y-4"
      >
        <h2 className="text-base font-semibold">{t.account}</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">User ID</p>
            <p className="text-xs text-muted-foreground/50 break-all font-mono mt-0.5">{currentUser.uid}</p>
          </div>
        </div>
        <Button onClick={handleSignOut} variant="destructive" className="rounded-xl h-10 text-sm font-semibold gap-2">
          <LogOut className="h-4 w-4" /> {t.signOut}
        </Button>
      </motion.div>
    </div>
  );
}
