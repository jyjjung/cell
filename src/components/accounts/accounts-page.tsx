
"use client";

import { AppearanceSettings } from '@/components/profile/appearance-settings';
import { AccountsHubTabs, isAccountsTabId, type AccountsTabId } from '@/components/accounts/accounts-hub-tabs';
import { ProfileIdentityCard } from '@/components/profile/profile-identity-card';
import { UnlockedHalosGrid } from '@/components/profile/unlocked-halos-grid';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PageSection } from '@/components/ui/page-layout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/auth-context';
import { useAllUsers } from '@/hooks/use-all-users';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useClientSearchParams } from '@/hooks/use-client-search-params';
import { useEvents } from '@/hooks/use-events';
import { useNotifications } from '@/hooks/use-notifications';
import { useToast } from '@/hooks/use-toast';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import type { AvatarCosmeticTier } from '@/lib/avatar-cosmetics';
import { AVATAR_COSMETIC_TIERS, isHaloTierUnlocked } from '@/lib/avatar-cosmetics';
import { canMemberChangeOwnAvatar } from '@/lib/avatar-curator';
import { DEFAULT_AVATAR_DATA } from '@/lib/avatar-options';
import { sanitizeAvatarData } from '@/lib/avatar-utils';
import { buildAvatarsPatch, resolveAppUserAvatar, sanitizeNdcpcAvatar, type AvatarAppId } from '@/lib/user-avatars';
import { healFcmSubscription, MAX_FCM_TOKENS } from '@/lib/fcm-heal';
import { getFCMRegistration } from '@/lib/fcm-registration';
import { hasCellAccess, hasNdcpcAccess } from '@/lib/app-access';
import { auth, db, messagingPromise } from '@/lib/firebase';
import { formatAppDate, getAppLocale } from '@/lib/formatting';
import { calculatePlanProgressPercent } from '@/lib/reading-utils';
import { translations } from '@/lib/translations';
import type { AvatarData, NotificationAppPrefs } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { doc, updateDoc } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';
import { motion } from 'framer-motion';
import { AlertTriangle, BellOff, BellRing, Download, Languages, Loader2, LogOut, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';



type PushSupportState = 'SUPPORTED' | 'NEEDS_PWA_INSTALL' | 'NEEDS_PERMISSION' | 'DENIED' | 'UNSUPPORTED' | 'LOADING';

export function AccountsPage() {
  const { currentUser, loadingAuth, updateUserProfile, signOutUser } = useAuth();
  const { patchUsers } = useAllUsers();
  const { events } = useEvents();
  const router = useRouter();
  const searchParams = useClientSearchParams();
  const [isMounted, setIsMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingBirthday, setIsSavingBirthday] = useState(false);
  const { toast } = useToast();
  const cellAccess = hasCellAccess(currentUser);
  const ndcpcAccess = hasNdcpcAccess(currentUser);
  
  const [editingAvatarApp, setEditingAvatarApp] = useState<AvatarAppId | null>(null);
  const [avatarInEditor, setAvatarInEditor] = useState<AvatarData>(DEFAULT_AVATAR_DATA);

  const [showProgress, setShowProgress] = useState(currentUser?.showInCommunityProgress ?? true);
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'ko'>(currentUser?.preferredLanguage || 'en');
  
  const [pushSupport, setPushSupport] = useState<PushSupportState>('LOADING');
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false);
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [activeTab, setActiveTab] = useState<AccountsTabId>('profile');
  const [birthdayInput, setBirthdayInput] = useState('');
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
    if (isAccountsTabId(tabParam)) {
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
    if (isMounted && !loadingAuth && !currentUser) router.push('/login?next=/accounts');
  }, [currentUser, loadingAuth, router, isMounted]);

  const birthdayEvent = useMemo(() => {
    if (!events || !currentUser) return null;
    return events.find(e => e.category === 'Birthday' && e.userId === currentUser.uid);
  }, [events, currentUser]);

  useEffect(() => {
    if (currentUser) {
      setShowProgress(
        currentUser.preferences?.cell?.showInCommunityProgress ?? currentUser.showInCommunityProgress ?? true,
      );
      setPreferredLanguage(currentUser.preferredLanguage || 'en');
      const fromProfile = currentUser.birthday || '';
      const fromEvent = birthdayEvent?.date ? birthdayEvent.date.slice(0, 10) : '';
      setBirthdayInput(fromProfile || fromEvent);
    }
  }, [currentUser, birthdayEvent]);
  
  const openAvatarEditor = (app: AvatarAppId) => {
    if (!currentUser) return;
    setEditingAvatarApp(app);
    const resolved = resolveAppUserAvatar(currentUser, app);
    setAvatarInEditor(
      app === 'ndcpc'
        ? sanitizeNdcpcAvatar(resolved, {
            uid: currentUser.uid,
            firstName: currentUser.firstName,
            lastName: currentUser.lastName,
          })
        : { ...DEFAULT_AVATAR_DATA, ...resolved },
    );
  };

  const closeAvatarEditor = () => {
    setEditingAvatarApp(null);
  };

  const handleRepairPush = useCallback(async () => {
    if (!currentUser) return;
    setIsSubscriptionLoading(true);
    try {
        // Unregister every SW so a stale PWA worker cannot keep owning push.
        if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (const reg of regs) {
                await reg.unregister();
            }
        }

        // Force a fresh messaging SW + token rebind (covers chat + reminders).
        await healFcmSubscription(currentUser.uid, { force: true });

        toast({
            title: "Push notifications repaired",
            description: "This device is reconnected. Try Send Test next.",
        });
        setPushSupport(getPushSupportState());
    } catch (err: any) {
        console.error('Repair failed:', err);
        toast({
            variant: "destructive",
            title: "Repair failed",
            description: err?.message || "Could not refresh push on this device.",
        });
    } finally {
        setIsSubscriptionLoading(false);
    }
  }, [currentUser, toast, getPushSupportState]);


  const handleEnableNotifications = useCallback(async () => {
    if (!currentUser) return;
    const messaging = await messagingPromise;
    if (!messaging) {
      toast({
        variant: 'destructive',
        title: 'Not supported',
        description: 'Push notifications are not available in this browser.',
      });
      return;
    }

    setIsSubscriptionLoading(true);

    try {
        const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY!;
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            const registration = await getFCMRegistration();
            if (!registration) {
                throw new Error("This browser blocked the notification service worker.");
            }
            const currentToken = await getToken(messaging, { 
                vapidKey,
                serviceWorkerRegistration: registration 
            });
            
            if (currentToken) {
                // Preserve tokens from other devices (up to MAX_FCM_TOKENS).
                const existing = currentUser.fcmTokens || [];
                const filtered = existing.filter(t => t !== currentToken);
                const newList = [currentToken, ...filtered].slice(0, MAX_FCM_TOKENS);
                await updateDoc(doc(db, 'users', currentUser.uid), {
                  fcmTokens: newList,
                });
                try {
                  await updateDoc(doc(db, 'users', currentUser.uid), { fcmNeedsResync: false });
                } catch {
                  // optional heal metadata
                }
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
        relatedUrl: '/accounts'
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



  const handleAvatarSave = async () => {
     if (!currentUser || !editingAvatarApp) return;
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
       const existing = resolveAppUserAvatar(currentUser, editingAvatarApp);
       const merged: AvatarData = {
         ...existing,
         ...avatarInEditor,
         ...(editingAvatarApp === 'cell'
           ? { cosmeticTier: avatarInEditor.cosmeticTier ?? existing.cosmeticTier ?? 'none' }
           : { cosmeticTier: 'none' as const }),
       };
       const nextAvatar = editingAvatarApp === 'ndcpc'
         ? sanitizeNdcpcAvatar(merged, {
             uid: currentUser.uid,
             firstName: currentUser.firstName,
             lastName: currentUser.lastName,
           })
         : sanitizeAvatarData(merged, { firstName: currentUser.firstName, lastName: currentUser.lastName });
       const patch = buildAvatarsPatch(currentUser, editingAvatarApp, nextAvatar);
       await updateUserProfile(currentUser.uid, patch);
       if (editingAvatarApp === 'cell') {
         patchUsers([{
           uid: currentUser.uid,
           firstName: currentUser.firstName ?? undefined,
           lastName: currentUser.lastName ?? undefined,
           avatar: patch.avatar,
         }]);
       }
       closeAvatarEditor();
     } catch (error) { console.error("Failed to update avatar:", error); }
     finally { setIsSaving(false); }
  };

  const handleProgressToggle = async (isChecked: boolean) => {
    if (!currentUser) return;
    setShowProgress(isChecked);
    try {
      await updateUserProfile(currentUser.uid, {
        showInCommunityProgress: isChecked,
        preferences: {
          ...currentUser.preferences,
          cell: {
            ...currentUser.preferences?.cell,
            showInCommunityProgress: isChecked,
          },
        },
      });
    } catch (error) {
      console.error("Failed to update progress visibility:", error);
      setShowProgress(!isChecked);
    }
  };

  const defaultNotificationPrefs = (): NotificationAppPrefs => ({
    chat: true,
    announcements: true,
    dutyReminders: true,
    rosterReminders: true,
  });

  const cellNotificationPrefs = {
    ...defaultNotificationPrefs(),
    ...currentUser?.preferences?.notifications?.cell,
  };
  const ndcpcNotificationPrefs = {
    ...defaultNotificationPrefs(),
    ...currentUser?.preferences?.notifications?.ndcpc,
  };

  const updateNotificationPref = async (
    app: 'cell' | 'ndcpc',
    key: keyof NotificationAppPrefs,
    value: boolean,
  ) => {
    if (!currentUser) return;
    const next = {
      ...currentUser.preferences?.notifications,
      [app]: {
        ...(app === 'cell' ? cellNotificationPrefs : ndcpcNotificationPrefs),
        [key]: value,
      },
    };
    await updateUserProfile(currentUser.uid, {
      preferences: {
        ...currentUser.preferences,
        notifications: next,
      },
    });
  };

  const handleBirthdaySave = async () => {
    if (!currentUser || !birthdayInput) return;
    setIsSavingBirthday(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Not authenticated');
      const res = await fetch('/api/profile/birthday', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ birthday: birthdayInput }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save birthday');
      }
      await updateUserProfile(currentUser.uid, { birthday: birthdayInput });
      toast({ title: 'Birthday saved', description: 'Your birthday is updated for all apps.' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not save birthday';
      toast({ variant: 'destructive', title: 'Save failed', description: message });
    } finally {
      setIsSavingBirthday(false);
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
    const cellAvatar = resolveAppUserAvatar(currentUser, 'cell');
    const nextAvatar = {
      ...cellAvatar,
      cosmeticTier: tier,
    };
    const patch = buildAvatarsPatch(currentUser, 'cell', nextAvatar);
    try {
      await updateUserProfile(currentUser.uid, patch);
      patchUsers([{
        uid: currentUser.uid,
        firstName: currentUser.firstName ?? undefined,
        lastName: currentUser.lastName ?? undefined,
        avatar: patch.avatar,
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

  const handleTabChange = useCallback((tab: AccountsTabId) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`/accounts?${params.toString()}`, { scroll: false });
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
    <div className="page-container pb-24">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="stack-gap-lg"
      >
        {activeTab === 'profile' && (
          <>
            {cellAccess ? (
              <ProfileIdentityCard
                user={currentUser}
                avatar={resolveAppUserAvatar(currentUser, 'cell')}
                appLabel={ndcpcAccess ? 'em.' : undefined}
                showHalo
                showIdentity
                avatarInEditor={avatarInEditor}
                isAvatarEditorOpen={editingAvatarApp === 'cell'}
                isSaving={isSaving}
                onAvatarEditorOpenChange={(open) => (open ? openAvatarEditor('cell') : closeAvatarEditor())}
                onAvatarInEditorChange={setAvatarInEditor}
                onAvatarSave={handleAvatarSave}
                avatarEditingDisabled={!canMemberChangeOwnAvatar(currentUser.avatarChangesEnabled)}
                labels={{
                  customizeAvatarTitle: t.customizeAvatarTitle,
                  customizeAvatarDesc: ndcpcAccess
                    ? 'Profile photo for em. — halos appear here only.'
                    : t.customizeAvatarDesc,
                  editAvatar: t.editAvatar,
                  profileNameChangeAdminOnly: t.profileNameChangeAdminOnly,
                  cancel: t.cancel,
                  save: t.save,
                  avatarEditingLocked: 'Your profile photo is managed by a curator. Contact them to request a change.',
                }}
              />
            ) : null}

            {ndcpcAccess ? (
              <ProfileIdentityCard
                user={currentUser}
                avatar={resolveAppUserAvatar(currentUser, 'ndcpc')}
                appLabel={cellAccess ? 'NDC Preschool' : undefined}
                showHalo={false}
                showIdentity={!cellAccess}
                avatarInEditor={avatarInEditor}
                isAvatarEditorOpen={editingAvatarApp === 'ndcpc'}
                isSaving={isSaving}
                onAvatarEditorOpenChange={(open) => (open ? openAvatarEditor('ndcpc') : closeAvatarEditor())}
                onAvatarInEditorChange={setAvatarInEditor}
                onAvatarSave={handleAvatarSave}
                avatarEditingDisabled={!canMemberChangeOwnAvatar(currentUser.avatarChangesEnabled)}
                editorVariant="ndcpc-photo"
                labels={{
                  customizeAvatarTitle: t.customizeAvatarTitle,
                  customizeAvatarDesc: cellAccess
                    ? 'Upload a photo or use the default avatar for NDC Preschool.'
                    : t.customizeAvatarDesc,
                  editAvatar: t.editAvatar,
                  profileNameChangeAdminOnly: t.profileNameChangeAdminOnly,
                  cancel: t.cancel,
                  save: t.save,
                  avatarEditingLocked: 'Your profile photo is managed by a curator. Contact them to request a change.',
                }}
              />
            ) : null}

            <PageSection title={t.yourBirthday}>
              <div className="stack-gap-sm">
                <Label htmlFor="birthday-input" className="text-micro-label">{t.birthday}</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    id="birthday-input"
                    type="date"
                    value={birthdayInput}
                    onChange={(e) => setBirthdayInput(e.target.value)}
                    className="h-10 rounded-lg sm:max-w-xs"
                  />
                  <Button
                    type="button"
                    onClick={() => void handleBirthdaySave()}
                    disabled={isSavingBirthday || !birthdayInput}
                    className="sm:w-auto"
                  >
                    {isSavingBirthday ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save birthday
                  </Button>
                </div>
                <p className="text-[length:var(--app-ui-font-xs)] text-muted-foreground">
                  Used across em. and NDC Preschool schedules.
                </p>
              </div>
            </PageSection>

            {cellAccess ? (
              <UnlockedHalosGrid
                planProgressPercent={planProgressPercent}
                selectedHaloTier={resolveAppUserAvatar(currentUser, 'cell').cosmeticTier || 'none'}
                onHaloTierSelect={handleHaloTierSelect}
                previewAvatar={resolveAppUserAvatar(currentUser, 'cell')}
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
            ) : null}

            <PageSection title={t.signOut}>
              <Button
                type="button"
                variant="destructive"
                className="rounded-lg"
                onClick={() => void signOutUser()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t.signOut}
              </Button>
            </PageSection>
          </>
        )}

        {activeTab === 'appearance' && (
          <PageSection title={t.appearance} variant="plain" className="min-w-0 overflow-hidden">
            <p className="mb-4 text-sm text-muted-foreground">Theme applies to em. and NDC Preschool.</p>
            <AppearanceSettings
              labels={{
                theme: t.theme,
                themeDesc: t.themeDesc,
              }}
            />
          </PageSection>
        )}

        {activeTab === 'apps' && (
          <>
            <PageSection title="All apps">
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
            </PageSection>

            {cellAccess ? (
              <PageSection title="em.">
                <div className="setting-row sm:items-center">
                  <div className="flex-1 min-w-0">
                    <p className="text-[length:var(--app-ui-font-sm)] font-medium">{t.communityProgressTitle}</p>
                    <p className="text-[length:var(--app-ui-font-xs)] text-muted-foreground">{t.communityVisibilityDesc}</p>
                  </div>
                  <Switch id="community-progress-switch" checked={showProgress} onCheckedChange={handleProgressToggle} className="shrink-0" />
                </div>
              </PageSection>
            ) : null}

            {ndcpcAccess ? (
              <PageSection title="NDC Preschool">
                <p className="text-sm text-muted-foreground">
                  Preschool-specific preferences will appear here as more features migrate into the community hub.
                </p>
              </PageSection>
            ) : null}
          </>
        )}

        {activeTab === 'notifications' && (
          <>
            <PageSection title="This device">
              <div className="ui-surface stack-gap">
                <div className="setting-row">
                  <div className="flex-1 min-w-0">
                    <p className="text-[length:var(--app-ui-font-sm)] font-medium">{t.pushNotifications}</p>
                    <p className="text-[length:var(--app-ui-font-xs)] text-muted-foreground">{t.pushNotificationsDesc}</p>
                  </div>
                  <div className="shrink-0 w-full sm:w-auto">{renderNotificationButton}</div>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 stack-gap-sm">
                  <p className="text-[length:var(--app-ui-font-xs)] font-medium text-foreground">{t.pushHealthTitle}</p>
                  <ul className="text-[length:var(--app-ui-font-xs)] text-muted-foreground space-y-1">
                    <li>
                      {t.pushHealthPermission}:{' '}
                      {typeof Notification !== 'undefined' && Notification.permission === 'granted'
                        ? t.pushHealthGranted
                        : typeof Notification !== 'undefined'
                          ? Notification.permission
                          : t.pushHealthUnknown}
                    </li>
                    <li>
                      {t.pushHealthToken}:{' '}
                      {currentUser.fcmTokens && currentUser.fcmTokens.length > 0
                        ? `${t.pushHealthOk} (${currentUser.fcmTokens.length})`
                        : t.pushHealthMissing}
                    </li>
                    <li>
                      {t.pushHealthNeedsResync}:{' '}
                      {currentUser.fcmNeedsResync ? t.pushHealthNeedsResync : t.pushHealthOk}
                    </li>
                    <li>
                      {t.pushHealthLastHealed}:{' '}
                      {currentUser.fcmLastHealedAt?.toDate
                        ? formatAppDate(currentUser.fcmLastHealedAt.toDate(), locale, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })
                        : t.pushHealthUnknown}
                    </li>
                  </ul>
                  {(currentUser.fcmNeedsResync ||
                    !currentUser.fcmTokens ||
                    currentUser.fcmTokens.length === 0) && (
                    <p className="text-[length:var(--app-ui-font-xs)] text-amber-700 dark:text-amber-400">
                      {t.pushHealthTroubleshoot}
                    </p>
                  )}
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
                {(pushSupport === 'SUPPORTED' || pushSupport === 'NEEDS_PERMISSION') &&
                  (!currentUser.fcmTokens || currentUser.fcmTokens.length === 0 || currentUser.fcmNeedsResync) && (
                    <Button
                      onClick={handleRepairPush}
                      disabled={isSubscriptionLoading}
                      variant="outline"
                      size="sm"
                      className="w-full rounded-xl"
                    >
                      {isSubscriptionLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <AlertTriangle className="mr-2 h-3 w-3" />}
                      {t.repairPushNotifications}
                    </Button>
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

            {cellAccess ? (
              <PageSection title="em. notifications">
                <NotificationPrefRow label="Chat messages" checked={cellNotificationPrefs.chat ?? true} onCheckedChange={(v) => void updateNotificationPref('cell', 'chat', v)} />
                <NotificationPrefRow label="Announcements" checked={cellNotificationPrefs.announcements ?? true} onCheckedChange={(v) => void updateNotificationPref('cell', 'announcements', v)} />
                <NotificationPrefRow label="Duty reminders" checked={cellNotificationPrefs.dutyReminders ?? true} onCheckedChange={(v) => void updateNotificationPref('cell', 'dutyReminders', v)} />
              </PageSection>
            ) : null}

            {ndcpcAccess ? (
              <PageSection title="NDC Preschool notifications">
                <NotificationPrefRow label="Team chat" checked={ndcpcNotificationPrefs.chat ?? true} onCheckedChange={(v) => void updateNotificationPref('ndcpc', 'chat', v)} />
                <NotificationPrefRow label="Announcements" checked={ndcpcNotificationPrefs.announcements ?? true} onCheckedChange={(v) => void updateNotificationPref('ndcpc', 'announcements', v)} />
                <NotificationPrefRow label="Roster reminders" checked={ndcpcNotificationPrefs.rosterReminders ?? true} onCheckedChange={(v) => void updateNotificationPref('ndcpc', 'rosterReminders', v)} />
              </PageSection>
            ) : null}
          </>
        )}
      </motion.div>

      <AccountsHubTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        labels={{
          profile: t.profileTabProfile,
          appearance: t.profileTabAppearance,
          apps: 'Apps',
          notifications: 'Alerts',
        }}
      />
    </div>
  );
}

function NotificationPrefRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <div className="setting-row sm:items-center">
      <p className="text-[length:var(--app-ui-font-sm)] font-medium">{label}</p>
      <Switch checked={checked} onCheckedChange={onCheckedChange} className="shrink-0" />
    </div>
  );
}
