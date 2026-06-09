"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUnlockedAchievements } from "@/lib/achievements";
import { useUserAchievementStats } from "@/hooks/use-user-achievement-stats";
import { useBiblePlan } from "@/hooks/use-bible-plan";
import { calculatePlanProgressPercent } from "@/lib/reading-utils";
import { useAuth } from "@/contexts/auth-context";
import { AVATAR_COSMETIC_TIERS, type AvatarCosmeticTier } from "@/lib/avatar-cosmetics";
import { PixelAvatar } from "@/components/avatar/PixelAvatar";
import type { AvatarData } from "@/types";
import { DEFAULT_AVATAR_DATA } from "@/lib/avatar-options";

type UnlockedHalosGridProps = {
  userId: string;
  completedPassageKeys: string[];
  unlockedSecrets?: string[];
  selectedHaloTier?: AvatarCosmeticTier;
  onHaloTierSelect?: (tier: AvatarCosmeticTier) => void;
  previewAvatar?: AvatarData | null;
  labels: {
    yourHalos: string;
    yourHalosDesc: string;
    haloEquipped: string;
    haloTapToEquip: string;
    noHalosYet: string;
  };
};

export function UnlockedHalosGrid({
  userId,
  completedPassageKeys,
  unlockedSecrets = [],
  selectedHaloTier,
  onHaloTierSelect,
  previewAvatar,
  labels,
}: UnlockedHalosGridProps) {
  const { currentUser } = useAuth();
  const { plan } = useBiblePlan();
  const { feedbackCount, clickMeCount, loading } = useUserAchievementStats(userId, true);

  const effectiveUnlockedSecrets =
    userId === currentUser?.uid ? (currentUser?.unlockedSecrets ?? unlockedSecrets) : unlockedSecrets;

  const unlockedCount = useMemo(() => {
    const planProgressPercent = calculatePlanProgressPercent(plan?.dailyReadings, completedPassageKeys);
    return getUnlockedAchievements({
      planProgressPercent,
      feedbackCount,
      clickMeCount,
      unlockedSecrets: effectiveUnlockedSecrets,
    }).length;
  }, [
    plan?.dailyReadings,
    completedPassageKeys,
    feedbackCount,
    clickMeCount,
    effectiveUnlockedSecrets,
  ]);

  const unlockedTiers = useMemo(
    () => AVATAR_COSMETIC_TIERS.filter((tier) => unlockedCount >= tier.minUnlocked),
    [unlockedCount]
  );

  const cosmeticTiers = useMemo(
    () => unlockedTiers.filter((tier) => tier.id !== "none"),
    [unlockedTiers]
  );

  const baseAvatar = useMemo(
    () => ({
      ...DEFAULT_AVATAR_DATA,
      ...(previewAvatar || {}),
    }),
    [previewAvatar]
  );

  if (!onHaloTierSelect) return null;

  return (
    <div className="glass-card app-card rounded-3xl stack-gap">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{labels.yourHalos}</h2>
          <p className="text-xs text-muted-foreground mt-1">{labels.yourHalosDesc}</p>
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
      </div>

      {cosmeticTiers.length === 0 && (
        <p className="text-sm text-muted-foreground rounded-2xl border border-dashed border-border/60 px-4 py-3 text-center">
          {labels.noHalosYet}
        </p>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {unlockedTiers.map((tier) => {
          const selected = (selectedHaloTier || "none") === tier.id;
          const avatarWithTier = { ...baseAvatar, cosmeticTier: tier.id };

          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => onHaloTierSelect(tier.id)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl border p-3 transition-all",
                selected
                  ? "border-primary bg-primary/10 ring-2 ring-primary/25"
                  : "border-border/60 bg-background/30 hover:border-primary/40 hover:bg-background/50"
              )}
              aria-pressed={selected}
            >
              <div className="h-16 w-16 shrink-0">
                <PixelAvatar avatar={avatarWithTier} className="h-full w-full" />
              </div>
              <div className="min-w-0 w-full text-center">
                <p className="text-[length:var(--app-ui-font-xs)] font-semibold leading-tight truncate">{tier.label}</p>
                <p className="text-[length:var(--app-ui-font-xs)] text-muted-foreground mt-0.5">
                  {selected ? labels.haloEquipped : labels.haloTapToEquip}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
