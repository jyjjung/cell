export type AvatarCosmeticTier =
  | 'none'
  | 'bronze'
  | 'copper'
  | 'silver'
  | 'jade'
  | 'gold'
  | 'ruby'
  | 'sapphire'
  | 'diamond'
  | 'amethyst'
  | 'celestial'
  | 'master';

export type HaloStylePreset =
  | 'none'
  | 'ember'
  | 'blossom'
  | 'lunar'
  | 'verdant'
  | 'aurora'
  | 'crimson'
  | 'ocean'
  | 'cosmic'
  | 'violet'
  | 'stellar'
  | 'ethereal';

type TierConfig = {
  id: AvatarCosmeticTier;
  label: string;
  minUnlocked: number;
  stylePreset: HaloStylePreset;
};

export const AVATAR_COSMETIC_TIERS: TierConfig[] = [
  { id: 'none', label: 'Standard', minUnlocked: 0, stylePreset: 'none' },
  { id: 'bronze', label: 'Bronze Halo', minUnlocked: 3, stylePreset: 'ember' },
  { id: 'copper', label: 'Copper Halo', minUnlocked: 6, stylePreset: 'blossom' },
  { id: 'silver', label: 'Silver Halo', minUnlocked: 10, stylePreset: 'lunar' },
  { id: 'jade', label: 'Jade Halo', minUnlocked: 14, stylePreset: 'verdant' },
  { id: 'gold', label: 'Gold Halo', minUnlocked: 18, stylePreset: 'aurora' },
  { id: 'ruby', label: 'Ruby Halo', minUnlocked: 22, stylePreset: 'crimson' },
  { id: 'sapphire', label: 'Sapphire Halo', minUnlocked: 26, stylePreset: 'ocean' },
  { id: 'diamond', label: 'Diamond Halo', minUnlocked: 32, stylePreset: 'cosmic' },
  { id: 'amethyst', label: 'Amethyst Halo', minUnlocked: 38, stylePreset: 'violet' },
  { id: 'celestial', label: 'Celestial Halo', minUnlocked: 44, stylePreset: 'stellar' },
  { id: 'master', label: 'Master Halo', minUnlocked: 50, stylePreset: 'ethereal' },
];

export function getAvatarTierByUnlocked(unlockedCount: number): TierConfig {
  let current = AVATAR_COSMETIC_TIERS[0];
  for (const tier of AVATAR_COSMETIC_TIERS) {
    if (unlockedCount >= tier.minUnlocked) current = tier;
  }
  return current;
}

export function getNextAvatarTier(unlockedCount: number): TierConfig | null {
  return AVATAR_COSMETIC_TIERS.find((tier) => unlockedCount < tier.minUnlocked) || null;
}

export function getAvatarTierConfig(tier: AvatarCosmeticTier | undefined | null): TierConfig {
  return AVATAR_COSMETIC_TIERS.find((candidate) => candidate.id === tier) || AVATAR_COSMETIC_TIERS[0];
}

export function getCosmeticTierProgress(unlockedCount: number) {
  const current = getAvatarTierByUnlocked(unlockedCount);
  const next = getNextAvatarTier(unlockedCount);

  if (!next) {
    return {
      current,
      next: null,
      progressToNext: 1,
      achievementsNeededForNext: 0,
    };
  }

  const rangeStart = current.minUnlocked;
  const rangeEnd = next.minUnlocked;
  const span = Math.max(1, rangeEnd - rangeStart);

  return {
    current,
    next,
    progressToNext: Math.min(1, Math.max(0, (unlockedCount - rangeStart) / span)),
    achievementsNeededForNext: Math.max(0, rangeEnd - unlockedCount),
  };
}
