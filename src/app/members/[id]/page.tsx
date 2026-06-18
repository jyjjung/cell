"use client";

import { useMemo, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAllUsers } from '@/hooks/use-all-users';
import { useMemberCommunityProgress } from '@/hooks/use-community-progress';
import { useRoles } from '@/hooks/use-roles';
import { useEvents } from '@/hooks/use-events';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useAuth } from '@/contexts/auth-context';
import { PixelAvatar } from '@/components/avatar/PixelAvatar';
import { translations } from '@/lib/translations';
import { PageHeader } from '@/components/ui/page-layout';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { 
  User as UserIcon, 
  Cake, 
  BookOpen, 
  Trophy, 
  Shield, 
  Calendar,
  ChevronLeft
} from 'lucide-react';
import { format, parseISO, isValid, startOfDay, isBefore, isSameDay } from 'date-fns';
import { toDateSafe } from '@/lib/firestore-timestamp';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import HiddenAchievements from '@/components/profile/hidden-achievements';

export default function MemberProfilePage() {
  const params = useParams();
  const userId = params.id as string;
  const router = useRouter();
  const { allUsers, loading: usersLoading, ensureUsers } = useAllUsers();
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
    if (!plan?.dailyReadings) return 0;
    const today = startOfDay(new Date());
    return plan.dailyReadings
      .filter(r => {
        try {
          const d = parseISO(r.date);
          return isValid(d) && (isBefore(d, today) || isSameDay(d, today));
        } catch {
          return false;
        }
      })
      .reduce((acc, day) => acc + (day.passages?.filter(p => p?.displayText && !p.displayText.startsWith('Error:'))?.length ?? 0), 0);
  }, [plan]);

  const completedCount = progress?.completedCount ?? progress?.completedPassages?.length ?? 0;

  const progressPercentage = useMemo(() => {
    if (!progress || totalPassagesToDate === 0) return 0;
    return parseFloat(((completedCount / totalPassagesToDate) * 100).toFixed(1));
  }, [progress, completedCount, totalPassagesToDate]);

  const isLoading = !isMounted || usersLoading || progressLoading || rolesLoading || eventsLoading || planLoading;

  if (isLoading) {
    return (
      <div className="page-container max-w-3xl space-y-8 pb-32">
        <Skeleton className="h-10 w-24 rounded-xl" />
        <div className="flex flex-col items-center space-y-4">
          <Skeleton className="h-32 w-32 rounded-[2.5rem]" />
          <Skeleton className="h-8 w-48 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
        </div>
        <Skeleton className="h-48 rounded-3xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <p className="text-zinc-900 dark:text-zinc-100">User not found.</p>
        <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const userRoles = (user.roleIds || []).map(id => rolesMap.get(id)).filter(Boolean) as string[];

  return (
    <div className="page-container max-w-3xl space-y-8 pb-32">
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
          {t.back || 'Back'}
        </Button>
      </motion.div>

      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center text-center space-y-6"
      >
        <div className="relative group">
          <div className="h-32 w-32 rounded-full border-4 border-card shadow-2xl bg-muted relative z-10">
            <PixelAvatar avatar={user.avatar} />
          </div>
          <div className="absolute -inset-4 bg-primary/10 rounded-full blur-2xl -z-0 opacity-50 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight">{user.firstName} {user.lastName}</h1>
          {user.isAdmin && (
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 mt-2">
              <Shield className="h-3 w-3 mr-1" /> Admin
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className={`grid grid-cols-1 ${user.showInCommunityProgress !== false ? 'sm:grid-cols-2' : ''} gap-4`}>
        {user.showInCommunityProgress !== false && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-3xl border border-border/40 bg-card/50 backdrop-blur-sm space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-bold text-sm">{t.bibleReading || 'Bible Reading'}</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-2xl font-black">{completedCount}</span>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">/ {totalPassagesToDate} {t.passages || 'passages'}</span>
              </div>
              <Progress value={Math.min(progressPercentage, 100)} className="h-2" />
              <p className="text-[11px] font-bold text-primary">{progressPercentage}% {t.complete || 'Complete'}</p>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-3xl border border-border/40 bg-card/50 backdrop-blur-sm space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-muted">
              <Cake className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-bold text-sm">{t.birthday || 'Birthday'}</h3>
          </div>
          <div className="pt-1">
            <p className="text-2xl font-black">{userBirthday || t.notAvailable || 'Not Available'}</p>
            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-1">{t.celebrationDate || 'Annual Celebration'}</p>
          </div>
        </motion.div>
      </div>

      {/* Groups/Roles */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-6 rounded-3xl border border-border/40 bg-card/50 backdrop-blur-sm space-y-6"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10">
            <Shield className="h-5 w-5 text-amber-500" />
          </div>
          <h3 className="font-bold text-sm">{t.groupsAndRoles || 'Groups & Roles'}</h3>
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
              {t.member || 'Member'}
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Hidden Achievements */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="p-6 rounded-3xl border border-border/40 bg-card/50 backdrop-blur-sm"
      >
        <HiddenAchievements
          userId={user.uid}
          completedPassageKeys={progress?.completedPassages || []}
          unlockedSecrets={user.unlockedSecrets}
          lockedLimit={6}
        />
      </motion.div>

      {/* Extra Info */}
      {user.showInCommunityProgress !== false && toDateSafe(progress?.updatedAt) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 gap-4"
        >
          <div className="p-4 rounded-2xl bg-muted border border-border/20 flex items-center gap-3">
            <Trophy className="h-4 w-4 text-primary" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-black text-zinc-800 dark:text-zinc-200 tracking-widest">Last Reading</p>
              <p className="text-xs font-bold truncate">
                {format(toDateSafe(progress.updatedAt)!, 'MMM d, h:mm a')}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
