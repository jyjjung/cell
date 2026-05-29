"use client";

import { useMemo } from 'react';
import { Loader2, MessageCircle, Sparkles, BookOpen, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAchievementProgress, getUnlockedAchievements, HIDDEN_ACHIEVEMENTS, type AchievementId } from '@/lib/achievements';
import { useUserAchievementStats } from '@/hooks/use-user-achievement-stats';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { calculatePlanProgressPercent } from '@/lib/reading-utils';
import { AVATAR_COSMETIC_TIERS, getCosmeticTierProgress, type AvatarCosmeticTier } from '@/lib/avatar-cosmetics';
import { Progress } from '@/components/ui/progress';
import { PixelAvatar } from '@/components/avatar/PixelAvatar';
import type { AvatarData } from '@/types';
import { DEFAULT_AVATAR_DATA } from '@/lib/avatar-options';
interface HiddenAchievementsProps {
  userId: string;
  completedPassageKeys: string[];
  unlockedSecrets?: string[];
  className?: string;
  lockedLimit?: number;
  /** Own profile settings only: show achievement descriptions */
  showDescriptions?: boolean;
  /** Own profile settings only: halo picker to equip unlocked cosmetics */
  allowHaloSelection?: boolean;
  selectedHaloTier?: AvatarCosmeticTier;
  onHaloTierSelect?: (tier: AvatarCosmeticTier) => void;
  previewAvatar?: AvatarData | null;
}

function iconForAchievement(id: AchievementId) {
  if (id.startsWith('bible-')) return BookOpen;
  if (id.startsWith('bible-pct-')) return BookOpen;
  if (id.startsWith('messages-')) return MessageCircle;
  if (id.startsWith('feedback-')) return Lightbulb;
  if (id.startsWith('click-') || id.startsWith('secret-')) return Sparkles;
  return Sparkles;
}

const SECRET_LOCKED_HINT = 'A surprise waiting to be found.';

