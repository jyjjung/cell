"use client";

import { PixelAvatar } from '@/components/avatar/PixelAvatar';
import { MemberAvatarCuratorPanel } from '@/components/members/member-avatar-curator-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageLoading } from '@/components/ui/loading-spinner';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/auth-context';
import { useAllUsers } from '@/hooks/use-all-users';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useMemberCommunityProgress } from '@/hooks/use-community-progress';
import { useEvents } from '@/hooks/use-events';
import { useRoles } from '@/hooks/use-roles';
import { isAvatarCurator } from '@/lib/avatar-curator';
import { toDateSafe } from '@/lib/firestore-timestamp';
import { hasCapability } from '@/lib/role-capabilities';
import { translations } from '@/lib/translations';
import { format, isValid, parseISO, startOfDay } from 'date-fns';
import { motion } from 'framer-motion';
import {
    BookOpen, Cake, ChevronLeft, Shield, Trophy
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { countPlanPassagesDueThrough } from '@/lib/reading-utils';

export default function MemberProfilePage() {
  const params = useParams();
  const userId = params.id as string;
  const router = useRouter();
  const { allUsers, loading: usersLoading, ensureUsers, patchUsers } = useAllUsers();
  const { progress, loading: progressLoading } = useMemberCommunityProgress(userId);
  const { roles, loading: rolesLoading } = useRoles();
  const { events, loading: eventsLoading } = useEvents();
  const { plan, loading: planLoading } = useBiblePlan();
  const { currentUser } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  const t = translations[currentUser?.preferredLanguage || 'en'];

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (!userId) return;
    void ensureUsers([userId]);
  }, [userId, ensureUsers]);

  const user = useMemo(() => allUsers.find(u => u.uid === userId), [allUsers, userId]);
  const rolesMap = useMemo(() => new Map(roles.map(r => [r.id, r.name])), [roles]);
  
  const userBirthday = useMemo(() => {
    const bday = events.find(e => e.category === 'Birthday' && e.userId === userId);
    if (!bday || !bday.date) return null;
    try {
      const d = parseISO(bday.date);
      return isValid(d) ? format(d, 'MMMM d') : null;
    } catch {
      return null;
    }
  }, [events, userId]);

  const totalPassagesToDate = useMemo(() => {
    return countPlanPassagesDueThrough(plan?.dailyReadings, startOfDay(new Date()));
  }, [plan]);

  const completedCount = progress?.completedCount ?? progress?.completedPassages?.length ?? 0;

  const progressPercentage = useMemo(() => {
    if (!progress || totalPassagesToDate === 0) return 0;
    return parseFloat(((completedCount / totalPassagesToDate) * 100).toFixed(1));
  }, [progress, completedCount, totalPassagesToDate]);

  const isLoading = !isMounted || usersLoading || progressLoading || rolesLoading || eventsLoading || planLoading;

  if (isLoading) {
    return <PageLoading />;
  }

  if (!user) {
    return (
      <div className="empty-inline min-h-[50vh]">
        <p className="text-foreground">{t.userNotFound}</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-3 rounded-lg">{t.goBack}</Button>
      </div>
    );
  }

  const userRoles = (user.roleIds || []).map(id => rolesMap.get(id)).filter(Boolean) as string[];
  const showCuratorPanel = isAvatarCurator(currentUser?.email);

  return (
    <div className="page-container-narrow">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center"
      >
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.back()}
          className="rounded-xl gap-1.5 text-zinc-800 dark:text-zinc-200 hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {t.back}
        </Button>
      </motion.div>

      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center text-center stack-gap-sm"
      >
        <div className="h-24 w-24 rounded-full border-2 border-border bg-muted">
          <PixelAvatar avatar={user.uid === currentUser?.uid ? currentUser?.avatar : user.avatar} />
        </div>

        <div className="stack-gap-sm">
          <h1 className="text-page-title">{user.firstName} {user.lastName}</h1>
          {hasCapability(user.capabilityKeys, 'app.admin') && (
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs px-2 py-0.5">
              <Shield className="h-3 w-3 mr-1" /> {t.admin}
            </Badge>
          )}
        </div>
      </motion.div>

      {showCuratorPanel && (
        <MemberAvatarCuratorPanel
          member={user}
          onUpdated={(patch) => {
            patchUsers([{ uid: user.uid, ...patch }]);
          }}
        />
      )}

      {/* Stats Grid */}
      <div className={`grid grid-cols-1 ${user.showInCommunityProgress !== false ? 'sm:grid-cols-2' : ''} gap-4`}>
        {user.showInCommunityProgress !== false && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="widget-surface stack-gap-sm"
          >
            <div className="panel-header mb-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <BookOpen className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-section-title text-base">{t.bibleReading}</h3>
              </div>
            </div>
            <div className="stack-gap-sm">
              <div className="flex justify-between items-end">
                <span className="text-xl font-semibold">{completedCount}</span>
                <span className="text-micro-label mb-0.5">/ {totalPassagesToDate} {t.passages}</span>
              </div>
              <Progress value={Math.min(progressPercentage, 100)} className="h-1.5" />
              <p className="text-micro-label text-primary">{progressPercentage}% {t.complete}</p>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="widget-surface stack-gap-sm"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-muted">
              <Cake className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-section-title text-base">{t.birthday}</h3>
          </div>
          <div>
            <p className="text-xl font-semibold">{userBirthday || t.notAvailable}</p>
            <p className="text-micro-label mt-0.5">{t.celebrationDate}</p>
          </div>
        </motion.div>
      </div>

      {/* Groups/Roles */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="widget-surface stack-gap-sm"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10">
            <Shield className="h-4 w-4 text-amber-500" />
          </div>
          <h3 className="text-section-title text-base">{t.groupsAndRoles}</h3>
        </div>

        <div className="flex flex-wrap gap-2">
          {userRoles.length > 0 ? (
            userRoles.map(role => (
              <Badge 
                key={role} 
                variant="outline" 
                className="px-4 py-1.5 rounded-xl border-border/60 bg-muted text-sm font-semibold"
              >
                {role}
              </Badge>
            ))
          ) : (
            <Badge 
              variant="outline" 
              className="px-4 py-1.5 rounded-xl border-border/30 opacity-50 text-sm font-medium italic"
            >
              {t.member}
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Extra Info */}
      {user.showInCommunityProgress !== false && toDateSafe(progress?.updatedAt) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 gap-4"
        >
          <div className="surface-row">
            <Trophy className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-micro-label">{t.lastReading}</p>
              <p className="text-xs font-medium truncate">
                {progress && format(toDateSafe(progress.updatedAt)!, 'MMM d, h:mm a')}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
