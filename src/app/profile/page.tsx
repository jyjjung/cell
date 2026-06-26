
"use client";

import { useAuth } from '@/contexts/auth-context';
import { useAllUsers } from '@/hooks/use-all-users';
import { useRouter } from 'next/navigation';
import { useClientSearchParams } from '@/hooks/use-client-search-params';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut, BellRing, BellOff, AlertTriangle, Download, Send, Languages, Cake } from 'lucide-react';
import type { AvatarData } from '@/types';
import { Switch } from '@/components/ui/switch';
import { DEFAULT_AVATAR_DATA } from '@/lib/avatar-options';
import { getToken } from 'firebase/messaging';
import { messaging, db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useNotifications } from '@/hooks/use-notifications';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { translations } from '@/lib/translations';
import { useEvents } from '@/hooks/use-events';
import { parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import { NavPageHeader, PageSection } from '@/components/ui/page-layout';
import { formatAppDate, getAppLocale } from '@/lib/formatting';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { calculatePlanProgressPercent } from '@/lib/reading-utils';
import { ProfileIdentityCard } from '@/components/profile/profile-identity-card';
import { UnlockedHalosGrid } from '@/components/profile/unlocked-halos-grid';
import { AppearanceSettings } from '@/components/profile/appearance-settings';
import { ProfileHubTabs, isProfileTabId, type ProfileTabId } from '@/components/profile/profile-hub-tabs';
import type { AvatarCosmeticTier } from '@/lib/avatar-cosmetics';
import { AVATAR_COSMETIC_TIERS, isHaloTierUnlocked } from '@/lib/avatar-cosmetics';
import { sanitizeAvatarData } from '@/lib/avatar-utils';
import { canMemberChangeOwnAvatar } from '@/lib/avatar-curator';



type PushSupportState = 'SUPPORTED' | 'NEEDS_PWA_INSTALL' | 'NEEDS_PERMISSION' | 'DENIED' | 'UNSUPPORTED' | 'LOADING';

export default function ProfilePage() {
  const { currentUser, loadingAuth, signOutUser, updateUserProfile } = useAuth();
  const { patchUsers } = useAllUsers();
  const { events, loading: loadingEvents } = useEvents();
  const router = useRouter();
  const searchParams = useClientSearchParams();
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
  const [activeTab, setActiveTab] = useState<ProfileTabId>('profile');
  const { createNotification } = useNotifications();
  const { completedPassages } = useUserBibleChecklist();
  const { plan } = useBiblePlan();

  const planProgressPercent = useMemo(
    () => calculatePlanProgressPercent(plan?.dailyReadings, completedPassages),
    [plan?.dailyReadings, completedPassages],
  );

  const t = translations[preferredLanguage || 'en'];
  const locale = getAppLocale(preferredLanguage);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (isProfileTabId(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

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
     if (!canMemberChangeOwnAvatar(currentUser.avatarChangesEnabled)) {
       toast({
         variant: 'destructive',
         title: 'Photo locked',
         description: 'Your profile photo is managed by a curator.',
       });
       return;
     }
     setIsSaving(true);
     try {
       const nextAvatar = sanitizeAvatarData(
         {
           ...(currentUser.avatar || DEFAULT_AVATAR_DATA),
           ...avatarInEditor,
           cosmeticTier: avatarInEditor.cosmeticTier ?? currentUser.avatar?.cosmeticTier ?? 'none',
         },
         { firstName: currentUser.firstName, lastName: currentUser.lastName },
       );
       await updateUserProfile(currentUser.uid, { avatar: nextAvatar });
       patchUsers([{
         uid: currentUser.uid,
         firstName: currentUser.firstName ?? undefined,
         lastName: currentUser.lastName ?? undefined,
         avatar: nextAvatar,
       }]);
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

  const handleHaloTierSelect = async (tier: AvatarCosmeticTier) => {
    if (!currentUser) return;
    const tierConfig = AVATAR_COSMETIC_TIERS.find((candidate) => candidate.id === tier);
    if (tierConfig && !isHaloTierUnlocked(planProgressPercent, tierConfig)) {
      toast({
        variant: 'destructive',
        title: 'Halo locked',
        description: `Complete ${tierConfig.minPlanProgressPercent}% of the reading plan to unlock this halo.`,
      });
      return;
    }
    const nextAvatar = {
      ...(currentUser.avatar || DEFAULT_AVATAR_DATA),
      cosmeticTier: tier,
    };
    try {
      await updateUserProfile(currentUser.uid, { avatar: nextAvatar });
      patchUsers([{
        uid: currentUser.uid,
        firstName: currentUser.firstName ?? undefined,
        lastName: currentUser.lastName ?? undefined,
        avatar: nextAvatar,
      }]);
      toast({ title: "Halo Updated", description: "Avatar halo selection saved." });
    } catch (error) {
      console.error("Failed to update halo tier:", error);
      toast({ variant: "destructive", title: "Update failed", description: "Could not save halo selection." });
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

  const handleTabChange = useCallback((tab: ProfileTabId) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`/profile?${params.toString()}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [router, searchParams]);

  const pushButtonClass = "w-full sm:w-auto";

  const renderNotificationButton = useMemo(() => {
    switch (pushSupport) {
      case 'LOADING':
        return <Button disabled className={pushButtonClass}><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t.checking}</Button>;
      case 'SUPPORTED':
        if (currentUser && (!currentUser.fcmTokens || currentUser.fcmTokens.length === 0)) {
           return <Button className={pushButtonClass} onClick={handleEnableNotifications} disabled={isSubscriptionLoading}><BellRing className="mr-2 h-4 w-4" />{t.enable}</Button>;
        }
        return <div className="flex items-center text-[length:var(--app-ui-font-sm)] text-primary"><BellRing className="mr-2 h-4 w-4" />{t.enabled}</div>;
      case 'NEEDS_PERMISSION':
        return <Button className={pushButtonClass} onClick={handleEnableNotifications} disabled={isSubscriptionLoading}><BellRing className="mr-2 h-4 w-4" />{t.enable}</Button>;
      case 'NEEDS_PWA_INSTALL':
        return <div className="flex items-center text-[length:var(--app-ui-font-sm)] text-amber-500"><Download className="mr-2 h-4 w-4" />{t.addHome}</div>;
      case 'DENIED':
        return <Button disabled className={pushButtonClass}><BellOff className="mr-2 h-4 w-4" />{t.permissionDenied}</Button>;
      case 'UNSUPPORTED':
        return <Button disabled className={pushButtonClass}><AlertTriangle className="mr-2 h-4 w-4" />{t.notSupported}</Button>;
      default:
        return null;
    }
  }, [pushSupport, isSubscriptionLoading, handleEnableNotifications, currentUser, t]);
  
  if (!isMounted || loadingAuth || (!currentUser && isMounted)) return null;
  if (!currentUser) return null;

  return (
    <div className="page-container">
      <NavPageHeader />

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="stack-gap-lg"
      >
        {activeTab === 'profile' && (
          <>
            <ProfileIdentityCard
              user={currentUser}
              avatarInEditor={avatarInEditor}
              isAvatarEditorOpen={isAvatarEditorOpen}
              isSaving={isSaving}
              onAvatarEditorOpenChange={setIsAvatarEditorOpen}
              onAvatarInEditorChange={setAvatarInEditor}
              onAvatarSave={handleAvatarSave}
              avatarEditingDisabled={!canMemberChangeOwnAvatar(currentUser.avatarChangesEnabled)}
              labels={{
                customizeAvatarTitle: t.customizeAvatarTitle,
                customizeAvatarDesc: t.customizeAvatarDesc,
                editAvatar: t.editAvatar,
                profileNameChangeAdminOnly: t.profileNameChangeAdminOnly,
                cancel: t.cancel,
                save: t.save,
                avatarEditingLocked: 'Your profile photo is managed by a curator. Contact them to request a change.',
              }}
            />

            <PageSection>
              <div className="setting-row sm:items-center">
                <div className="flex items-center gap-3">
                  <Cake className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-[length:var(--app-ui-font-sm)] font-medium">{t.yourBirthday}</p>
                    <p className="text-[length:var(--app-ui-font-xs)] text-muted-foreground">
                      {birthdayEvent ? formatAppDate(parseISO(birthdayEvent.date), locale, { month: 'long', day: 'numeric' }) : t.profileBirthdayNotLinked}
                    </p>
                  </div>
                </div>
              </div>
              {!birthdayEvent && (
                <p className="text-[length:var(--app-ui-font-xs)] text-muted-foreground">{t.profileBirthdayLinkHint}</p>
              )}
            </PageSection>

            <UnlockedHalosGrid
              planProgressPercent={planProgressPercent}
              selectedHaloTier={currentUser.avatar?.cosmeticTier || 'none'}
              onHaloTierSelect={handleHaloTierSelect}
              previewAvatar={currentUser.avatar}
              labels={{
                yourHalos: t.yourHalos,
                yourHalosDesc: t.yourHalosDesc,
                haloEquipped: t.haloEquipped,
                haloTapToEquip: t.haloTapToEquip,
                haloUnlockAt: t.haloUnlockAt,
                haloPlanProgress: t.haloPlanProgress,
                haloNextUnlock: t.haloNextUnlock,
              }}
            />
          </>
        )}


        {activeTab === 'appearance' && (
          <PageSection title={t.appearance} variant="plain" className="min-w-0 overflow-hidden">
            <AppearanceSettings
              labels={{
                theme: t.theme,
                themeDesc: t.themeDesc,
                typography: t.typography,
                websiteFont: t.websiteFont,
                websiteFontSize: t.websiteFontSize,
                bibleFont: t.bibleFont,
                bibleFontSize: t.bibleFontSize,
              }}
            />
          </PageSection>
        )}

        {activeTab === 'settings' && (
          <>
            <PageSection title={t.settings}>
              <div className="setting-row sm:items-center">
                <div className="flex items-center gap-3 min-w-0">
                  <Languages className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[length:var(--app-ui-font-sm)] font-medium">{t.language}</p>
                    <p className="text-[length:var(--app-ui-font-xs)] text-muted-foreground">{t.languageDesc}</p>
                  </div>
                </div>
                <Select value={preferredLanguage} onValueChange={(val) => handleLanguageChange(val as 'en' | 'ko')}>
                  <SelectTrigger className="w-full sm:w-[7rem] rounded-xl shrink-0"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ko">한국어</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="setting-row sm:items-center">
                <div className="flex-1 min-w-0">
                  <p className="text-[length:var(--app-ui-font-sm)] font-medium">{t.communityProgressTitle}</p>
                  <p className="text-[length:var(--app-ui-font-xs)] text-muted-foreground">{t.communityVisibilityDesc}</p>
                </div>
                <Switch id="community-progress-switch" checked={showProgress} onCheckedChange={handleProgressToggle} className="shrink-0" />
              </div>

              <div className="ui-surface stack-gap">
                <div className="setting-row">
                  <div className="flex-1 min-w-0">
                    <p className="text-[length:var(--app-ui-font-sm)] font-medium">{t.pushNotifications}</p>
                    <p className="text-[length:var(--app-ui-font-xs)] text-muted-foreground">{t.pushNotificationsDesc}</p>
                  </div>
                  <div className="shrink-0 w-full sm:w-auto">{renderNotificationButton}</div>
                </div>
                {pushSupport === 'SUPPORTED' && currentUser.fcmTokens && currentUser.fcmTokens.length > 0 && (
                  <div className="stack-gap-sm">
                    <Button onClick={handleTestPush} disabled={isTestingPush} variant="outline" className="w-full rounded-xl" size="sm">
                      {isTestingPush ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} {t.testPush}
                    </Button>
                    <Button onClick={handleRepairPush} disabled={isSubscriptionLoading} variant="ghost" size="sm" className="w-full rounded-xl text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors">
                      {isSubscriptionLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <AlertTriangle className="mr-2 h-3 w-3" />} {t.repairPushNotifications}
                    </Button>
                  </div>
                )}
                {pushSupport === 'NEEDS_PWA_INSTALL' && (
                  <Alert variant="default">
                    <Download className="h-4 w-4" />
                    <AlertTitle>{t.enablePushIosHintTitle}</AlertTitle>
                    <AlertDescription>{t.enablePushIosHintDesc}</AlertDescription>
                  </Alert>
                )}
              </div>
            </PageSection>

            <Button
              onClick={handleSignOut}
              variant="ghost"
              size="sm"
              className="w-full rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 font-medium gap-2"
            >
              <LogOut className="h-4 w-4" /> {t.signOut}
            </Button>
          </>
        )}
      </motion.div>

      <ProfileHubTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        labels={{
          profile: t.profileTabProfile,
          appearance: t.profileTabAppearance,
          settings: t.profileTabSettings,
        }}
      />
    </div>
  );
}