export default function HiddenAchievements({
  userId,
  completedPassageKeys,
  unlockedSecrets = [],
  className,
  lockedLimit = 8,
  showDescriptions = false,
  allowHaloSelection = false,
  selectedHaloTier,
  onHaloTierSelect,
  previewAvatar,
}: HiddenAchievementsProps) {
  const { plan } = useBiblePlan();
  const { messageCount, feedbackCount, clickMeCount, loading } = useUserAchievementStats(userId, true);
  const planProgressPercent = useMemo(
    () => calculatePlanProgressPercent(plan?.dailyReadings, completedPassageKeys),
    [plan?.dailyReadings, completedPassageKeys],
  );
  const stats = {
    planProgressPercent,
    messageCount,
    feedbackCount,
    clickMeCount,
    unlockedSecrets,
  };
  const unlocked = getUnlockedAchievements(stats);
  const unlockedIds = new Set(unlocked.map((item) => item.id));

  const secretAchievements = useMemo(
    () => HIDDEN_ACHIEVEMENTS.filter((achievement) => achievement.metric === 'secret'),
    [],
  );
  const unlockedNonSecrets = unlocked.filter((achievement) => achievement.metric !== 'secret');
  const lockedNonSecrets = HIDDEN_ACHIEVEMENTS
    .filter((achievement) => achievement.metric !== 'secret' && !unlockedIds.has(achievement.id))
    .map((achievement) => ({
      achievement,
      progress: getAchievementProgress(stats, achievement),
    }))
    .sort((a, b) => b.progress - a.progress)
    .slice(0, lockedLimit);

  const tierProgress = getCosmeticTierProgress(unlocked.length);

  const baseAvatar = useMemo(
    () => ({
      ...DEFAULT_AVATAR_DATA,
      ...(previewAvatar || {}),
    }),
    [previewAvatar],
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs uppercase font-black text-zinc-800 dark:text-zinc-200 tracking-widest">
          Hidden Achievements
        </h3>
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-700 dark:text-zinc-300" />}
      </div>

      {allowHaloSelection && onHaloTierSelect && (
        <div className="rounded-2xl border border-border/60 bg-muted px-3 py-2 space-y-2">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-200">
              Avatar Cosmetics
            </p>
            <p className="mt-1 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              {unlocked.length} achievements unlocked · {tierProgress.current.label}
            </p>
            {tierProgress.next ? (
              <p className="mt-0.5 text-[11px] text-zinc-700 dark:text-zinc-300">
                {tierProgress.achievementsNeededForNext} more to unlock {tierProgress.next.label}
              </p>
            ) : (
              <p className="mt-0.5 text-[11px] text-zinc-700 dark:text-zinc-300">
                Highest cosmetic tier reached
              </p>
            )}
            <p className="mt-0.5 text-[11px] text-zinc-700 dark:text-zinc-300">
              Choose a halo to equip on your profile picture.
            </p>
          </div>
          {tierProgress.next && (
            <Progress value={tierProgress.progressToNext * 100} className="h-1.5" />
          )}
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {AVATAR_COSMETIC_TIERS.map((tier) => {
              const isTierUnlocked = unlocked.length >= tier.minUnlocked;
              const selected = (selectedHaloTier || 'none') === tier.id;
              const avatarWithTier = { ...baseAvatar, cosmeticTier: tier.id };

              return (
                <button
                  key={tier.id}
                  type="button"
                  aria-disabled={!isTierUnlocked}
                  onClick={() => {
                    if (!isTierUnlocked) return;
                    onHaloTierSelect(tier.id);
                  }}
                  className={cn(
                    "w-full rounded-xl border px-2 py-1.5 text-left transition-colors",
                    selected ? "border-primary bg-primary/10" : "border-border/50 bg-background/40",
                    isTierUnlocked ? "hover:bg-muted/40" : "cursor-not-allowed",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 shrink-0 rounded-full bg-background/60">
                      <PixelAvatar avatar={avatarWithTier} className="h-full w-full" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                        {tier.label}
                      </p>
                      <p className="text-[10px] text-zinc-700 dark:text-zinc-300">
                        {!isTierUnlocked
                          ? `Unlock at ${tier.minUnlocked} achievements`
                          : selected
                            ? 'Equipped'
                            : 'Tap to equip'}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {unlockedNonSecrets.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {unlockedNonSecrets.map((achievement) => {
            const Icon = iconForAchievement(achievement.id);
            return (
              <div
                key={achievement.id}
                className="rounded-2xl border border-border/60 bg-muted px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{achievement.title}</span>
                </div>
                {showDescriptions && (
                  <p className="mt-1 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                    {achievement.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Keep going — hidden badges unlock as activity milestones are reached.
        </p>
      )}

      {secretAchievements.length > 0 ? (
        <div className="space-y-2 pt-2">
          <p className="text-[11px] font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-300">
            Secret Discoveries
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {secretAchievements.map((achievement) => {
              const isUnlocked = unlockedIds.has(achievement.id);
              const Icon = iconForAchievement(achievement.id);
              return (
                <div
                  key={achievement.id}
                  className={cn(
                    'rounded-2xl border px-3 py-2.5',
                    isUnlocked
                      ? 'border-border/60 bg-muted'
                      : 'border-border/50 bg-muted/70 opacity-80',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={cn('h-3.5 w-3.5', isUnlocked ? 'text-primary' : 'text-zinc-700 dark:text-zinc-300')} />
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {isUnlocked ? achievement.title : '???'}
                    </span>
                  </div>
                  {showDescriptions && (
                    <p className="mt-1 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                      {isUnlocked ? achievement.description : SECRET_LOCKED_HINT}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {allowHaloSelection && lockedNonSecrets.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-[11px] font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-300">
            Still Locked
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {lockedNonSecrets.map(({ achievement, progress }) => {
              const Icon = iconForAchievement(achievement.id);
              return (
                <div
                  key={achievement.id}
                  className="rounded-2xl border border-border/50 bg-muted/70 px-3 py-2.5 opacity-75"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300" />
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      {achievement.title}
                    </span>
                  </div>
                  {showDescriptions && (
                    <p className="mt-1 text-[11px] text-zinc-700 dark:text-zinc-300">
                      {achievement.description}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                    Progress: {Math.round(progress * 100)}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
