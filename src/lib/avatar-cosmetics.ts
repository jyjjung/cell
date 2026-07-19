import { HALO_TIER_DEFINITIONS, type GeneratedHaloTierId, type HaloPowerLevel } from '@/lib/halo-tier-definitions';

export type { HaloPowerLevel };

export type AvatarCosmeticTier = 'none' | GeneratedHaloTierId;

export type HaloStylePreset = GeneratedHaloTierId;

export type TierConfig = {
  id: AvatarCosmeticTier;
  label: string;
  /** Minimum full-plan reading progress (0–100) required to equip this halo. */
  minPlanProgressPercent: number;
  stylePreset: HaloStylePreset;
  powerLevel: HaloPowerLevel;
};

export const AVATAR_COSMETIC_TIERS: TierConfig[] = [
  {
    id: 'none',
    label: 'Standard',
    minPlanProgressPercent: 0,
    stylePreset: 'bronze',
    powerLevel: 0,
  },
  ...HALO_TIER_DEFINITIONS.map((tier) => ({
    id: tier.id as AvatarCosmeticTier,
    label: tier.label,
    minPlanProgressPercent: tier.minPlanProgressPercent,
    stylePreset: tier.id,
    powerLevel: tier.powerLevel,
  })),
];

/** Avatar diameter as % of container — lower = more halo visible around the face. Even 5% steps. */
export const HALO_AVATAR_SCALE: Record<HaloPowerLevel, string> = {
  0: '100%',
  1: '95%',
  2: '90%',
  3: '85%',
  4: '80%',
  5: '75%',
};

export function isHaloTierUnlocked(planProgressPercent: number, tier: TierConfig): boolean {
  return planProgressPercent >= tier.minPlanProgressPercent;
}

/** Progress toward unlocking a specific halo (0–1), measured from the previous tier's threshold. */
export function getHaloTierUnlockProgress(planProgressPercent: number, tier: TierConfig): number {
  if (tier.minPlanProgressPercent <= 0) return 1;
  if (planProgressPercent >= tier.minPlanProgressPercent) return 1;

  const tierIndex = AVATAR_COSMETIC_TIERS.findIndex((candidate) => candidate.id === tier.id);
  const prevThreshold = tierIndex > 0 ? AVATAR_COSMETIC_TIERS[tierIndex - 1].minPlanProgressPercent : 0;
  const span = tier.minPlanProgressPercent - prevThreshold;
  if (span <= 0) return 1;

  return Math.min(1, Math.max(0, (planProgressPercent - prevThreshold) / span));
}

function getAvatarTierByPlanProgress(planProgressPercent: number): TierConfig {
  let current = AVATAR_COSMETIC_TIERS[0];
  for (const tier of AVATAR_COSMETIC_TIERS) {
    if (planProgressPercent >= tier.minPlanProgressPercent) current = tier;
  }
  return current;
}

function getNextAvatarTierByPlanProgress(planProgressPercent: number): TierConfig | null {
  return AVATAR_COSMETIC_TIERS.find((tier) => planProgressPercent < tier.minPlanProgressPercent) || null;
}

export function getAvatarTierConfig(tier: AvatarCosmeticTier | undefined | null): TierConfig {
  return AVATAR_COSMETIC_TIERS.find((candidate) => candidate.id === tier) || AVATAR_COSMETIC_TIERS[0];
}

export function getCosmeticTierProgress(planProgressPercent: number) {
  const current = getAvatarTierByPlanProgress(planProgressPercent);
  const next = getNextAvatarTierByPlanProgress(planProgressPercent);

  if (!next) {
    return {
      current,
      next: null,
      progressToNext: 1,
      percentNeededForNext: 0,
    };
  }

  const rangeStart = current.minPlanProgressPercent;
  const rangeEnd = next.minPlanProgressPercent;
  const span = Math.max(1, rangeEnd - rangeStart);

  return {
    current,
    next,
    progressToNext: Math.min(1, Math.max(0, (planProgressPercent - rangeStart) / span)),
    percentNeededForNext: Math.max(0, rangeEnd - planProgressPercent),
  };
}
