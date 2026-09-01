"use client";

import { useMemo } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AVATAR_COSMETIC_TIERS,
  getCosmeticTierProgress,
  getHaloTierUnlockProgress,
  isHaloTierUnlocked,
  type AvatarCosmeticTier,
} from "@/lib/avatar-cosmetics";
import { PixelAvatar } from "@/components/avatar/PixelAvatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { AvatarData } from "@/types";
import { DEFAULT_AVATAR_DATA } from "@/lib/avatar-options";

type UnlockedHalosGridProps = {
  planProgressPercent: number;
  selectedHaloTier?: AvatarCosmeticTier;
  onHaloTierSelect?: (tier: AvatarCosmeticTier) => void;
  previewAvatar?: AvatarData | null;
  labels: {
    yourHalos: string;
    yourHalosDesc: string;
    haloEquipped: string;
    haloTapToEquip: string;
    haloUnlockAt: (percent: number) => string;
    haloPlanProgress: (percent: number) => string;
    haloNextUnlock: (percent: number, label: string) => string;
  };
};

export function UnlockedHalosGrid({
  planProgressPercent,
  selectedHaloTier,
  onHaloTierSelect,
  previewAvatar,
  labels,
}: UnlockedHalosGridProps) {
  const tierProgress = useMemo(
    () => getCosmeticTierProgress(planProgressPercent),
    [planProgressPercent],
  );

  const baseAvatar = useMemo(
    () => ({
      ...DEFAULT_AVATAR_DATA,
      ...(previewAvatar || {}),
    }),
    [previewAvatar],
  );

  if (!onHaloTierSelect) return null;

  return (
    <div className="ui-card stack-gap">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{labels.yourHalos}</h2>
          <p className="text-xs text-muted-foreground mt-1">{labels.yourHalosDesc}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold tabular-nums">{planProgressPercent}%</p>
          <p className="text-micro-label text-muted-foreground">
            {labels.haloPlanProgress(planProgressPercent)}
          </p>
        </div>
      </div>

      {tierProgress.next && (
        <div className="ui-surface space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-muted-foreground">
              {labels.haloNextUnlock(tierProgress.percentNeededForNext, tierProgress.next.label)}
            </span>
            <span className="font-semibold tabular-nums">{Math.round(tierProgress.progressToNext * 100)}%</span>
          </div>
          <Progress value={tierProgress.progressToNext * 100} className="h-1.5" />
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {AVATAR_COSMETIC_TIERS.map((tier) => {
          const unlocked = isHaloTierUnlocked(planProgressPercent, tier);
          const selected = (selectedHaloTier || "none") === tier.id;
          const unlockProgress = getHaloTierUnlockProgress(planProgressPercent, tier);
          const avatarWithTier = { ...baseAvatar, cosmeticTier: tier.id };

          return (
            <Button
              key={tier.id}
              type="button"
              variant="ghost"
              disabled={!unlocked}
              onClick={() => unlocked && onHaloTierSelect(tier.id)}
              className={cn(
                "relative h-auto min-h-11 w-full flex-col items-center gap-2 rounded-xl border p-3 text-left",
                unlocked
                  ? selected
                    ? "border-primary bg-primary/10 ring-2 ring-primary/25"
                    : "border-border/60 bg-background/30 hover:border-primary/40 hover:bg-background/50"
                  : "border-border/40 bg-muted/20 cursor-not-allowed opacity-80",
              )}
              aria-pressed={selected}
              aria-disabled={!unlocked}
            >
              <div className={cn("relative h-16 w-16 shrink-0", !unlocked && "opacity-50 grayscale")}>
                <PixelAvatar avatar={avatarWithTier} className="h-full w-full" />
                {!unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/40">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="min-w-0 w-full text-center">
                <p className="text-[length:var(--app-ui-font-xs)] font-semibold leading-tight truncate">{tier.label}</p>
                {unlocked ? (
                  <p className="text-[length:var(--app-ui-font-xs)] text-muted-foreground mt-0.5">
                    {selected ? labels.haloEquipped : labels.haloTapToEquip}
                  </p>
                ) : (
                  <div className="mt-1.5 space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground">
                      {labels.haloUnlockAt(tier.minPlanProgressPercent)}
                    </p>
                    <Progress value={unlockProgress * 100} className="h-1" />
                  </div>
                )}
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
